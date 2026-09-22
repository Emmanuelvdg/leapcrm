import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type ConversationWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export class ConversationParticipantWorkspaceEntity extends BaseWorkspaceEntity {
  role: string;
  channelHandle: string | null;
  displayName: string | null;
  conversation: EntityRelation<ConversationWorkspaceEntity>;
  conversationId: string;
  person: EntityRelation<PersonWorkspaceEntity> | null;
  personId: string | null;
  workspaceMember: EntityRelation<WorkspaceMemberWorkspaceEntity> | null;
  workspaceMemberId: string | null;
}
