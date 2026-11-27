import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type CoreApiClient } from 'twenty-client-sdk/core';

import { DEAL_COACH_AGENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { type DealCoachSettings } from 'src/utils/get-deal-coach-settings';
import { refreshNextBestAction } from 'src/utils/refresh-next-best-action';

const runAgentMock = vi.hoisted(() => vi.fn());

vi.mock('twenty-sdk/logic-function', () => ({
  runAgent: runAgentMock,
}));

const SETTINGS: DealCoachSettings = {
  closedStages: ['CUSTOMER', 'LOST'],
  refreshAfterDays: 3,
  maxDealsPerRun: 25,
};

const STAGE_OPTIONS = [
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'CUSTOMER', label: 'Customer' },
];

const NOW = new Date('2026-11-24T10:00:00.000Z');

const buildOpportunity = (overrides: Record<string, unknown> = {}) => ({
  id: 'opportunity-1',
  name: 'Hartwell office lease',
  stage: 'MEETING',
  closeDate: null,
  createdAt: '2026-10-01T08:00:00.000Z',
  amount: { amountMicros: 480_000_000_000, currencyCode: 'USD' },
  companyId: null,
  pointOfContactId: 'person-1',
  owner: { name: { firstName: 'Maya', lastName: 'R' } },
  company: null,
  pointOfContact: {
    name: { firstName: 'Priya', lastName: 'Shah' },
    jobTitle: null,
  },
  nextBestAction: null,
  nextBestActionUpdatedAt: null,
  ...overrides,
});

const emptyConnection = { edges: [] };

const buildClient = (opportunity: object | null) => {
  const mutation = vi.fn().mockResolvedValue({});
  const query = vi.fn(async (request: Record<string, unknown>) => {
    const [rootField] = Object.keys(request);

    if (rootField === 'opportunity') {
      return { opportunity };
    }

    if (rootField === 'conversationMessages') {
      return {
        conversationMessages: {
          edges: [
            {
              node: {
                direction: 'INBOUND',
                body: 'Can we tour the space Thursday?',
                sentAt: null,
                receivedAt: '2026-11-24T08:00:00.000Z',
                createdAt: '2026-11-24T08:00:00.000Z',
                isInternalNote: false,
                conversation: {
                  person: { name: { firstName: 'Priya', lastName: 'Shah' } },
                  assignedTo: null,
                },
              },
            },
          ],
        },
      };
    }

    if (rootField === 'conversations') {
      return {
        conversations: { edges: [{ node: { id: 'conversation-1' } }] },
      };
    }

    return { [rootField]: emptyConnection };
  });

  return {
    client: { query, mutation } as unknown as CoreApiClient,
    query,
    mutation,
  };
};

