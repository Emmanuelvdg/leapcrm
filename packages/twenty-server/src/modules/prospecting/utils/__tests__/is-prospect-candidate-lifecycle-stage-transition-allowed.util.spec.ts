import { type ProspectCandidateLifecycleStage } from 'src/modules/prospecting/types/prospect-candidate-lifecycle-stage.type';
import { isProspectCandidateLifecycleStageTransitionAllowed } from 'src/modules/prospecting/utils/is-prospect-candidate-lifecycle-stage-transition-allowed.util';

describe('isProspectCandidateLifecycleStageTransitionAllowed', () => {
  it.each<[ProspectCandidateLifecycleStage, ProspectCandidateLifecycleStage]>([
    ['DISCOVERED', 'HUMAN_REVIEW'],
    ['DISCOVERED', 'DISQUALIFIED'],
    ['DISCOVERED', 'INSUFFICIENT_EVIDENCE'],
    ['DISCOVERED', 'CANCELLED'],
    ['HUMAN_REVIEW', 'DISCOVERED'],
    ['HUMAN_REVIEW', 'DISQUALIFIED'],
    ['INSUFFICIENT_EVIDENCE', 'DISCOVERED'],
    ['DISQUALIFIED', 'HUMAN_REVIEW'],
  ])('allows %s to %s', (fromStage, toStage) => {
    expect(
      isProspectCandidateLifecycleStageTransitionAllowed({
        fromStage,
        toStage,
      }),
    ).toBe(true);
  });

  it.each<[ProspectCandidateLifecycleStage, ProspectCandidateLifecycleStage]>([
    ['DISCOVERED', 'QUALIFIED'],
    ['DISCOVERED', 'ACTIVE_OUTREACH'],
    ['DISQUALIFIED', 'DISCOVERED'],
    ['CANCELLED', 'DISCOVERED'],
    ['HUMAN_REVIEW', 'APPROVED'],
  ])('rejects %s to %s', (fromStage, toStage) => {
    expect(
      isProspectCandidateLifecycleStageTransitionAllowed({
        fromStage,
        toStage,
      }),
    ).toBe(false);
  });

  it('keeps later-phase stages unreachable in this phase', () => {
    expect(
      isProspectCandidateLifecycleStageTransitionAllowed({
        fromStage: 'DISCOVERED',
        toStage: 'RESEARCHING',
      }),
    ).toBe(false);
  });
});
