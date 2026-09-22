import { isDefined } from 'twenty-shared/utils';

import { type ConversationParticipantWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation-participant.workspace-entity';
import { type ConversationWorkspaceEntity } from 'src/modules/conversation/standard-objects/conversation.workspace-entity';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';

export type FindOrCreateWhatsappConversationResult = {
  conversation: ConversationWorkspaceEntity;
  participant: ConversationParticipantWorkspaceEntity;
  isNewConversation: boolean;
};

// Deliberately narrow (only scalar Conversation fields) rather than
// Partial<ConversationWorkspaceEntity> — pulling relation fields (assignedTo,
// person, company, messages, participants...) into a create()/update() payload
// type sends TypeORM's _QueryDeepPartialEntity checker down the entity's
// circular relation graph and it never resolves.
type NewWhatsappConversationFields = {
  isUnread: boolean;
  lastInboundAt?: Date | null;
  lastOutboundAt?: Date | null;
  lastMessageAt: Date;
  // Only known when the send was initiated from a Person record (no prior
  // conversation to match against) — inbound matching sets these itself once a
  // reply comes in, but a brand-new outbound-initiated conversation has no
  // other opportunity to link back to the Person it was sent from.
  personId?: string | null;
  companyId?: string | null;
};

// Shared by inbound message handling and outbound sending: both need to land on
// the same WhatsApp conversation/participant pair for a given E.164 handle.
export async function findOrCreateWhatsappConversationAndParticipant({
  conversationRepository,
  participantRepository,
  channelHandle,
  displayName,
  newConversationFields,
}: {
  conversationRepository: WorkspaceRepository<ConversationWorkspaceEntity>;
  participantRepository: WorkspaceRepository<ConversationParticipantWorkspaceEntity>;
  channelHandle: string;
  displayName: string | null;
  // Only used when no matching conversation exists yet — inbound and outbound
  // sends disagree on isUnread / which of lastInboundAt|lastOutboundAt to seed.
  newConversationFields: NewWhatsappConversationFields;
}): Promise<FindOrCreateWhatsappConversationResult> {
  const existingParticipant = await participantRepository
    .createQueryBuilder('conversationParticipant')
    .innerJoinAndSelect('conversationParticipant.conversation', 'conversation')
    .where('conversationParticipant.channelHandle = :channelHandle', {
      channelHandle,
    })
    .andWhere('conversation.channelType = :channelType', {
      channelType: 'WHATSAPP',
    })
    .getOne();

  if (isDefined(existingParticipant)) {
    return {
      conversation: existingParticipant.conversation,
      participant: existingParticipant,
      isNewConversation: false,
    };
  }

  const { personId, companyId, ...conversationFields } = newConversationFields;

  const conversation = await conversationRepository.save(
    conversationRepository.create({
      channelType: 'WHATSAPP',
      status: 'OPEN',
      ...conversationFields,
      ...(isDefined(personId) ? { personId, companyId: companyId ?? null } : {}),
    }),
  );

  const participant = await participantRepository.save(
    participantRepository.create({
      conversationId: conversation.id,
      role: 'CUSTOMER',
      channelHandle,
      displayName,
      ...(isDefined(personId) ? { personId } : {}),
    }),
  );

  return { conversation, participant, isNewConversation: true };
}
