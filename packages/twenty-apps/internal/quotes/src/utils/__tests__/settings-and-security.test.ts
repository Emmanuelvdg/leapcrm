import { describe, expect, it } from 'vitest';

import { nextQuoteNumber } from 'src/utils/quote-number';
import { needsApproval, readQuoteSettings } from 'src/utils/quote-settings';
import {
  getVisitorIp,
  sanitizeSignaturePath,
  tokensMatch,
} from 'src/utils/security';

describe('readQuoteSettings', () => {
  it('falls back to defaults for empty or invalid values', () => {
    const settings = readQuoteSettings(
      (name) =>
        ({
          DEFAULT_CURRENCY: 'rupees',
          DEFAULT_TAX_SCHEME: 'vat',
          BRAND_COLOR: 'orange',
          QUOTE_VALID_DAYS: '',
          LOGO_URL: 'javascript:alert(1)',
          SELLER_NAME: '  ',
        })[name],
    );

    expect(settings.defaultCurrency).toBe('INR');
    expect(settings.defaultTaxScheme).toBe('VAT');
    expect(settings.brandColor).toBe('#F16205');
    expect(settings.validDays).toBe(30);
    expect(settings.logoUrl).toBeNull();
    expect(settings.sellerName).toBeNull();
    expect(settings.approvalThreshold).toBe(10);
  });

  it('normalizes the approver list', () => {
    const settings = readQuoteSettings(
      (name) =>
        ({
          APPROVER_EMAILS:
            'Ravi@Acme.example; asha@acme.example,, not-an-email',
          DISCOUNT_APPROVAL_THRESHOLD: '15',
        })[name],
    );

    expect(settings.approverEmails).toEqual([
      'ravi@acme.example',
      'asha@acme.example',
    ]);
    expect(settings.approvalThreshold).toBe(15);
  });
});

describe('needsApproval', () => {
  it('only applies above the threshold and when approvers are named', () => {
    const settings = { approvalThreshold: 10, approverEmails: ['a@b.example'] };

    expect(needsApproval(10, settings)).toBe(false);
    expect(needsApproval(10.5, settings)).toBe(true);
    expect(needsApproval(50, { ...settings, approverEmails: [] })).toBe(false);
  });
});

describe('nextQuoteNumber', () => {
  it('continues the sequence for the year and ignores other prefixes', () => {
    expect(
      nextQuoteNumber({
        prefix: 'Q',
        year: 2026,
        existingNumbers: [
          'Q-2026-0009',
          'Q-2026-0012',
          'Q-2025-0400',
          'X',
          null,
        ],
      }),
    ).toBe('Q-2026-0013');
    expect(
      nextQuoteNumber({ prefix: 'Q', year: 2027, existingNumbers: [] }),
    ).toBe('Q-2027-0001');
  });
});

describe('security helpers', () => {
  it('accepts drawn signature paths and refuses anything else', () => {
    expect(sanitizeSignaturePath('M10.5 20 L30 40.2 L50 60')).toBe(
      'M10.5 20 L30 40.2 L50 60',
    );
    expect(sanitizeSignaturePath('M10 20')).toBeNull();
    expect(
      sanitizeSignaturePath('M10 20 L30 40"/><script>alert(1)</script>'),
    ).toBeNull();
    expect(sanitizeSignaturePath(42)).toBeNull();
  });

  it('compares link keys exactly', () => {
    expect(tokensMatch('abc123', 'abc123')).toBe(true);
    expect(tokensMatch('abc123', 'abc124')).toBe(false);
    expect(tokensMatch('abc123', 'abc')).toBe(false);
    expect(tokensMatch(null, '')).toBe(false);
  });

  it('prefers the proxy-set forwarded address', () => {
    expect(
      getVisitorIp({
        'x-forwarded-for': '203.0.113.7, 10.0.0.1',
        'x-real-ip': '1.1.1.1',
      }),
    ).toBe('203.0.113.7');
    expect(getVisitorIp({})).toBeNull();
  });
});
