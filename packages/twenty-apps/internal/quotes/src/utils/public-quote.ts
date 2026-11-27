import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  OPEN_FOR_RESPONSE_STATUSES,
  type QuoteStatus,
} from 'src/constants/quote-options';
import { formatMoney, toIsoDate } from 'src/utils/format-money';
import {
  createNote,
  fetchQuote,
  type QuoteRecord,
  updateQuote,
} from 'src/utils/quote-records';
import { type QuoteSettings } from 'src/utils/quote-settings';
import { sanitizeSignaturePath, tokensMatch } from 'src/utils/security';

// Drafts and quotes awaiting approval are only visible as an internal preview.
const CUSTOMER_VISIBLE_STATUSES: QuoteStatus[] = [
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
];

export const isPastValidity = (validUntil: string | null, now: Date): boolean =>
  validUntil !== null && validUntil < toIsoDate(now);

export const loadQuoteForToken = async ({
  client,
  quoteId,
  token,
  settings,
}: {
  client: CoreApiClient;
  quoteId: string;
  token: string | null | undefined;
  settings: QuoteSettings;
}): Promise<QuoteRecord | undefined> => {
  const quote = await fetchQuote(client, quoteId, settings.defaultCurrency);

  return quote && tokensMatch(quote.accessToken, token) ? quote : undefined;
};

export const isVisibleToCustomer = (quote: QuoteRecord): boolean =>
  CUSTOMER_VISIBLE_STATUSES.includes(quote.status);

// Opening the link moves a sent quote to Viewed (a workflow trigger), counts
// the visit, and lazily expires a quote past its date.
export const recordCustomerView = async ({
  client,
  quote,
  now,
}: {
  client: CoreApiClient;
  quote: QuoteRecord;
  now: Date;
}): Promise<QuoteRecord> => {
  const isOpen = OPEN_FOR_RESPONSE_STATUSES.includes(quote.status);
  const hasExpired = isOpen && isPastValidity(quote.validUntil, now);
  const nowIso = now.toISOString();

  const data: Record<string, unknown> = {
    viewCount: quote.viewCount + 1,
    lastViewedAt: nowIso,
  };

  let status = quote.status;

  if (hasExpired) {
    status = 'EXPIRED';
  } else if (quote.status === 'SENT') {
    status = 'VIEWED';
    data.viewedAt = nowIso;
  }

  if (status !== quote.status) {
    data.status = status;
  }

  await updateQuote(client, quote.id, data);

  return {
    ...quote,
    status,
    viewCount: quote.viewCount + 1,
    lastViewedAt: nowIso,
    viewedAt: (data.viewedAt as string | undefined) ?? quote.viewedAt,
  };
};

export type QuoteResponseInput = {
  decision: 'accept' | 'decline';
  signerName: string;
  signature: string | null;
  reason: string | null;
  agreed: boolean;
};

export const parseQuoteResponse = (
  body: unknown,
): { ok: true; input: QuoteResponseInput } | { ok: false; message: string } => {
  const raw = (body ?? {}) as Record<string, unknown>;
  const decision =
    raw.decision === 'decline'
      ? 'decline'
      : raw.decision === 'accept'
        ? 'accept'
        : null;
  const signerName =
    typeof raw.signerName === 'string'
      ? raw.signerName.trim().slice(0, 120)
      : '';
  const reason =
    typeof raw.reason === 'string'
      ? raw.reason.trim().slice(0, 1000) || null
      : null;

  if (decision === null) {
    return { ok: false, message: 'Choose to accept or decline the quote.' };
  }

  if (decision === 'decline') {
    return {
      ok: true,
      input: { decision, signerName, signature: null, reason, agreed: false },
    };
  }

  const signature = sanitizeSignaturePath(raw.signature);

  if (signerName.length < 2) {
    return { ok: false, message: 'Type your full name to accept.' };
  }

  if (signature === null) {
    return { ok: false, message: 'Sign in the box to accept.' };
  }

  if (raw.agreed !== true) {
    return {
      ok: false,
      message: 'Tick the box to accept the quote and its terms.',
    };
  }

  return {
    ok: true,
    input: { decision, signerName, signature, reason: null, agreed: true },
  };
};

export const applyQuoteResponse = async ({
  client,
  quote,
  input,
  settings,
  now,
  signerIpHash,
  userAgent,
}: {
  client: CoreApiClient;
  quote: QuoteRecord;
  input: QuoteResponseInput;
  settings: QuoteSettings;
  now: Date;
  signerIpHash: string | null;
  userAgent: string | null;
}): Promise<
  { ok: true; status: QuoteStatus } | { ok: false; message: string }
> => {
  if (!OPEN_FOR_RESPONSE_STATUSES.includes(quote.status)) {
    return {
      ok: false,
      message:
        'This quote is no longer open. Ask your contact for an updated one.',
    };
  }

  if (isPastValidity(quote.validUntil, now)) {
    await updateQuote(client, quote.id, { status: 'EXPIRED' });

    return {
      ok: false,
      message: 'This quote has expired. Ask your contact for an updated one.',
    };
  }

  const isAccepted = input.decision === 'accept';
  const status: QuoteStatus = isAccepted ? 'ACCEPTED' : 'DECLINED';

  await updateQuote(client, quote.id, {
    status,
    respondedAt: now.toISOString(),
    signerName: input.signerName || null,
    signature: input.signature,
    declineReason: input.reason,
    signerIpHash,
    signerUserAgent: userAgent?.slice(0, 500) ?? null,
  });

  const totalText = formatMoney(quote.total.amountMicros, quote.currencyCode);
  const signer = input.signerName || quote.person?.name || 'The customer';

  if (isAccepted && quote.opportunity) {
    await updateDealOnAcceptance({ client, quote, settings });
  }

  await createNote(client, {
    title: isAccepted
      ? `Quote ${quote.quoteNumber ?? ''} accepted`
      : `Quote ${quote.quoteNumber ?? ''} declined`,
    markdown: isAccepted
      ? `${signer} accepted and signed quote ${quote.quoteNumber ?? ''} (${totalText}) online.`
      : `${signer} declined quote ${quote.quoteNumber ?? ''} (${totalText}).${input.reason ? `\n\n**Reason:** ${input.reason}` : ''}`,
    opportunityId: quote.opportunity?.id ?? null,
    personId: quote.person?.id ?? null,
  });

  return { ok: true, status };
};

// The accepted total becomes the deal amount; moving the stage is optional
// because some teams only call a deal won once it is paid.
const updateDealOnAcceptance = async ({
  client,
  quote,
  settings,
}: {
  client: CoreApiClient;
  quote: QuoteRecord;
  settings: QuoteSettings;
}): Promise<void> => {
  if (!quote.opportunity) {
    return;
  }

  const amount = {
    amountMicros: quote.total.amountMicros,
    currencyCode: quote.currencyCode,
  };

  const update = (data: Record<string, unknown>) =>
    client.mutation({
      updateOpportunity: {
        __args: { id: quote.opportunity?.id ?? '', data },
        id: true,
      },
    });

  if (!settings.acceptedDealStage) {
    await update({ amount });

    return;
  }

  try {
    await update({ amount, stage: settings.acceptedDealStage });
  } catch (error) {
    console.warn(
      `Quote ${quote.id}: could not move the deal to stage "${settings.acceptedDealStage}": ${error instanceof Error ? error.message : String(error)}`,
    );
    await update({ amount });
  }
};
