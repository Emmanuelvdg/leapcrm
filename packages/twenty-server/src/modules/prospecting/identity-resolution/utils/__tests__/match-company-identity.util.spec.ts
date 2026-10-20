import { buildCompanyIdentityKey } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity-key.util';
import { buildCompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';
import {
  type CompanyIdentityMatch,
  matchCompanyIdentity,
} from 'src/modules/prospecting/identity-resolution/utils/match-company-identity.util';

const LEI_A = '254900NM2JQUVESOI109';
const LEI_B = '254900LNVD4XJPIEYA56';

type IdentityInput = Parameters<typeof buildCompanyIdentity>[0];

const match = (
  incoming: IdentityInput,
  existing: IdentityInput,
): CompanyIdentityMatch['status'] =>
  matchCompanyIdentity({
    identity: buildCompanyIdentity(incoming),
    existingIdentities: [
      { id: 'existing', identity: buildCompanyIdentity(existing) },
    ],
  }).status;

describe('matchCompanyIdentity', () => {
  it.each<
    [string, IdentityInput, IdentityInput, CompanyIdentityMatch['status']]
  >([
    [
      'the same LEI',
      { name: 'Headstand Pte Ltd', lei: LEI_A },
      { name: 'HEADSTAND PTE. LTD.', lei: LEI_A.toLowerCase() },
      'CONFIRMED_MATCH',
    ],
    [
      'the same number from the same registry',
      {
        name: 'Headstand',
        registrationAuthority: 'RA000523',
        registrationNumber: '201222649R',
      },
      {
        name: 'Something else entirely',
        registrationAuthority: 'RA000523',
        registrationNumber: '201222649r',
      },
      'CONFIRMED_MATCH',
    ],
    [
      'the same domain in the same country',
      { name: 'Acme', domain: 'https://www.acme.sg/', country: 'SG' },
      { name: 'Acme Asia', domain: 'acme.sg', country: 'Singapore' },
      'CONFIRMED_MATCH',
    ],
    [
      'the same domain with one country unknown',
      { name: 'Acme', domain: 'acme.com', country: 'SG' },
      { name: 'Acme', domain: 'https://acme.com' },
      'PROBABLE_MATCH',
    ],
    [
      'the same name and country only',
      { name: 'Acme Pte. Ltd.', country: 'SG' },
      { name: 'ACME PRIVATE LIMITED', country: 'SG' },
      'PROBABLE_MATCH',
    ],
    [
      'the same number from two different registries',
      {
        name: 'Acme',
        registrationAuthority: 'RA000585',
        registrationNumber: '01234567',
      },
      {
        name: 'Other',
        registrationAuthority: 'RA000999',
        registrationNumber: '01234567',
      },
      'DISTINCT',
    ],
    [
      'different LEIs despite a shared domain and name',
      { name: 'Acme', lei: LEI_A, domain: 'acme.com', country: 'SG' },
      { name: 'Acme', lei: LEI_B, domain: 'acme.com', country: 'SG' },
      'DISTINCT',
    ],
    [
      'the same domain in different countries',
      { name: 'Acme', domain: 'acme.com', country: 'SG' },
      { name: 'Acme', domain: 'acme.com', country: 'GB' },
      'DISTINCT',
    ],
    [
      'the same name in different countries',
      { name: 'Acme Ltd', country: 'GB', domain: 'acme.co.uk' },
      { name: 'Acme Pte Ltd', country: 'SG' },
      'DISTINCT',
    ],
    [
      'a name-only record whose namesake is in another country',
      { name: 'Acme Ltd', country: 'GB' },
      { name: 'Acme Pte Ltd', country: 'SG' },
      'INSUFFICIENT_INFORMATION',
    ],
    [
      'the same name with different domains',
      { name: 'Acme', domain: 'acme.sg', country: 'SG' },
      { name: 'Acme', domain: 'acme-tools.sg', country: 'SG' },
      'DISTINCT',
    ],
    [
      'look-alike names',
      { name: 'Acme Payments', country: 'SG', domain: 'acmepay.sg' },
      { name: 'Acme Payment', country: 'SG', domain: 'acmepayment.sg' },
      'DISTINCT',
    ],
    [
      'a name-only record that matches nothing',
      { name: 'Unknown Trading', country: 'SG' },
      { name: 'Acme', country: 'SG' },
      'INSUFFICIENT_INFORMATION',
    ],
  ])('treats %s as %s', (_label, incoming, existing, expectedStatus) => {
    expect(match(incoming, existing)).toBe(expectedStatus);
  });

  it('prefers a confirmed match over an earlier probable one', () => {
    const result = matchCompanyIdentity({
      identity: buildCompanyIdentity({
        name: 'Acme',
        lei: LEI_A,
        country: 'SG',
      }),
      existingIdentities: [
        {
          id: 'a-probable',
          identity: buildCompanyIdentity({ name: 'Acme', country: 'SG' }),
        },
        {
          id: 'b-confirmed',
          identity: buildCompanyIdentity({ name: 'Acme Asia', lei: LEI_A }),
        },
      ],
    });

    expect(result).toEqual({
      status: 'CONFIRMED_MATCH',
      matchedId: 'b-confirmed',
    });
  });

  it('ignores identifiers that fail validation', () => {
    expect(
      match(
        { name: 'Acme', lei: '254900NM2JQUVESOI108' },
        { name: 'Other', lei: '254900NM2JQUVESOI108' },
      ),
    ).toBe('INSUFFICIENT_INFORMATION');
  });
});

describe('buildCompanyIdentityKey', () => {
  const buildKey = (input: IdentityInput) =>
    buildCompanyIdentityKey({
      identity: buildCompanyIdentity(input),
      providerId: 'wikidata',
      externalId: 'Q42',
    });

  it('uses the strongest identifier available', () => {
    expect(
      buildKey({
        name: 'Acme',
        lei: LEI_A,
        registrationAuthority: 'RA000523',
        registrationNumber: '201222649R',
      }),
    ).toBe(`lei:${LEI_A}`);
    expect(
      buildKey({
        name: 'Acme',
        registrationAuthority: 'RA000523',
        registrationNumber: '201222649R',
        domain: 'acme.sg',
      }),
    ).toBe('reg:RA000523:201222649R');
    expect(buildKey({ name: 'Acme', domain: 'acme.sg', country: 'SG' })).toBe(
      'domain:SG:acme.sg',
    );
  });

  it('falls back to the source record when there is no identifier', () => {
    expect(buildKey({ name: 'Acme', country: 'SG' })).toBe(
      'source:wikidata:Q42',
    );
  });
});
