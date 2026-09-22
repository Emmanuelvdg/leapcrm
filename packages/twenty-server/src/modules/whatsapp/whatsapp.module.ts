import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TwentyConfigModule } from 'src/engine/core-modules/twenty-config/twenty-config.module';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { WhatsappChannelModule } from 'src/engine/metadata-modules/whatsapp-channel/whatsapp-channel.module';
import { ObjectMetadataRepositoryModule } from 'src/engine/object-metadata-repository/object-metadata-repository.module';
import { WhatsappWebhookController } from 'src/modules/whatsapp/controllers/whatsapp-webhook.controller';
import { WhatsappConversationResolver } from 'src/modules/whatsapp/resolvers/whatsapp-conversation.resolver';
import { WhatsappInboundMessageService } from 'src/modules/whatsapp/services/whatsapp-inbound-message.service';
import { WhatsappOutboundMessageService } from 'src/modules/whatsapp/services/whatsapp-outbound-message.service';
import { WhatsappTimelineActivityService } from 'src/modules/whatsapp/services/whatsapp-timeline-activity.service';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';

@Module({
  imports: [
    TwentyConfigModule,
    WhatsappChannelModule,
    PermissionsModule,
    TypeOrmModule.forFeature([ObjectMetadataEntity]),
    ObjectMetadataRepositoryModule.forFeature([TimelineActivityWorkspaceEntity]),
  ],
  controllers: [WhatsappWebhookController],
  providers: [
    WhatsappInboundMessageService,
    WhatsappOutboundMessageService,
    WhatsappTimelineActivityService,
    WhatsappConversationResolver,
  ],
  exports: [WhatsappOutboundMessageService, WhatsappInboundMessageService],
})
export class WhatsappModule {}
