import { type CoreApiClient } from 'twenty-client-sdk/core';

import { type QuoteStatus } from 'src/constants/quote-options';
import { addDays, formatMoney, toIsoDate } from 'src/utils/format-money';
import { formatRate } from 'src/utils/quote-math';
import { getQuoteNumberHead, nextQuoteNumber } from 'src/utils/quote-number';
import {
  createLineItem,
  createQuote,
  fetchQuote,
  findRecentQuoteNumbers,
  nodesOf,
  type QuoteRecord,
  updateQuote,
} from 'src/utils/quote-records';
import { type QuoteSettings, needsApproval } from 'src/utils/quote-settings';
import { computeTotalsFor, totalsToQuoteData } from 'src/utils/quote-totals';
import { type Caller, findMembersByEmail } from 'src/utils/resolve-caller';
import { generateAccessToken } from 'src/utils/security';

export const QUOTE_ACTION_NAMES = [
  'create',
  'send',
  'request-approval',
  'approve',
  'reject',
  'reopen',
  'duplicate',
] as const;

export type QuoteActionName = (typeof QUOTE_ACTION_NAMES)[number];

export type QuoteActionRequest = {
  action: QuoteActionName;
  quoteId: string | null;
  opportunityId: string | null;
  note: string | null;
  crmBaseUrl: string | null;
};

export type QuoteActionResult =
  | { ok: true; quoteId: string; status: QuoteStatus }
  | { ok: false; reason: string; message: string };

export type QuoteActionContext = {
  client: CoreApiClient;
  settings: QuoteSettings;
  now: Date;
  caller: Caller | null;
};

const failure = (reason: string, message: string): QuoteActionResult => ({
  ok: false,
  reason,
  message,
});

const zeroMoney = (currencyCode: string) => ({ amountMicros: 0, currencyCode });

export const buildNewQuoteDefaults = ({
  settings,
  now,
  quoteNumber,
}: {
  settings: QuoteSettings;
  now: Date;
  quoteNumber: string;
}): Record<string, unknown> => ({
  quoteNumber,
  status: 'DRAFT',
  validUntil: toIsoDate(addDays(now, settings.validDays)),
  taxScheme: settings.defaultTaxScheme,
  placeOfSupply:
    settings.defaultTaxScheme === 'GST' ? settings.sellerState : null,
  terms: settings.defaultTerms,
  accessToken: generateAccessToken(),
  subtotal: zeroMoney(settings.defaultCurrency),
  discountTotal: zeroMoney(settings.defaultCurrency),
  taxTotal: zeroMoney(settings.defaultCurrency),
  total: zeroMoney(settings.defaultCurrency),
  maxDiscountPercent: 0,
  viewCount: 0,
});

export const allocateQuoteNumber = async (
  client: CoreApiClient,
  settings: QuoteSettings,
  now: Date,
): Promise<string> => {
  const year = now.getUTCFullYear();
  const head = getQuoteNumberHead(settings.quoteNumberPrefix, year);

  return nextQuoteNumber({
    prefix: settings.quoteNumberPrefix,
    year,
    existingNumbers: await findRecentQuoteNumbers(client, head),
  });
};

const totalsForQuote = (quote: QuoteRecord, settings: QuoteSettings) =>
  computeTotalsFor({
    lines: quote.lineItems.map((line) => ({
      quantity: line.quantity,
      unitPriceMicros: line.unitPrice.amountMicros,
      discountPercent: line.discountPercent,
      taxRate: line.taxRate,
    })),
    taxScheme: quote.taxScheme,
    sellerState: settings.sellerState,
    placeOfSupply: quote.placeOfSupply,
  });

const approvalTaskTitlePrefix = (quote: QuoteRecord) =>
  `Approve quote ${quote.quoteNumber ?? quote.id}:`;

const completeApprovalTasks = async (
  client: CoreApiClient,
  quote: QuoteRecord,
): Promise<void> => {
  const { tasks } = await client.query({
    tasks: {
      __args: {
        filter: { title: { like: `${approvalTaskTitlePrefix(quote)}%` } },
        first: 50,
      },
      edges: { node: { id: true, status: true } },
    },
  });

  const openTasks = nodesOf(
    tasks as { edges: { node: { id: string; status: string | null } }[] },
  ).filter((task) => task.status !== 'DONE');

  for (const task of openTasks) {
    await client.mutation({
      updateTask: {
        __args: { id: task.id, data: { status: 'DONE' } },
        id: true,
      },
    });
  }
};

