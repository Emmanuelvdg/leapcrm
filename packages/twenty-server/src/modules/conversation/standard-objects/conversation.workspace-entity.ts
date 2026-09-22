import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { type ConversationMessageWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation-message.workspace-entity';
import { type ConversationParticipantWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation-participant.workspace-entity';
import { type OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { type WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export class ConversationWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  channelType: string;
  subject: string | null;
  status: string | null;
  isUnread: boolean;
  lastMessageAt: Date | null;
  lastInboundAt: Date | null;
  lastOutboundAt: Date | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
  assignedTo: EntityRelation<WorkspaceMemberWorkspaceEntity> | null;
  assignedToId: string | null;
  person: EntityRelation<PersonWorkspaceEntity> | null;
  personId: string | null;
  company: EntityRelation<CompanyWorkspaceEntity> | null;
  companyId: string | null;
  opportunity: EntityRelation<OpportunityWorkspaceEntity> | null;
  opportunityId: string | null;
  messages: EntityRelation<ConversationMessageWorkspaceEntity[]>;
  participants: EntityRelation<ConversationParticipantWorkspaceEntity[]>;
}
