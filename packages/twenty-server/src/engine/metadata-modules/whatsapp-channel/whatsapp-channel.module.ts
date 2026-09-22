import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { WhatsappChannelEntity } from 'src/engine/metadata-modules/whatsapp-channel/entities/whatsapp-channel.entity';
import { WhatsappChannelResolver } from 'src/engine/metadata-modules/whatsapp-channel/resolvers/whatsapp-channel.resolver';
import { WhatsappChannelTokenEncryptionService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-channel-token-encryption.service';
import { WhatsappChannelService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-channel.service';
import { WhatsappEmbeddedSignupService } from 'src/engine/metadata-modules/whatsapp-channel/services/whatsapp-embedded-signup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsappChannelEntity]),
    SecretEncryptionModule,
    PermissionsModule,
  ],
  providers: [
    WhatsappChannelResolver,
    WhatsappChannelService,
    WhatsappChannelTokenEncryptionService,
    WhatsappEmbeddedSignupService,
  ],
  exports: [WhatsappChannelService],
})
export class WhatsappChannelModule {}
