import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { WhatsappChannelService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-channel.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type ConversationMessageWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation-message.workspace-entity';
import { type ConversationParticipantWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation-participant.workspace-entity';
import { type ConversationWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import {
  type WhatsappWebhookChangeValue,
  type WhatsappWebhookEntry,
  type WhatsappWebhookPayload,
  type WhatsappWebhookStatus,
  type WhatsappWebhookTextMessage,
} from 'src/modules/whatsapp/types/whatsapp-webhook-payload.type';
import { findOrCreateWhatsappConversationAndParticipant } from 'src/modules/whatsapp/utils/find-or-create-whatsapp-conversation.util';
import { findPersonByPrimaryOrAdditionalPhone } from 'src/modules/whatsapp/utils/find-person-by-primary-or-additional-phone.util';
import { mapWhatsappStatusToDeliveryStatus } from 'src/modules/whatsapp/utils/map-whatsapp-status-to-delivery-status.util';
import {
  normalizeWaIdToE164,
  toDigitsOnly,
} from 'src/modules/whatsapp/utils/normalize-whatsapp-phone-number.util';
import { WhatsappTimelineActivityService } from 'src/modules/whatsapp/services/whatsapp-timeline-activity.service';

const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

@Injectable()
export class WhatsappInboundMessageService {
  private readonly logger = new Logger(WhatsappInboundMessageService.name);

  constructor(
    private readonly whatsappChannelService: WhatsappChannelService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly whatsappTimelineActivityService: WhatsappTimelineActivityService,
  ) {}

  async processWebhookPayload(payload: WhatsappWebhookPayload): Promise<void> {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        try {
          await this.processChange(entry, change.value);
        } catch (error) {
          // One malformed change should not take down the rest of the batch —
          // Meta already got its 200 ack before this runs.
          this.logger.error(
            `Failed to process WhatsApp webhook change for entry ${entry.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }
  }

  private async processChange(
    entry: WhatsappWebhookEntry,
    value: WhatsappWebhookChangeValue,
  ): Promise<void> {
    const phoneNumberId = value.metadata?.phone_number_id;

    if (!isDefined(phoneNumberId)) {
      this.logger.warn(
        `WhatsApp webhook change on entry ${entry.id} has no metadata.phone_number_id, skipping`,
      );

      return;
    }

    const whatsappChannel =
      await this.whatsappChannelService.findByPhoneNumberId(phoneNumberId);

    if (!isDefined(whatsappChannel)) {
      this.logger.warn(
        `No WhatsappChannel registered for phone_number_id ${phoneNumberId}, dropping webhook change`,
      );

      return;
    }

    const { workspaceId } = whatsappChannel;
    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        for (const message of value.messages ?? []) {
          await this.handleInboundMessage({
            workspaceId,
            message,
            contactName: this.resolveContactName(value, message.from),
            rawEntry: entry,
          });
        }

        for (const status of value.statuses ?? []) {
          await this.handleStatus({ workspaceId, status });
        }
      },
      authContext,
      { lite: true },
    );
  }

  private resolveContactName(
    value: WhatsappWebhookChangeValue,
    waId: string,
  ): string | null {
    return (
      value.contacts?.find((contact) => contact.wa_id === waId)?.profile
        ?.name ?? null
    );
  }

  private async handleInboundMessage({
    workspaceId,
    message,
    contactName,
    rawEntry,
  }: {
    workspaceId: string;
    message: WhatsappWebhookTextMessage;
    contactName: string | null;
    rawEntry: WhatsappWebhookEntry;
  }): Promise<void> {
    if (message.type !== 'text') {
      // TODO: handle image/document/audio/video/location/etc. message types.
      // For now we only persist text bodies so we don't crash on the payload shape.
      this.logger.log(
        `Skipping WhatsApp message ${message.id}: unsupported type "${message.type}" (text-only for now)`,
      );

      return;
    }

    const conversationRepository =
      await this.globalWorkspaceOrmManager.getRepository<ConversationWorkspaceEntity>(
        workspaceId,
        'conversation',
        BYPASS_PERMISSIONS,
      );
    const participantRepository =
      await this.globalWorkspaceOrmManager.getRepository<ConversationParticipantWorkspaceEntity>(
        workspaceId,
        'conversationParticipant',
        BYPASS_PERMISSIONS,
      );
    const messageRepository =
      await this.globalWorkspaceOrmManager.getRepository<ConversationMessageWorkspaceEntity>(
        workspaceId,
        'conversationMessage',
        BYPASS_PERMISSIONS,
      );

    const channelHandle = normalizeWaIdToE164(message.from);
    const receivedAt = new Date(Number(message.timestamp) * 1000);

    const { conversation, participant } =
      await findOrCreateWhatsappConversationAndParticipant({
        conversationRepository,
        participantRepository,
        channelHandle,
        displayName: contactName,
        newConversationFields: {
          isUnread: true,
          lastInboundAt: receivedAt,
          lastMessageAt: receivedAt,
        },
      });

    let personId = participant.personId ?? conversation.personId ?? null;

    if (!isDefined(personId)) {
      personId = await this.matchParticipantToPerson({
        workspaceId,
        conversation,
        participant,
        channelHandle,
      });
    }

    const savedMessage = await messageRepository.save(
      messageRepository.create({
        conversationId: conversation.id,
        direction: 'INBOUND',
        channelType: 'WHATSAPP',
        externalMessageId: message.id,
        body: message.text?.body ?? null,
        receivedAt,
        rawPayload: rawEntry as unknown as Record<string, unknown>,
      }),
    );

    await conversationRepository.update(
      { id: conversation.id },
      {
        lastMessageAt: receivedAt,
        lastInboundAt: receivedAt,
        isUnread: true,
      },
    );

    if (isDefined(personId)) {
      await this.whatsappTimelineActivityService.linkConversationMessageToPerson(
        {
          workspaceId,
          personId,
          conversationMessageId: savedMessage.id,
        },
      );
    }
  }

  private async matchParticipantToPerson({
    workspaceId,
    conversation,
    participant,
    channelHandle,
  }: {
    workspaceId: string;
    conversation: ConversationWorkspaceEntity;
    participant: ConversationParticipantWorkspaceEntity;
    channelHandle: string;
  }): Promise<string | null> {
    const personRepository =
      await this.globalWorkspaceOrmManager.getRepository<PersonWorkspaceEntity>(
        workspaceId,
        'person',
        BYPASS_PERMISSIONS,
      );
    const participantRepository =
      await this.globalWorkspaceOrmManager.getRepository<ConversationParticipantWorkspaceEntity>(
        workspaceId,
        'conversationParticipant',
        BYPASS_PERMISSIONS,
      );
    const conversationRepository =
      await this.globalWorkspaceOrmManager.getRepository<ConversationWorkspaceEntity>(
        workspaceId,
        'conversation',
        BYPASS_PERMISSIONS,
      );

    const phoneDigitsOnly = toDigitsOnly(channelHandle);

    // Narrow to people who have any phone data at all before doing the
    // digits-only comparison in JS — a raw column filter since composite
    // fields (phones.*) flatten to real columns and aren't queryable as a
    // nested object through find(), same reasoning as
    // addPersonEmailFiltersToQueryBuilder for emails.
    const candidatePeople = await personRepository
      .createQueryBuilder('person')
      .where('"person"."phonesPrimaryPhoneNumber" IS NOT NULL')
      .orWhere('"person"."phonesAdditionalPhones" IS NOT NULL')
      .getMany();

    const matchedPerson = findPersonByPrimaryOrAdditionalPhone({
      people: candidatePeople,
      phoneDigitsOnly,
    });

    if (!isDefined(matchedPerson)) {
      return null;
    }

    await participantRepository.update(
      { id: participant.id },
      { personId: matchedPerson.id },
    );

    if (!isDefined(conversation.personId)) {
      await conversationRepository.update(
        { id: conversation.id },
        {
          personId: matchedPerson.id,
          companyId: matchedPerson.companyId ?? null,
        },
      );
    }

    return matchedPerson.id;
  }

  private async handleStatus({
    workspaceId,
    status,
  }: {
    workspaceId: string;
    status: WhatsappWebhookStatus;
  }): Promise<void> {
    const messageRepository =
      await this.globalWorkspaceOrmManager.getRepository<ConversationMessageWorkspaceEntity>(
        workspaceId,
        'conversationMessage',
        BYPASS_PERMISSIONS,
      );

    const existingMessage = await messageRepository.findOne({
      where: { externalMessageId: status.id },
    });

    if (!isDefined(existingMessage)) {
      this.logger.warn(
        `No ConversationMessage found for externalMessageId ${status.id} (status "${status.status}")`,
      );

      return;
    }

    const deliveryStatus = mapWhatsappStatusToDeliveryStatus(status.status);

    if (!isDefined(deliveryStatus)) {
      this.logger.log(
        `Ignoring unrecognized WhatsApp status "${status.status}" for message ${status.id}`,
      );

      return;
    }

    await messageRepository.update({ id: existingMessage.id }, { deliveryStatus });
  }
}
