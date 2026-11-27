import { describe, expect, it } from 'vitest';

import {
  buildClient,
  buildQuote,
  buildSettings,
} from 'src/utils/__tests__/test-quote';
import {
  applyQuoteResponse,
  loadQuoteForToken,
  parseQuoteResponse,
  recordCustomerView,
} from 'src/utils/public-quote';
import { computeTotalsFor } from 'src/utils/quote-totals';
import { renderQuotePage } from 'src/utils/render-quote-page';

const NOW = new Date('2026-11-27T10:00:00.000Z');
const SIGNATURE = 'M10 10 L40 30 L80 20';

const accept = {
  decision: 'accept' as const,
  signerName: 'Arjun Mehta',
  signature: SIGNATURE,
  reason: null,
  agreed: true,
};

describe('parseQuoteResponse', () => {
  it('requires a name, a signature and agreement to accept', () => {
    expect(parseQuoteResponse({ decision: 'accept' })).toMatchObject({
      ok: false,
      message: 'Type your full name to accept.',
    });
    expect(
      parseQuoteResponse({ decision: 'accept', signerName: 'Arjun Mehta' }),
    ).toMatchObject({ ok: false, message: 'Sign in the box to accept.' });
    expect(
      parseQuoteResponse({
        decision: 'accept',
        signerName: 'Arjun Mehta',
        signature: SIGNATURE,
      }),
    ).toMatchObject({ ok: false });
    expect(
      parseQuoteResponse({
        decision: 'accept',
        signerName: ' Arjun Mehta ',
        signature: SIGNATURE,
        agreed: true,
      }),
    ).toEqual({ ok: true, input: accept });
  });

  it('accepts a decline with an optional reason', () => {
    expect(
      parseQuoteResponse({ decision: 'decline', reason: '  Too expensive ' }),
    ).toMatchObject({
      ok: true,
      input: { decision: 'decline', reason: 'Too expensive' },
    });
    expect(parseQuoteResponse({ decision: 'maybe' })).toMatchObject({
      ok: false,
    });
  });
});

describe('loadQuoteForToken', () => {
  it('only returns the quote for the right link key', async () => {
    const { client } = buildClient({ quote: buildQuote() });
    const settings = buildSettings();

    expect(
      await loadQuoteForToken({
        client,
        quoteId: 'quote-1',
        token: 'secret-token',
        settings,
      }),
    ).toMatchObject({ id: 'quote-1' });
    expect(
      await loadQuoteForToken({
        client,
        quoteId: 'quote-1',
        token: 'guess',
        settings,
      }),
    ).toBeUndefined();
  });
});

describe('recordCustomerView', () => {
  it('marks a sent quote as viewed and counts the visit', async () => {
    const { client, mutationsNamed } = buildClient({});

    const viewed = await recordCustomerView({
      client,
      quote: buildQuote({ status: 'SENT', viewCount: 2 }),
      now: NOW,
    });

    expect(viewed.status).toBe('VIEWED');
    expect(mutationsNamed('updateQuote')[0].args.data).toEqual({
      viewCount: 3,
      lastViewedAt: NOW.toISOString(),
      viewedAt: NOW.toISOString(),
      status: 'VIEWED',
    });
  });

  it('expires a quote opened after its valid-until date', async () => {
    const { client } = buildClient({});

    const viewed = await recordCustomerView({
      client,
      quote: buildQuote({ status: 'VIEWED', validUntil: '2026-11-26' }),
      now: NOW,
    });

    expect(viewed.status).toBe('EXPIRED');
  });
});

