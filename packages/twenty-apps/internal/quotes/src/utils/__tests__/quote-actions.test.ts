import { describe, expect, it } from 'vitest';

import {
  buildClient,
  buildQuote,
  buildSettings,
} from 'src/utils/__tests__/test-quote';
import { type Caller } from 'src/utils/resolve-caller';
import {
  type QuoteActionRequest,
  runQuoteAction,
} from 'src/utils/quote-actions';

const NOW = new Date('2026-11-27T10:00:00.000Z');

const MANAGER: Caller = {
  workspaceMemberId: 'member-manager',
  email: 'manager@acme.example',
  name: 'Ravi Kumar',
};

const REP: Caller = {
  workspaceMemberId: 'member-rep',
  email: 'rep@acme.example',
  name: 'Asha Rao',
};

const request = (
  action: QuoteActionRequest['action'],
  overrides: Partial<QuoteActionRequest> = {},
): QuoteActionRequest => ({
  action,
  quoteId: 'quote-1',
  opportunityId: null,
  note: null,
  crmBaseUrl: 'https://acme.yourjugaad.cloud',
  ...overrides,
});

const discountedLine = (discountPercent: number) => ({
  ...buildQuote().lineItems[0],
  discountPercent,
});

describe('runQuoteAction: send', () => {
  it('stores the totals and marks a draft as sent', async () => {
    const { client, mutationsNamed } = buildClient({ quote: buildQuote() });

    const result = await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: REP },
      request('send'),
    );

    expect(result).toEqual({ ok: true, quoteId: 'quote-1', status: 'SENT' });

    const [update] = mutationsNamed('updateQuote');
    const data = update.args.data as Record<string, unknown>;

    expect(data.status).toBe('SENT');
    expect(data.sentAt).toBe(NOW.toISOString());
    expect(data.total).toEqual({
      amountMicros: 118_000_000_000,
      currencyCode: 'INR',
    });
  });

  it('refuses to send a discount above the threshold without approval', async () => {
    const { client, mutations } = buildClient({
      quote: buildQuote({ lineItems: [discountedLine(15)] }),
    });

    const result = await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: REP },
      request('send'),
    );

    expect(result).toMatchObject({ ok: false, reason: 'needs-approval' });
    expect(mutations).toEqual([]);
  });

  it('sends an approved quote even with a large discount', async () => {
    const { client } = buildClient({
      quote: buildQuote({
        status: 'APPROVED',
        lineItems: [discountedLine(15)],
      }),
    });

    const result = await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: REP },
      request('send'),
    );

    expect(result).toMatchObject({ ok: true, status: 'SENT' });
  });

  it('refuses an empty quote', async () => {
    const { client } = buildClient({ quote: buildQuote({ lineItems: [] }) });

    const result = await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: REP },
      request('send'),
    );

    expect(result).toMatchObject({ ok: false, reason: 'empty' });
  });
});