describe('refreshNextBestAction', () => {
  beforeEach(() => {
    runAgentMock.mockReset();
  });

  it('runs the Deal coach agent and writes its suggestion onto the deal', async () => {
    runAgentMock.mockResolvedValue({
      success: true,
      error: null,
      result: {
        actionType: 'SCHEDULE_MEETING',
        channel: 'WHATSAPP',
        nextAction: 'Confirm Thursday 11 AM tour with Priya',
        reason: 'Priya asked about Thursday this morning.',
        dueDate: '2026-11-24',
        risk: 'LOW',
        draftMessage: 'Hi Priya, Thursday 11 AM works!\n[Your Name]',
        emailSubject: '',
        meetingTitle: 'Office tour with Priya',
        meetingStart: '2026-11-26T11:00',
        meetingDurationMinutes: 60,
        meetingLocation: '',
        newStage: 'PROPOSAL',
        newCloseDate: '',
        newAmount: 0,
      },
    });
    const { client, mutation } = buildClient(buildOpportunity());

    const result = await refreshNextBestAction({
      client,
      opportunityId: 'opportunity-1',
      settings: SETTINGS,
      stageOptions: STAGE_OPTIONS,
      now: NOW,
    });

    expect(result).toEqual({ outcome: 'refreshed' });
    expect(runAgentMock).toHaveBeenCalledTimes(1);

    const [agentInput] = runAgentMock.mock.calls[0];

    expect(agentInput.agentUniversalIdentifier).toBe(
      DEAL_COACH_AGENT_UNIVERSAL_IDENTIFIER,
    );
    expect(agentInput.prompt).toContain('Can we tour the space Thursday?');
    expect(agentInput.prompt).toContain('- Deal owner: Maya R');

    expect(mutation).toHaveBeenCalledWith({
      updateOpportunity: {
        __args: {
          id: 'opportunity-1',
          data: {
            nextBestAction: 'Confirm Thursday 11 AM tour with Priya',
            nextBestActionReason: 'Priya asked about Thursday this morning.',
            nextBestActionType: 'SCHEDULE_MEETING',
            nextBestActionChannel: 'WHATSAPP',
            nextBestActionDraft: 'Hi Priya, Thursday 11 AM works!\nMaya',
            nextBestActionDueDate: '2026-11-24',
            nextBestActionDetails: {
              emailSubject: null,
              meeting: {
                title: 'Office tour with Priya',
                startLocal: '2026-11-26T11:00',
                durationMinutes: 60,
                location: null,
              },
              dealUpdate: {
                stage: 'PROPOSAL',
                stageLabel: 'Proposal',
                closeDate: null,
                amountMicros: null,
              },
            },
            dealRisk: 'LOW',
            nextBestActionUpdatedAt: NOW.toISOString(),
          },
        },
        id: true,
      },
    });
  });

  it('never offers to move the deal to a won or lost stage', async () => {
    runAgentMock.mockResolvedValue({
      success: true,
      error: null,
      result: {
        actionType: 'REPLY',
        channel: 'WHATSAPP',
        nextAction: 'Thank Priya for the board approval',
        reason: 'The board approved the proposal.',
        dueDate: '2026-11-24',
        risk: 'LOW',
        draftMessage: 'Great news, thank you!',
        newStage: 'CUSTOMER',
        newCloseDate: '',
        newAmount: 0,
      },
    });
    const { client, mutation } = buildClient(buildOpportunity());

    await refreshNextBestAction({
      client,
      opportunityId: 'opportunity-1',
      settings: SETTINGS,
      stageOptions: STAGE_OPTIONS,
      now: NOW,
    });

    const [agentInput] = runAgentMock.mock.calls[0];

    expect(agentInput.prompt).toContain(
      '- Open stage values: PROPOSAL (Proposal), MEETING (Meeting)',
    );
    expect(
      mutation.mock.calls[0][0].updateOpportunity.__args.data
        .nextBestActionDetails.dealUpdate,
    ).toBeNull();
  });

  it('leaves the deal untouched when the agent fails', async () => {
    runAgentMock.mockResolvedValue({
      success: false,
      error: 'No AI model is enabled',
      result: null,
    });
    const { client, mutation } = buildClient(buildOpportunity());

    const result = await refreshNextBestAction({
      client,
      opportunityId: 'opportunity-1',
      settings: SETTINGS,
      stageOptions: STAGE_OPTIONS,
      now: NOW,
    });

    expect(result).toEqual({
      outcome: 'agent-failed',
      error: 'No AI model is enabled',
    });
    expect(mutation).not.toHaveBeenCalled();
  });

  it('clears the suggestion of a deal that was closed, without calling the agent', async () => {
    const { client, mutation } = buildClient(
      buildOpportunity({
        stage: 'CUSTOMER',
        nextBestAction: 'Send the contract',
        nextBestActionUpdatedAt: '2026-11-20T10:00:00.000Z',
      }),
    );

    const result = await refreshNextBestAction({
      client,
      opportunityId: 'opportunity-1',
      settings: SETTINGS,
      stageOptions: STAGE_OPTIONS,
      now: NOW,
    });

    expect(result).toEqual({ outcome: 'cleared' });
    expect(runAgentMock).not.toHaveBeenCalled();
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(
      mutation.mock.calls[0][0].updateOpportunity.__args.data.nextBestAction,
    ).toBeNull();
  });

  it('does nothing for a closed deal without a suggestion', async () => {
    const { client, mutation } = buildClient(
      buildOpportunity({ stage: 'LOST' }),
    );

    const result = await refreshNextBestAction({
      client,
      opportunityId: 'opportunity-1',
      settings: SETTINGS,
      stageOptions: STAGE_OPTIONS,
      now: NOW,
    });

    expect(result).toEqual({ outcome: 'closed' });
    expect(mutation).not.toHaveBeenCalled();
  });

  it('reports a missing deal', async () => {
    const { client } = buildClient(null);

    const result = await refreshNextBestAction({
      client,
      opportunityId: 'missing',
      settings: SETTINGS,
      stageOptions: STAGE_OPTIONS,
      now: NOW,
    });

    expect(result).toEqual({ outcome: 'not-found' });
  });
});
