import { type ProspectCandidateLifecycleStage } from 'src/modules/prospecting/types/prospect-candidate-lifecycle-stage.type';

// Every stage is declared up front; stages used only by later phases have no
// transitions yet, so they cannot be reached until those phases add them.
export const PROSPECT_CANDIDATE_LIFECYCLE_STAGE_TRANSITIONS: Record<
  ProspectCandidateLifecycleStage,
  readonly ProspectCandidateLifecycleStage[]
> = {
  DISCOVERED: [
    'HUMAN_REVIEW',
    'DISQUALIFIED',
    'INSUFFICIENT_EVIDENCE',
    'CANCELLED',
  ],
  HUMAN_REVIEW: ['DISCOVERED', 'DISQUALIFIED', 'CANCELLED'],
  INSUFFICIENT_EVIDENCE: [
    'DISCOVERED',
    'HUMAN_REVIEW',
    'DISQUALIFIED',
    'CANCELLED',
  ],
  DISQUALIFIED: ['HUMAN_REVIEW'],
  CANCELLED: [],
  RESEARCHING: [],
  QUALIFIED: [],
  CONTACT_RESEARCH: [],
  READY_FOR_REVIEW: [],
  APPROVED: [],
  READY_FOR_OUTREACH: [],
  ACTIVE_OUTREACH: [],
  ENGAGED: [],
  MEETING_BOOKED: [],
  HANDED_OFF: [],
  SUPPRESSED: [],
  NURTURE: [],
  FAILED: [],
};
