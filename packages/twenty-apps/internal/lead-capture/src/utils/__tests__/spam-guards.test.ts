import { describe, expect, it } from 'vitest';

import {
  getVisitorIp,
  hashVisitor,
  isRequestFromAllowedSite,
  isSubmittedTooFast,
  parseAllowedDomains,
} from 'src/utils/spam-guards';

describe('parseAllowedDomains', () => {
  it('normalizes a free-text list', () => {
    expect(
      parseAllowedDomains(
        'https://www.Acme.example/contact, shop.acme.example;; ',
      ),
    ).toEqual(['acme.example', 'shop.acme.example']);
    expect(parseAllowedDomains(null)).toEqual([]);
  });
});

describe('isRequestFromAllowedSite', () => {
  const allowedDomains = ['acme.example'];

  it('allows any site when no list is set', () => {
    expect(
      isRequestFromAllowedSite({
        allowedDomains: [],
        origin: 'https://evil.example',
        referer: null,
        formHost: null,
      }),
    ).toBe(true);
  });

  it('allows listed sites and their subdomains', () => {
    expect(
      isRequestFromAllowedSite({
        allowedDomains,
        origin: 'https://www.acme.example',
        referer: null,
        formHost: null,
      }),
    ).toBe(true);
    expect(
      isRequestFromAllowedSite({
        allowedDomains,
        origin: null,
        referer: 'https://blog.acme.example/post',
        formHost: null,
      }),
    ).toBe(true);
  });

  it('refuses other sites, but not the hosted form page itself', () => {
    expect(
      isRequestFromAllowedSite({
        allowedDomains,
        origin: 'https://notacme.example',
        referer: null,
        formHost: 'crm.example',
      }),
    ).toBe(false);
    expect(
      isRequestFromAllowedSite({
        allowedDomains,
        origin: 'https://acra.crm.example',
        referer: null,
        formHost: 'acra.crm.example:443',
      }),
    ).toBe(true);
  });

  it('lets server-to-server posts through', () => {
    expect(
      isRequestFromAllowedSite({
        allowedDomains,
        origin: null,
        referer: null,
        formHost: null,
      }),
    ).toBe(true);
  });
});

describe('isSubmittedTooFast', () => {
  it('flags forms sent within three seconds of loading', () => {
    expect(isSubmittedTooFast({ renderedAtMs: 1_000, nowMs: 2_500 })).toBe(
      true,
    );
    expect(isSubmittedTooFast({ renderedAtMs: 1_000, nowMs: 9_000 })).toBe(
      false,
    );
    expect(isSubmittedTooFast({ renderedAtMs: null, nowMs: 9_000 })).toBe(
      false,
    );
  });
});

describe('visitor identification', () => {
  it('reads the client IP from proxy headers', () => {
    expect(getVisitorIp({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })).toBe(
      '203.0.113.7',
    );
    expect(
      getVisitorIp({
        'x-forwarded-for': '203.0.113.7',
        'x-real-ip': '1.1.1.1',
        'cf-connecting-ip': '198.51.100.2',
      }),
    ).toBe('203.0.113.7');
    expect(
      getVisitorIp({
        'cf-connecting-ip': '198.51.100.2',
        'x-real-ip': '1.1.1.1',
      }),
    ).toBe('198.51.100.2');
    expect(getVisitorIp({})).toBeNull();
  });

  it('hashes the visitor per form without keeping the IP', () => {
    const hash = hashVisitor({
      ip: '203.0.113.7',
      userAgent: 'UA',
      formId: 'f1',
    });

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('203');
    expect(
      hashVisitor({ ip: '203.0.113.7', userAgent: 'UA', formId: 'f2' }),
    ).not.toBe(hash);
    expect(hashVisitor({ ip: null, userAgent: 'UA', formId: 'f1' })).toBeNull();
  });
});