const createApprovalTasks = async ({
  client,
  quote,
  settings,
  caller,
  maxDiscountPercent,
  totalMicros,
  crmBaseUrl,
}: {
  client: CoreApiClient;
  quote: QuoteRecord;
  settings: QuoteSettings;
  caller: Caller | null;
  maxDiscountPercent: number;
  totalMicros: number;
  crmBaseUrl: string | null;
}): Promise<number> => {
  const approvers = await findMembersByEmail(client, settings.approverEmails);
  const customer = quote.company?.name ?? quote.person?.name ?? 'a customer';
  const markdown = [
    `${caller?.name ?? 'A teammate'} asked for approval of quote ${quote.quoteNumber ?? ''} for ${customer} (${formatMoney(totalMicros, quote.currencyCode)}).`,
    `The highest discount is ${formatRate(maxDiscountPercent)}%, above the ${formatRate(settings.approvalThreshold)}% limit.`,
    crmBaseUrl
      ? `Open the quote to approve or reject it: ${crmBaseUrl}/object/quote/${quote.id}`
      : 'Open the quote from the Quotes list to approve or reject it.',
  ].join('\n\n');

  for (const approver of approvers) {
    const { createTask } = await client.mutation({
      createTask: {
        __args: {
          data: {
            title: `${approvalTaskTitlePrefix(quote)} ${formatRate(maxDiscountPercent)}% discount`,
            status: 'TODO',
            assigneeId: approver.id,
            dueAt: addDays(new Date(), 1).toISOString(),
            bodyV2: { markdown },
          },
        },
        id: true,
      },
    });

    const taskId = (createTask as { id: string } | null)?.id;

    if (taskId && quote.opportunity) {
      await client.mutation({
        createTaskTarget: {
          __args: {
            data: { taskId, targetOpportunityId: quote.opportunity.id },
          },
          id: true,
        },
      });
    }
  }

  return approvers.length;
};

const createFromDeal = async (
  context: QuoteActionContext,
  opportunityId: string | null,
): Promise<QuoteActionResult> => {
  const { client, settings, now } = context;
  let dealData: Record<string, unknown> = {};
  let name = 'New quote';

  if (opportunityId) {
    const { opportunities } = await client.query({
      opportunities: {
        __args: { filter: { id: { eq: opportunityId } }, first: 1 },
        edges: {
          node: {
            id: true,
            name: true,
            companyId: true,
            pointOfContactId: true,
          },
        },
      },
    });

    const deal = nodesOf(
      opportunities as {
        edges: {
          node: {
            id: string;
            name: string | null;
            companyId: string | null;
            pointOfContactId: string | null;
          };
        }[];
      },
    )[0];

    if (!deal) {
      return failure('not-found', 'That deal no longer exists.');
    }

    name = deal.name || name;
    dealData = {
      opportunityId: deal.id,
      ...(deal.companyId ? { companyId: deal.companyId } : {}),
      ...(deal.pointOfContactId ? { personId: deal.pointOfContactId } : {}),
    };
  }

  const quoteNumber = await allocateQuoteNumber(client, settings, now);
  const quoteId = await createQuote(client, {
    name,
    ...dealData,
    ...buildNewQuoteDefaults({ settings, now, quoteNumber }),
  });

  return { ok: true, quoteId, status: 'DRAFT' };
};

const duplicate = async (
  context: QuoteActionContext,
  quote: QuoteRecord,
): Promise<QuoteActionResult> => {
  const { client, settings, now } = context;
  const totals = totalsForQuote(quote, settings);
  const quoteNumber = await allocateQuoteNumber(client, settings, now);

  const quoteId = await createQuote(client, {
    ...buildNewQuoteDefaults({ settings, now, quoteNumber }),
    name: quote.name,
    ...(quote.opportunity ? { opportunityId: quote.opportunity.id } : {}),
    ...(quote.company ? { companyId: quote.company.id } : {}),
    ...(quote.person ? { personId: quote.person.id } : {}),
    taxScheme: quote.taxScheme,
    placeOfSupply: quote.placeOfSupply,
    terms: quote.terms,
    ...totalsToQuoteData(totals, quote.currencyCode),
  });

  for (const [index, line] of quote.lineItems.entries()) {
    await createLineItem(client, {
      quoteId,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent,
      taxRate: line.taxRate,
      unit: line.unit,
      hsnSacCode: line.hsnSacCode,
      sortOrder: line.sortOrder,
      lineTotal: {
        amountMicros: totals.lines[index]?.netMicros ?? 0,
        currencyCode: quote.currencyCode,
      },
      ...(line.productId ? { productId: line.productId } : {}),
    });
  }

  return { ok: true, quoteId, status: 'DRAFT' };
};

