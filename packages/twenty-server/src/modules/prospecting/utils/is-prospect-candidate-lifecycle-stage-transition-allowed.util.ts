import { PROSPECT_CANDIDATE_LIFECYCLE_STAGE_TRANSITIONS } from 'src/modules/prospecting/constants/prospect-candidate-lifecycle-stage-transitions.constant';
import { type ProspectCandidateLifecycleStage } from 'src/modules/prospecting/types/prospect-candidate-lifecycle-stage.type';

export const isProspectCandidateLifecycleStageTransitionAllowed = ({
  fromStage,
  toStage,
}: {
  fromStage: ProspectCandidateLifecycleStage;
  toStage: ProspectCandidateLifecycleStage;
}): boolean =>
  PROSPECT_CANDIDATE_LIFECYCLE_STAGE_TRANSITIONS[fromStage].includes(toStage);