describe('applyQuoteResponse', () => {
  it('records the signature, updates the deal and notes the acceptance', async () => {
    const { client, mutationsNamed } = buildClient({});

    const result = await applyQuoteResponse({
      client,
      quote: buildQuote({ status: 'VIEWED' }),
      input: accept,
      settings: buildSettings({ acceptedDealStage: 'CUSTOMER' }),
      now: NOW,
      signerIpHash: 'hash',
      userAgent: 'Mozilla/5.0',
    });

    expect(result).toEqual({ ok: true, status: 'ACCEPTED' });
    expect(mutationsNamed('updateQuote')[0].args.data).toMatchObject({
      status: 'ACCEPTED',
      signerName: 'Arjun Mehta',
      signature: SIGNATURE,
      signerIpHash: 'hash',
    });
    expect(mutationsNamed('updateOpportunity')[0].args).toEqual({
      id: 'deal-1',
      data: {
        amount: { amountMicros: 118_000_000_000, currencyCode: 'INR' },
        stage: 'CUSTOMER',
      },
    });
    expect(mutationsNamed('createNote')[0].args.data).toMatchObject({
      title: 'Quote Q-2026-0007 accepted',
    });
    expect(mutationsNamed('createNoteTarget')).toHaveLength(2);
  });

  it('still updates the amount when the configured stage does not exist', async () => {
    const { client, mutationsNamed } = buildClient({
      failMutation: (name, args) =>
        name === 'updateOpportunity' &&
        'stage' in (args.data as Record<string, unknown>),
    });

    await applyQuoteResponse({
      client,
      quote: buildQuote({ status: 'SENT' }),
      input: accept,
      settings: buildSettings({ acceptedDealStage: 'WON' }),
      now: NOW,
      signerIpHash: null,
      userAgent: null,
    });

    expect(mutationsNamed('updateOpportunity')[0].args.data).toEqual({
      amount: { amountMicros: 118_000_000_000, currencyCode: 'INR' },
    });
  });

  it('refuses a quote that is not open, and expires a stale one', async () => {
    const closed = buildClient({});

    expect(
      await applyQuoteResponse({
        client: closed.client,
        quote: buildQuote({ status: 'DRAFT' }),
        input: accept,
        settings: buildSettings(),
        now: NOW,
        signerIpHash: null,
        userAgent: null,
      }),
    ).toMatchObject({ ok: false });
    expect(closed.mutations).toEqual([]);

    const stale = buildClient({});

    expect(
      await applyQuoteResponse({
        client: stale.client,
        quote: buildQuote({ status: 'SENT', validUntil: '2026-11-01' }),
        input: accept,
        settings: buildSettings(),
        now: NOW,
        signerIpHash: null,
        userAgent: null,
      }),
    ).toMatchObject({ ok: false });
    expect(stale.mutationsNamed('updateQuote')[0].args.data).toEqual({
      status: 'EXPIRED',
    });
  });
});

describe('renderQuotePage', () => {
  const render = (quoteOverrides = {}, isPreview = false) => {
    const quote = buildQuote(quoteOverrides);
    const settings = buildSettings();

    return renderQuotePage({
      quote,
      totals: computeTotalsFor({
        lines: quote.lineItems.map((line) => ({
          quantity: line.quantity,
          unitPriceMicros: line.unitPrice.amountMicros,
          discountPercent: line.discountPercent,
          taxRate: line.taxRate,
        })),
        taxScheme: quote.taxScheme,
        sellerState: settings.sellerState,
        placeOfSupply: quote.placeOfSupply,
      }),
      settings,
      sellerName: 'Acme <Interiors>',
      isPreview,
      respondUrl: '/s/quotes/view/quote-1/response',
      token: 'secret-token',
    });
  };

  it('shows the GST split, escapes text and offers acceptance on a sent quote', () => {
    const html = render({ status: 'SENT', name: 'Desks & chairs' });

    expect(html).toContain('CGST 9%');
    expect(html).toContain('SGST 9%');
    expect(html).toContain('Acme &lt;Interiors&gt;');
    expect(html).toContain('Desks &amp; chairs');
    expect(html).toContain('id="accept-form"');
    expect(html).toContain('₹1,18,000.00');
  });

  it('hides the accept form in a preview and on an accepted quote', () => {
    expect(render({ status: 'SENT' }, true)).not.toContain('id="accept-form"');

    const accepted = render({
      status: 'ACCEPTED',
      signerName: 'Arjun Mehta',
      signature: SIGNATURE,
      respondedAt: '2026-11-28T09:00:00.000Z',
    });

    expect(accepted).not.toContain('id="accept-form"');
    expect(accepted).toContain('Accepted by <strong>Arjun Mehta</strong>');
    expect(accepted).toContain(`d="${SIGNATURE}"`);
  });
});
