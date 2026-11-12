import { type FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { type MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { IcpScoringListener } from 'src/modules/icp-analysis/scoring/listeners/icp-scoring.listener';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';

const buildListener = (isEnabled = true) => {
  const add = jest.fn().mockResolvedValue(undefined);

  const listener = new IcpScoringListener(
    { add } as unknown as MessageQueueService,
    {
      isFeatureEnabled: jest.fn().mockResolvedValue(isEnabled),
    } as unknown as FeatureFlagService,
  );

  return { listener, add };
};

const buildUpdateBatch = (
  events: { recordId: string; updatedFields: string[] }[],
) =>
  ({
    workspaceId: WORKSPACE_ID,
    events: events.map(({ recordId, updatedFields }) => ({
      recordId,
      properties: { before: {}, after: {}, updatedFields, diff: {} },
    })),
  }) as unknown as WorkspaceEventBatch<never>;

describe('IcpScoringListener', () => {
  it('ignores updates that only wrote scores', async () => {
    const { listener, add } = buildListener();

    await listener.handleCompanyUpdated(
      buildUpdateBatch([
        { recordId: 'company-1', updatedFields: ['icpScore', 'updatedAt'] },
      ]),
    );

    expect(add).not.toHaveBeenCalled();
  });

  it('rescores companies with the fields that changed', async () => {
    const { listener, add } = buildListener();

    await listener.handleCompanyUpdated(
      buildUpdateBatch([
        { recordId: 'company-1', updatedFields: ['address', 'updatedAt'] },
        { recordId: 'company-2', updatedFields: ['icpScore'] },
      ]),
    );

    expect(add).toHaveBeenCalledWith('IcpScoreRecordsJob', {
      workspaceId: WORKSPACE_ID,
      companyIds: ['company-1'],
      candidateIds: [],
      changedCompanyFieldNames: ['address'],
    });
  });

  it('rescores candidates whose match or firmographics changed', async () => {
    const { listener, add } = buildListener();

    await listener.handleCandidateUpdated(
      buildUpdateBatch([
        { recordId: 'candidate-1', updatedFields: ['matchedCompanyId'] },
        { recordId: 'candidate-2', updatedFields: ['lifecycleStage'] },
      ]),
    );

    expect(add).toHaveBeenCalledWith(
      'IcpScoreRecordsJob',
      expect.objectContaining({ candidateIds: ['candidate-1'] }),
    );
  });

  it('enqueues nothing when ICP analysis is off', async () => {
    const { listener, add } = buildListener(false);

    await listener.handleCompanyCreated({
      workspaceId: WORKSPACE_ID,
      events: [{ recordId: 'company-1', properties: { after: {} } }],
    } as unknown as WorkspaceEventBatch<never>);

    expect(add).not.toHaveBeenCalled();
  });
});
