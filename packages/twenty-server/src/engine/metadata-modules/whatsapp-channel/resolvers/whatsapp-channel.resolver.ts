import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { ExchangeWhatsappEmbeddedSignupCodeInput } from 'src/engine/metadata-modules/whatsapp-channel/dtos/exchange-whatsapp-embedded-signup-code.input';
import { WhatsappChannelDTO } from 'src/engine/metadata-modules/whatsapp-channel/dtos/whatsapp-channel.dto';
import { WhatsappChannelService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-channel.service';
import { WhatsappEmbeddedSignupService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-embedded-signup.service';

// getWhatsappChannels is read-only workspace-auth-only (below) rather than
// gated here at class level - toDTO() never exposes the raw accessToken, so
// there's no security reason to restrict it, and every member needs to see
// connection status. Only the mutations that actually connect/disconnect a
// channel (and touch the access token) require CONNECTED_ACCOUNTS, mirroring
// WorkspaceAiProviderResolver's split between read and write guarding.
@UseGuards(WorkspaceAuthGuard)
@MetadataResolver()
export class WhatsappChannelResolver {
  constructor(
    private readonly whatsappChannelService: WhatsappChannelService,
    private readonly whatsappEmbeddedSignupService: WhatsappEmbeddedSignupService,
  ) {}

  @Query(() => [WhatsappChannelDTO])
  async getWhatsappChannels(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WhatsappChannelDTO[]> {
    const whatsappChannels =
      await this.whatsappChannelService.findAllByWorkspaceId(workspaceId);

    return whatsappChannels.map((whatsappChannel) =>
      this.whatsappChannelService.toDTO(whatsappChannel),
    );
  }

  @UseGuards(SettingsPermissionGuard(PermissionFlagType.CONNECTED_ACCOUNTS))
  @Mutation(() => WhatsappChannelDTO)
  async exchangeWhatsappEmbeddedSignupCode(
    @Args('input') input: ExchangeWhatsappEmbeddedSignupCodeInput,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<WhatsappChannelDTO> {
    const { accessToken, displayPhoneNumber } =
      await this.whatsappEmbeddedSignupService.exchangeCodeForAccessToken({
        code: input.code,
        phoneNumberId: input.phoneNumberId,
      });

    const whatsappChannel =
      await this.whatsappChannelService.createOrUpdateForWorkspace({
        workspaceId,
        phoneNumberId: input.phoneNumberId,
        wabaId: input.wabaId,
        displayPhoneNumber,
        accessToken,
        connectionStatus: 'CONNECTED',
      });

    return this.whatsappChannelService.toDTO(whatsappChannel);
  }

  @UseGuards(SettingsPermissionGuard(PermissionFlagType.CONNECTED_ACCOUNTS))
  @Mutation(() => Boolean)
  async disconnectWhatsappChannel(
    @Args('id') id: string,
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
  ): Promise<boolean> {
    return this.whatsappChannelService.deleteByIdAndWorkspaceId(
      id,
      workspaceId,
    );
  }
}
