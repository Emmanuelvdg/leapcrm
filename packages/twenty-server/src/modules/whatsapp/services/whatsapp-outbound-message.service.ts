import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { WhatsappChannelService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-channel.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WHATSAPP_GRAPH_API_VERSION } from 'src/modules/whatsapp/constants/whatsapp-graph-api-version.constant';
import { type ConversationMessageWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation-message.workspace-entity';
import { type ConversationParticipantWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation-participant.workspace-entity';
import { type ConversationWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { findOrCreateWhatsappConversationAndParticipant } from 'src/modules/whatsapp/utils/find-or-create-whatsapp-conversation.util';
import { WhatsappTimelineActivityService } from 'src/modules/whatsapp/services/whatsapp-timeline-activity.service';

const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

type WhatsappTemplateComponent = Record<string, unknown>;

type WhatsappGraphApiSendMessagePayload = {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'template';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: WhatsappTemplateComponent[];
  };
};

type WhatsappGraphApiSendMessageResponse = {
  messages?: Array<{ id: string }>;
};

// Wraps POST https://graph.facebook.com/v{version}/{phone-number-id}/messages,
// the same call already verified manually via curl against the live test app.
@Injectable()
export class WhatsappOutboundMessageService {
  private readonly logger = new Logger(WhatsappOutboundMessageService.name);

  constructor(
    private readonly whatsappChannelService: WhatsappChannelService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly whatsappTimelineActivityService: WhatsappTimelineActivityService,
  ) {}

  async sendTextMessage(
    channelId: string,
    toE164: string,
    body: string,
    newConversationTarget?: { personId: string; companyId: string | null },
  ): Promise<ConversationMessageWorkspaceEntity> {
    return this.send({
      channelId,
      toE164,
      graphApiPayload: {
        messaging_product: 'whatsapp',
        to: this.toGraphApiPhoneFormat(toE164),
        type: 'text',
        text: { body },
      },
      bodyForRecord: body,
      newConversationTarget,
    });
  }

  async sendTemplateMessage(
    channelId: string,
    toE164: string,
    templateName: string,
    languageCode: string,
    components?: WhatsappTemplateComponent[],
  ): Promise<ConversationMessageWorkspaceEntity> {
    return this.send({
      channelId,
      toE164,
      graphApiPayload: {
        messaging_product: 'whatsapp',
        to: this.toGraphApiPhoneFormat(toE164),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(isDefined(components) ? { components } : {}),
        },
      },
      // No rendered body available client-side for a template send; the
      // ConversationMessage still carries externalMessageId + rawPayload-free
      // metadata via deliveryStatus updates from the statuses webhook.
      bodyForRecord: null,
    });
  }

  // Entry point for the sendWhatsappMessage resolver: resolves which number to
  // send to from either an existing conversation's participant (replying) or a
  // Person's primary phone (starting a first conversation), then delegates to
  // the same sendTextMessage() the inbound-triggered flows already exercise.
  async sendTextMessageToTarget({
    workspaceId,
    body,
    conversationId,
    personId,
  }: {
    workspaceId: string;
    body: string;
    conversationId?: string;
    personId?: string;
  }): Promise<ConversationMessageWorkspaceEntity> {
    const whatsappChannel =
      await this.whatsappChannelService.findByWorkspaceId(workspaceId);

    if (!isDefined(whatsappChannel)) {
      throw new NotFoundException(
        `WhatsApp is not connected for workspace ${workspaceId}`,
      );
    }

    const authContext = buildSystemAuthContext(workspaceId);
    const resolvedTarget = await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        if (isDefined(conversationId)) {
          const toE164 = await this.resolvePhoneFromConversation(
            workspaceId,
            conversationId,
          );

          return isDefined(toE164) ? { toE164, newConversationTarget: undefined } : null;
        }

        if (isDefined(personId)) {
          return this.resolvePersonTarget(workspaceId, personId);
        }

        return null;
      },
      authContext,
      { lite: true },
    );

    if (!isDefined(resolvedTarget)) {
      throw new Error(
        'Could not determine a WhatsApp number to send to: provide a conversationId with a matched participant, or a personId with a phone number set',
      );
    }

    return this.sendTextMessage(
      whatsappChannel.id,
      resolvedTarget.toE164,
      body,
      resolvedTarget.newConversationTarget,
    );
  }

  private async resolvePhoneFromConversation(
    workspaceId: string,
    conversationId: string,
  ): Promise<string | null> {
    const participantRepository =
      await this.globalWorkspaceOrmManager.getRepository<ConversationParticipantWorkspaceEntity>(
        workspaceId,
        'conversationParticipant',
        BYPASS_PERMISSIONS,
      );

    const participant = await participantRepository.findOne({
      where: { conversationId },
    });

    return participant?.channelHandle ?? null;
  }

  private async resolvePersonTarget(
    workspaceId: string,
    personId: string,
  ): Promise<{
    toE164: string;
    newConversationTarget: { personId: string; companyId: string | null };
  } | null> {
    const personRepository =
      await this.globalWorkspaceOrmManager.getRepository<PersonWorkspaceEntity>(
        workspaceId,
        'person',
        BYPASS_PERMISSIONS,
      );

    const person = await personRepository.findOne({
      where: { id: personId },
    });

    const callingCode = person?.phones?.primaryPhoneCallingCode ?? '';
    const number = person?.phones?.primaryPhoneNumber ?? '';

    if (!isDefined(person) || !isNonEmptyString(number)) {
      return null;
    }

    const toE164 = `+${callingCode}${number}`.replace(/^\+\+/, '+');

    return {
      toE164,
      newConversationTarget: {
        personId: person.id,
        companyId: person.companyId ?? null,
      },
    };
  }

  private toGraphApiPhoneFormat(toE164: string): string {
    return toE164.replace(/^\+/, '');
  }

  private async send({
    channelId,
    toE164,
    graphApiPayload,
    bodyForRecord,
    newConversationTarget,
  }: {
    channelId: string;
    toE164: string;
    graphApiPayload: WhatsappGraphApiSendMessagePayload;
    bodyForRecord: string | null;
    newConversationTarget?: { personId: string; companyId: string | null };
  }): Promise<ConversationMessageWorkspaceEntity> {
    const whatsappChannel = await this.whatsappChannelService.findById(
      channelId,
    );

    if (!isDefined(whatsappChannel)) {
      throw new NotFoundException(`WhatsappChannel ${channelId} not found`);
    }

    const accessToken =
      this.whatsappChannelService.getDecryptedAccessToken(whatsappChannel);

    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${whatsappChannel.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphApiPayload),
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `WhatsApp Graph API send failed with status ${response.status}: ${responseText}`,
      );
    }

    const parsedResponse = JSON.parse(
      responseText,
    ) as WhatsappGraphApiSendMessageResponse;
    const externalMessageId = parsedResponse.messages?.[0]?.id;

    if (!isDefined(externalMessageId)) {
      throw new Error(
        `WhatsApp Graph API response for channel ${channelId} is missing messages[0].id: ${responseText}`,
      );
    }

    this.logger.log(
      `Sent WhatsApp message ${externalMessageId} via channel ${channelId} to ${toE164}`,
    );

    const now = new Date();
    const authContext = buildSystemAuthContext(whatsappChannel.workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const conversationRepository =
          await this.globalWorkspaceOrmManager.getRepository<ConversationWorkspaceEntity>(
            whatsappChannel.workspaceId,
            'conversation',
            BYPASS_PERMISSIONS,
          );
        const participantRepository =
          await this.globalWorkspaceOrmManager.getRepository<ConversationParticipantWorkspaceEntity>(
            whatsappChannel.workspaceId,
            'conversationParticipant',
            BYPASS_PERMISSIONS,
          );
        const messageRepository =
          await this.globalWorkspaceOrmManager.getRepository<ConversationMessageWorkspaceEntity>(
            whatsappChannel.workspaceId,
            'conversationMessage',
            BYPASS_PERMISSIONS,
          );

        const { conversation } =
          await findOrCreateWhatsappConversationAndParticipant({
            conversationRepository,
            participantRepository,
            channelHandle: toE164,
            displayName: null,
            newConversationFields: {
              isUnread: false,
              lastOutboundAt: now,
              lastMessageAt: now,
              personId: newConversationTarget?.personId,
              companyId: newConversationTarget?.companyId,
            },
          });

        const conversationMessage = await messageRepository.save(
          messageRepository.create({
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            channelType: 'WHATSAPP',
            externalMessageId,
            body: bodyForRecord,
            sentAt: now,
          }),
        );

        await conversationRepository.update(
          { id: conversation.id },
          {
            lastOutboundAt: now,
            lastMessageAt: now,
          },
        );

        const personId = newConversationTarget?.personId ?? conversation.personId;

        if (isDefined(personId)) {
          await this.whatsappTimelineActivityService.linkConversationMessageToPerson(
            {
              workspaceId: whatsappChannel.workspaceId,
              personId,
              conversationMessageId: conversationMessage.id,
            },
          );
        }

        return conversationMessage;
      },
      authContext,
      { lite: true },
    );
  }
}
