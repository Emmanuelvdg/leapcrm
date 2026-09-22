import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { InjectObjectMetadataRepository } from 'src/engine/object-metadata-repository/object-metadata-repository.decorator';
import { TimelineActivityRepository } from 'src/modules/timeline/repositories/timeline-activity.repository';
import { TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';

// Mirrors MessageParticipantListener's message.linked payload shape so
// WhatsApp conversations show up on a Person's Timeline the same way emails
// do. Called directly from the inbound/outbound WhatsApp services rather than
// through the generic workspace-event-batching pipeline, since the caller
// already knows exactly which message and which person are involved.
@Injectable()
export class WhatsappTimelineActivityService {
  constructor(
    @InjectObjectMetadataRepository(TimelineActivityWorkspaceEntity)
    private readonly timelineActivityRepository: TimelineActivityRepository,
    @InjectRepository(ObjectMetadataEntity)
    private readonly objectMetadataRepository: Repository<ObjectMetadataEntity>,
  ) {}

  async linkConversationMessageToPerson({
    workspaceId,
    personId,
    conversationMessageId,
  }: {
    workspaceId: string;
    personId: string;
    conversationMessageId: string;
  }): Promise<void> {
    const conversationMessageObjectMetadata =
      await this.objectMetadataRepository.findOneOrFail({
        where: { nameSingular: 'conversationMessage', workspaceId },
      });

    await this.timelineActivityRepository.upsertTimelineActivities({
      objectSingularName: 'person',
      workspaceId,
      payloads: [
        {
          name: 'conversationMessage.linked',
          objectSingularName: 'person',
          recordId: personId,
          linkedObjectMetadataId: conversationMessageObjectMetadata.id,
          linkedRecordId: conversationMessageId,
          linkedRecordCachedName: '',
          properties: {},
        },
      ],
    });
  }
}
