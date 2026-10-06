import { describe, expect, it } from 'vitest';

import {
  collapseWhitespace,
  toCompanyNameKey,
  toDomainKey,
  toEmailKey,
  toLinkedinKey,
  toPersonNameKey,
} from 'src/utils/match-keys';

describe('collapseWhitespace', () => {
  it('trims and collapses inner runs of whitespace', () => {
    expect(collapseWhitespace('  Acme \t  Trading\n ')).toBe('Acme Trading');
  });
});

describe('toCompanyNameKey', () => {
  it('ignores case, punctuation and trailing legal forms', () => {
    expect(toCompanyNameKey('Acme Pte. Ltd.')).toBe('acme');
    expect(toCompanyNameKey('  ACME  ')).toBe('acme');
    expect(toCompanyNameKey('Acme Private Limited')).toBe('acme');
    expect(toCompanyNameKey('Acme Sdn. Bhd.')).toBe('acme');
  });

  it('keeps legal-form words that are not at the end', () => {
    expect(toCompanyNameKey('Co-Op Trading Ltd')).toBe('co op trading');
  });

  it('never strips the last remaining word', () => {
    expect(toCompanyNameKey('Company')).toBe('company');
  });

  it('treats & and "and" alike and drops accents', () => {
    expect(toCompanyNameKey('Smith & Sons')).toBe(
      toCompanyNameKey('Smith and Sons'),
    );
    expect(toCompanyNameKey('Café Noir')).toBe('cafe noir');
  });

  it('keeps non-latin names', () => {
    expect(toCompanyNameKey('新加坡贸易有限公司')).toBe('新加坡贸易有限公司');
  });

  it('returns null for names too short to compare', () => {
    expect(toCompanyNameKey('AB')).toBeNull();
    expect(toCompanyNameKey(null)).toBeNull();
  });
});

describe('toDomainKey', () => {
  it('reduces a URL to its bare host', () => {
    expect(toDomainKey('https://www.Acme.com/about?x=1')).toBe('acme.com');
    expect(toDomainKey('acme.com')).toBe('acme.com');
    expect(toDomainKey('http://acme.com:8080/')).toBe('acme.com');
  });

  it('keeps the page path for shared social hosts', () => {
    expect(toDomainKey('https://www.facebook.com/acmesg')).toBe(
      'facebook.com/acmesg',
    );
    expect(toDomainKey('https://facebook.com')).toBeNull();
  });

  it('returns null for values that are not domains', () => {
    expect(toDomainKey('localhost')).toBeNull();
    expect(toDomainKey('')).toBeNull();
  });
});

describe('toEmailKey', () => {
  it('lowercases and trims emails', () => {
    expect(toEmailKey(' Jane@Acme.COM ')).toBe('jane@acme.com');
    expect(toEmailKey('not-an-email')).toBeNull();
  });
});

describe('toLinkedinKey', () => {
  it('strips scheme, www, query and trailing slashes', () => {
    expect(
      toLinkedinKey('https://www.linkedin.com/in/jane-tan/?utm_source=x'),
    ).toBe('linkedin.com/in/jane-tan');
    expect(toLinkedinKey('https://example.com/in/jane')).toBeNull();
  });
});

describe('toPersonNameKey', () => {
  it('joins first and last name without case or spacing differences', () => {
    expect(toPersonNameKey(' Jane ', 'TAN')).toBe(toPersonNameKey('jane', 'Tan'));
    expect(toPersonNameKey('J', null)).toBeNull();
  });
});
