import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  type OpportunityNode,
  scoreOpportunities,
} from 'src/utils/score-opportunities';

const NOW = new Date('2026-10-04T12:00:00.000Z');
const SETTINGS = { stalledAfterDays: 21, closedStages: ['CUSTOMER'] };

const queryMock = vi.fn();
const mutationMock = vi.fn();
const client = {
  query: queryMock,
  mutation: mutationMock,
} as unknown as CoreApiClient;

const buildOpportunity = (
  overrides: Partial<OpportunityNode>,
): OpportunityNode => ({
  id: 'opportunity-1',
  stage: 'PROPOSAL',
  closeDate: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  stageChangedAt: '2026-10-01T00:00:00.000Z',
  healthStatus: null,
  healthReasons: null,
  ...overrides,
});

const mockTaskTargets = (
  nodes: { targetOpportunityId: string; status: string }[],
) =>
  queryMock.mockResolvedValueOnce({
    taskTargets: {
      edges: nodes.map(({ targetOpportunityId, status }) => ({
        node: { targetOpportunityId, task: { status } },
      })),
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  });

beforeEach(() => {
  queryMock.mockReset();
  mutationMock.mockReset();
  mutationMock.mockResolvedValue({});
});

describe('scoreOpportunities', () => {
  it('writes the computed health and counts only unfinished tasks', async () => {
    mockTaskTargets([
      { targetOpportunityId: 'opportunity-1', status: 'DONE' },
      { targetOpportunityId: 'opportunity-1', status: 'DONE' },
    ]);

    const updatedCount = await scoreOpportunities({
      client,
      opportunities: [buildOpportunity({})],
      settings: SETTINGS,
      now: NOW,
    });

    expect(updatedCount).toBe(1);
    expect(mutationMock).toHaveBeenCalledWith({
      updateOpportunity: {
        __args: {
          id: 'opportunity-1',
          data: {
            stageChangedAt: '2026-10-01T00:00:00.000Z',
            healthStatus: 'WATCH',
            healthReasons: 'No open task',
          },
        },
        id: true,
      },
    });
  });

  it('skips the write when nothing changed', async () => {
    mockTaskTargets([{ targetOpportunityId: 'opportunity-1', status: 'TODO' }]);

    const updatedCount = await scoreOpportunities({
      client,
      opportunities: [buildOpportunity({ healthStatus: 'HEALTHY' })],
      settings: SETTINGS,
      now: NOW,
    });

    expect(updatedCount).toBe(0);
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('treats the empty string the API returns for no reasons as unchanged', async () => {
    mockTaskTargets([{ targetOpportunityId: 'opportunity-1', status: 'TODO' }]);

    const updatedCount = await scoreOpportunities({
      client,
      opportunities: [
        buildOpportunity({ healthStatus: 'HEALTHY', healthReasons: '' }),
      ],
      settings: SETTINGS,
      now: NOW,
    });

    expect(updatedCount).toBe(0);
  });

  it('backfills the stage clock from the last update for deals that predate the app', async () => {
    mockTaskTargets([{ targetOpportunityId: 'opportunity-1', status: 'TODO' }]);

    await scoreOpportunities({
      client,
      opportunities: [
        buildOpportunity({
          stageChangedAt: null,
          updatedAt: '2026-08-01T00:00:00.000Z',
        }),
      ],
      settings: SETTINGS,
      now: NOW,
    });

    expect(mutationMock.mock.calls[0][0].updateOpportunity.__args.data).toEqual(
      {
        stageChangedAt: '2026-08-01T00:00:00.000Z',
        healthStatus: 'WATCH',
        healthReasons: 'In this stage since 1 Aug 2026',
      },
    );
  });

  it('restarts the stage clock when given an override', async () => {
    mockTaskTargets([{ targetOpportunityId: 'opportunity-1', status: 'TODO' }]);

    await scoreOpportunities({
      client,
      opportunities: [
        buildOpportunity({ stageChangedAt: '2026-01-01T00:00:00.000Z' }),
      ],
      settings: SETTINGS,
      now: NOW,
      stageChangedAtOverride: NOW.toISOString(),
    });

    expect(mutationMock.mock.calls[0][0].updateOpportunity.__args.data).toEqual(
      {
        stageChangedAt: NOW.toISOString(),
        healthStatus: 'HEALTHY',
        healthReasons: null,
      },
    );
  });
});
