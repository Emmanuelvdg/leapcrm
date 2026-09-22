import { UseGuards } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { SendWhatsappMessageOutputDTO } from 'src/modules/whatsapp/dtos/send-whatsapp-message-output.dto';
import { SendWhatsappMessageInput } from 'src/modules/whatsapp/dtos/send-whatsapp-message.input';
import { WhatsappOutboundMessageService } from 'src/modules/whatsapp/services/whatsapp-outbound-message.service';

@UseGuards(WorkspaceAuthGuard)
@MetadataResolver()
export class WhatsappConversationResolver {
  constructor(
    private readonly whatsappOutboundMessageService: WhatsappOutboundMessageService,
  ) {}

  @UseGuards(SettingsPermissionGuard(PermissionFlagType.CONNECTED_ACCOUNTS))
  @Mutation(() => SendWhatsappMessageOutputDTO)
  async sendWhatsappMessage(
    @Args('input') input: SendWhatsappMessageInput,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<SendWhatsappMessageOutputDTO> {
    try {
      const message =
        await this.whatsappOutboundMessageService.sendTextMessageToTarget({
          workspaceId,
          body: input.body,
          conversationId: input.conversationId,
          personId: input.personId,
        });

      return {
        success: true,
        conversationId: message.conversationId,
        messageId: message.id,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to send WhatsApp message',
      };
    }
  }
}