describe('runQuoteAction: approvals', () => {
  it('moves the quote to pending approval and gives each approver a task', async () => {
    const { client, mutationsNamed } = buildClient({
      quote: buildQuote({ lineItems: [discountedLine(15)] }),
      queries: {
        workspaceMembers: () => ({
          edges: [
            {
              node: { id: 'member-manager', userEmail: 'Manager@acme.example' },
            },
            { node: { id: 'member-rep', userEmail: 'rep@acme.example' } },
          ],
        }),
      },
    });

    const result = await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: REP },
      request('request-approval'),
    );

    expect(result).toMatchObject({ ok: true, status: 'PENDING_APPROVAL' });

    const [task] = mutationsNamed('createTask');
    const taskData = task.args.data as Record<string, unknown>;

    expect(mutationsNamed('createTask')).toHaveLength(1);
    expect(taskData.assigneeId).toBe('member-manager');
    expect(taskData.title).toBe('Approve quote Q-2026-0007: 15% discount');
    expect(JSON.stringify(taskData.bodyV2)).toContain(
      'https://acme.yourjugaad.cloud/object/quote/quote-1',
    );
    expect(mutationsNamed('createTaskTarget')[0].args.data).toMatchObject({
      targetOpportunityId: 'deal-1',
    });
  });

  it('lets only a named approver approve, and closes the approval task', async () => {
    const pending = buildQuote({
      status: 'PENDING_APPROVAL',
      lineItems: [discountedLine(15)],
    });
    const notApprover = buildClient({ quote: pending });

    expect(
      await runQuoteAction(
        {
          client: notApprover.client,
          settings: buildSettings(),
          now: NOW,
          caller: REP,
        },
        request('approve'),
      ),
    ).toMatchObject({ ok: false, reason: 'not-approver' });

    const approver = buildClient({
      quote: pending,
      queries: {
        tasks: () => ({
          edges: [
            { node: { id: 'task-1', status: 'TODO' } },
            { node: { id: 'task-2', status: 'DONE' } },
          ],
        }),
      },
    });

    const result = await runQuoteAction(
      {
        client: approver.client,
        settings: buildSettings(),
        now: NOW,
        caller: MANAGER,
      },
      request('approve', { note: 'OK for this account' }),
    );

    expect(result).toMatchObject({ ok: true, status: 'APPROVED' });
    expect(approver.mutationsNamed('updateQuote')[0].args.data).toMatchObject({
      status: 'APPROVED',
      approvedById: 'member-manager',
      approvalNote: 'OK for this account',
    });
    expect(
      approver.mutationsNamed('updateTask').map((update) => update.args.id),
    ).toEqual(['task-1']);
  });

  it('sends a rejected quote back to draft with the reason', async () => {
    const { client, mutationsNamed } = buildClient({
      quote: buildQuote({ status: 'PENDING_APPROVAL' }),
    });

    await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: MANAGER },
      request('reject', { note: 'Max 10% for new accounts' }),
    );

    expect(mutationsNamed('updateQuote')[0].args.data).toMatchObject({
      status: 'DRAFT',
      approvalNote: 'Rejected by Ravi Kumar: Max 10% for new accounts',
    });
  });
});

describe('runQuoteAction: create, reopen and duplicate', () => {
  it('creates a numbered draft from a deal with its company and contact', async () => {
    const { client, mutationsNamed } = buildClient({
      queries: {
        opportunities: () => ({
          edges: [
            {
              node: {
                id: 'deal-1',
                name: 'Kumar Infra office',
                companyId: 'company-1',
                pointOfContactId: 'person-1',
              },
            },
          ],
        }),
        quotes: () => ({ edges: [{ node: { quoteNumber: 'Q-2026-0007' } }] }),
      },
    });

    const result = await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: REP },
      request('create', { quoteId: null, opportunityId: 'deal-1' }),
    );

    expect(result).toMatchObject({ ok: true, status: 'DRAFT' });
    expect(mutationsNamed('createQuote')[0].args.data).toMatchObject({
      name: 'Kumar Infra office',
      quoteNumber: 'Q-2026-0008',
      opportunityId: 'deal-1',
      companyId: 'company-1',
      personId: 'person-1',
      validUntil: '2026-12-27',
      taxScheme: 'GST',
      placeOfSupply: 'Maharashtra',
    });
  });

  it('reopens a sent quote as a draft and clears the approval', async () => {
    const { client, mutationsNamed } = buildClient({
      quote: buildQuote({ status: 'VIEWED' }),
    });

    const result = await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: REP },
      request('reopen'),
    );

    expect(result).toMatchObject({ ok: true, status: 'DRAFT' });
    expect(mutationsNamed('updateQuote')[0].args.data).toEqual({
      status: 'DRAFT',
      approvedById: null,
      approvedAt: null,
    });
  });

  it('does not reopen an accepted quote', async () => {
    const { client } = buildClient({
      quote: buildQuote({ status: 'ACCEPTED' }),
    });

    expect(
      await runQuoteAction(
        { client, settings: buildSettings(), now: NOW, caller: REP },
        request('reopen'),
      ),
    ).toMatchObject({ ok: false, reason: 'wrong-status' });
  });

  it('duplicates a quote with its lines under a new number', async () => {
    const { client, mutationsNamed } = buildClient({
      quote: buildQuote({ status: 'DECLINED' }),
    });

    const result = await runQuoteAction(
      { client, settings: buildSettings(), now: NOW, caller: REP },
      request('duplicate'),
    );

    expect(result).toMatchObject({ ok: true, status: 'DRAFT' });
    expect(mutationsNamed('createQuote')[0].args.data).toMatchObject({
      name: 'Office fit-out',
      status: 'DRAFT',
      opportunityId: 'deal-1',
    });
    expect(mutationsNamed('createQuoteLineItem')[0].args.data).toMatchObject({
      name: 'Workstations',
      quantity: 10,
      lineTotal: { amountMicros: 100_000_000_000, currencyCode: 'INR' },
    });
  });
});
