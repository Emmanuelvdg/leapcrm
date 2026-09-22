import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { type PlaintextString } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { WhatsappChannelDTO } from 'src/engine/metadata-modules/whatsapp-channel/dtos/whatsapp-channel.dto';
import {
  type WhatsappChannelConnectionStatus,
  WhatsappChannelEntity,
} from 'src/engine/metadata-modules/whatsapp-channel/entities/whatsapp-channel.entity';
import { WhatsappChannelTokenEncryptionService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-channel-token-encryption.service';

export type CreateWhatsappChannelInput = {
  workspaceId: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber?: string | null;
  accessToken: string;
  webhookVerifyToken?: string | null;
  connectionStatus?: WhatsappChannelConnectionStatus;
};

@Injectable()
export class WhatsappChannelService {
  constructor(
    @InjectRepository(WhatsappChannelEntity)
    private readonly whatsappChannelRepository: Repository<WhatsappChannelEntity>,
    private readonly whatsappChannelTokenEncryptionService: WhatsappChannelTokenEncryptionService,
  ) {}

  // Meta's webhook payload only carries metadata.phone_number_id, so this is the
  // sole lookup path from an unauthenticated webhook request back to a workspace.
  async findByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<WhatsappChannelEntity | null> {
    return this.whatsappChannelRepository.findOne({
      where: { phoneNumberId },
    });
  }

  async findById(id: string): Promise<WhatsappChannelEntity | null> {
    return this.whatsappChannelRepository.findOne({ where: { id } });
  }

  async findByWorkspaceId(
    workspaceId: string,
  ): Promise<WhatsappChannelEntity | null> {
    return this.whatsappChannelRepository.findOne({ where: { workspaceId } });
  }

  async findAllByWorkspaceId(
    workspaceId: string,
  ): Promise<WhatsappChannelEntity[]> {
    return this.whatsappChannelRepository.find({ where: { workspaceId } });
  }

  async create(
    input: CreateWhatsappChannelInput,
  ): Promise<WhatsappChannelEntity> {
    const whatsappChannel = this.whatsappChannelRepository.create({
      workspaceId: input.workspaceId,
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      displayPhoneNumber: input.displayPhoneNumber ?? null,
      accessToken: this.encryptAccessToken(
        input.accessToken,
        input.workspaceId,
      ),
      webhookVerifyToken: input.webhookVerifyToken ?? null,
      connectionStatus: input.connectionStatus ?? 'CONNECTED',
    });

    return this.whatsappChannelRepository.save(whatsappChannel);
  }

  // One channel per workspace for now - the embedded signup flow re-runs this
  // on reconnect, so an existing row for the workspace is updated in place
  // rather than left stale alongside a new one.
  async createOrUpdateForWorkspace(
    input: CreateWhatsappChannelInput,
  ): Promise<WhatsappChannelEntity> {
    const existingChannel = await this.findByWorkspaceId(input.workspaceId);

    if (!isDefined(existingChannel)) {
      return this.create(input);
    }

    await this.whatsappChannelRepository.update(
      { id: existingChannel.id },
      {
        phoneNumberId: input.phoneNumberId,
        wabaId: input.wabaId,
        displayPhoneNumber: input.displayPhoneNumber ?? null,
        accessToken: this.encryptAccessToken(
          input.accessToken,
          input.workspaceId,
        ),
        connectionStatus: input.connectionStatus ?? 'CONNECTED',
      },
    );

    return this.findById(existingChannel.id) as Promise<WhatsappChannelEntity>;
  }

  async deleteByIdAndWorkspaceId(
    id: string,
    workspaceId: string,
  ): Promise<boolean> {
    const result = await this.whatsappChannelRepository.delete({
      id,
      workspaceId,
    });

    return (result.affected ?? 0) > 0;
  }

  // Never exposes the raw accessToken - mirrors WorkspaceAiProviderService.toDTO().
  toDTO(whatsappChannel: WhatsappChannelEntity): WhatsappChannelDTO {
    return {
      id: whatsappChannel.id,
      phoneNumberId: whatsappChannel.phoneNumberId,
      wabaId: whatsappChannel.wabaId,
      displayPhoneNumber: whatsappChannel.displayPhoneNumber,
      connectionStatus: whatsappChannel.connectionStatus,
      createdAt: whatsappChannel.createdAt,
    };
  }

  private encryptAccessToken(
    accessToken: string,
    workspaceId: string,
  ): EncryptedString {
    return this.whatsappChannelTokenEncryptionService.encrypt({
      plaintext: accessToken as PlaintextString,
      workspaceId,
    });
  }

  getDecryptedAccessToken(whatsappChannel: WhatsappChannelEntity): string {
    return this.whatsappChannelTokenEncryptionService.decryptNullable({
      ciphertext: whatsappChannel.accessToken,
      workspaceId: whatsappChannel.workspaceId,
    }) as string;
  }

  async updateConnectionStatus(
    id: string,
    connectionStatus: WhatsappChannelConnectionStatus,
  ): Promise<void> {
    await this.whatsappChannelRepository.update({ id }, { connectionStatus });
  }
}
