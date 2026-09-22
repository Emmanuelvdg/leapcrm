import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type AttachmentWorkspaceEntity } from 'src/modules/attachment/standard-objects/attachment.workspace-entity';
import { type ConversationWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation.workspace-entity';

export class ConversationMessageWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  direction: string;
  channelType: string;
  externalMessageId: string | null;
  body: string | null;
  sentAt: Date | null;
  receivedAt: Date | null;
  deliveryStatus: string | null;
  isDraft: boolean;
  isInternalNote: boolean;
  rawPayload: Record<string, unknown> | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
  conversation: EntityRelation<ConversationWorkspaceEntity>;
  conversationId: string;
  attachments: EntityRelation<AttachmentWorkspaceEntity[]>;
}