const isApprover = (caller: Caller | null, settings: QuoteSettings) =>
  caller?.email !== null &&
  caller?.email !== undefined &&
  settings.approverEmails.includes(caller.email);

export const runQuoteAction = async (
  context: QuoteActionContext,
  request: QuoteActionRequest,
): Promise<QuoteActionResult> => {
  const { client, settings, now, caller } = context;

  if (request.action === 'create') {
    return createFromDeal(context, request.opportunityId);
  }

  if (!request.quoteId) {
    return failure('bad-request', 'No quote was given.');
  }

  const quote = await fetchQuote(
    client,
    request.quoteId,
    settings.defaultCurrency,
  );

  if (!quote) {
    return failure('not-found', 'That quote no longer exists.');
  }

  const done = (status: QuoteStatus): QuoteActionResult => ({
    ok: true,
    quoteId: quote.id,
    status,
  });

  switch (request.action) {
    case 'duplicate':
      return duplicate(context, quote);

    case 'send': {
      if (!['DRAFT', 'APPROVED', 'SENT', 'VIEWED'].includes(quote.status)) {
        return failure('wrong-status', 'This quote can no longer be sent.');
      }

      if (quote.lineItems.length === 0) {
        return failure('empty', 'Add at least one line before sending.');
      }

      const totals = totalsForQuote(quote, settings);

      if (
        quote.status === 'DRAFT' &&
        needsApproval(totals.maxDiscountPercent, settings)
      ) {
        return failure(
          'needs-approval',
          `Discounts above ${formatRate(settings.approvalThreshold)}% need approval before the quote is sent.`,
        );
      }

      const status: QuoteStatus =
        quote.status === 'SENT' || quote.status === 'VIEWED'
          ? quote.status
          : 'SENT';

      await updateQuote(client, quote.id, {
        ...totalsToQuoteData(totals, quote.currencyCode),
        status,
        sentAt: quote.sentAt ?? now.toISOString(),
        ...(quote.accessToken ? {} : { accessToken: generateAccessToken() }),
      });

      return done(status);
    }

    case 'request-approval': {
      if (quote.status !== 'DRAFT') {
        return failure(
          'wrong-status',
          'Only a draft can be sent for approval.',
        );
      }

      if (quote.lineItems.length === 0) {
        return failure('empty', 'Add at least one line first.');
      }

      const totals = totalsForQuote(quote, settings);

      if (!needsApproval(totals.maxDiscountPercent, settings)) {
        return failure('not-needed', 'This quote does not need approval.');
      }

      await updateQuote(client, quote.id, {
        ...totalsToQuoteData(totals, quote.currencyCode),
        status: 'PENDING_APPROVAL',
        approvalNote: null,
      });

      const approverCount = await createApprovalTasks({
        client,
        quote,
        settings,
        caller,
        maxDiscountPercent: totals.maxDiscountPercent,
        totalMicros: totals.totalMicros,
        crmBaseUrl: request.crmBaseUrl,
      });

      if (approverCount === 0) {
        console.warn(
          `Quote ${quote.id} needs approval but no workspace member matches APPROVER_EMAILS.`,
        );
      }

      return done('PENDING_APPROVAL');
    }

    case 'approve':
    case 'reject': {
      if (!isApprover(caller, settings) || caller === null) {
        return failure(
          'not-approver',
          'Only the approvers named in the Quotes app settings can do this.',
        );
      }

      if (quote.status !== 'PENDING_APPROVAL') {
        return failure(
          'wrong-status',
          'This quote is not waiting for approval.',
        );
      }

      const isApproval = request.action === 'approve';
      const note = request.note?.trim() || null;

      await updateQuote(client, quote.id, {
        status: isApproval ? 'APPROVED' : 'DRAFT',
        approvedById: isApproval ? caller.workspaceMemberId : null,
        approvedAt: isApproval ? now.toISOString() : null,
        approvalNote: isApproval
          ? note
          : `Rejected by ${caller.name}${note ? `: ${note}` : '.'}`,
      });

      await completeApprovalTasks(client, quote);

      return done(isApproval ? 'APPROVED' : 'DRAFT');
    }

    case 'reopen': {
      if (
        !['PENDING_APPROVAL', 'APPROVED', 'SENT', 'VIEWED'].includes(
          quote.status,
        )
      ) {
        return failure('wrong-status', 'This quote cannot be edited any more.');
      }

      await updateQuote(client, quote.id, {
        status: 'DRAFT',
        approvedById: null,
        approvedAt: null,
      });

      if (quote.status === 'PENDING_APPROVAL') {
        await completeApprovalTasks(client, quote);
      }

      return done('DRAFT');
    }

    default:
      return failure('bad-request', 'Unknown action.');
  }
};
