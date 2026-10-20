import {
  buildDiscoveryStages,
  DIRECTORY_DISCOVERY_STAGE_ID,
} from 'src/modules/prospecting/discovery/utils/build-discovery-stages.util';
import {
  buildDiscoverPageJob,
  parseDiscoverPageJobInput,
} from 'src/modules/prospecting/discovery/utils/discover-page-job.util';
import { filterDiscoveryRecords } from 'src/modules/prospecting/discovery/utils/filter-discovery-records.util';
import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';
import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const buildRecord = (
  overrides: Partial<CompanyDiscoveryRecord>,
): CompanyDiscoveryRecord => ({
  providerId: 'gleif',
  externalId: 'external-1',
  sourceUrl: null,
  licenceId: 'CC0-1.0',
  retrievedAt: '2026-10-20T00:00:00.000Z',
  name: 'Acme',
  domain: null,
  countryCode: 'SG',
  region: null,
  registrationAuthority: null,
  registrationNumber: null,
  lei: null,
  industry: null,
  industryCode: null,
  employeeCount: null,
  description: null,
  ...overrides,
});

describe('buildDiscoveryStages', () => {
  it('reads the directory for every market before calling sources', () => {
    expect(
      buildDiscoveryStages({
        countryCodes: ['SG', 'GB'],
        providerIds: ['gleif', 'wikidata'],
      }),
    ).toEqual([
      { providerId: DIRECTORY_DISCOVERY_STAGE_ID, countryCode: 'SG' },
      { providerId: DIRECTORY_DISCOVERY_STAGE_ID, countryCode: 'GB' },
      { providerId: 'gleif', countryCode: 'SG' },
      { providerId: 'gleif', countryCode: 'GB' },
      { providerId: 'wikidata', countryCode: 'SG' },
      { providerId: 'wikidata', countryCode: 'GB' },
    ]);
  });

  it('uses one worldwide stage per source when no country is targeted', () => {
    expect(
      buildDiscoveryStages({ countryCodes: [], providerIds: ['wikidata'] }),
    ).toEqual([
      { providerId: DIRECTORY_DISCOVERY_STAGE_ID, countryCode: null },
      { providerId: 'wikidata', countryCode: null },
    ]);
  });
});

describe('discover page jobs', () => {
  const buildJob = (pageIndex: number, icpVersion = 1) =>
    buildDiscoverPageJob({
      workspaceId: 'workspace-1',
      campaignId: 'campaign-1',
      icpVersion,
      stage: { providerId: 'gleif', countryCode: 'SG' },
      cursor: pageIndex === 0 ? null : '0:2',
      pageIndex,
    });

  it('gives each page of a stage its own idempotency key', () => {
    expect(buildJob(0).idempotencyKey).toBe(
      'campaign-1:DISCOVER_PAGE:gleif:SG:0:1',
    );
    expect(buildJob(1).idempotencyKey).not.toBe(buildJob(0).idempotencyKey);
    expect(buildJob(0, 2).idempotencyKey).not.toBe(buildJob(0).idempotencyKey);
  });

  it('reads back the input it wrote', () => {
    expect(parseDiscoverPageJobInput(buildJob(1).input)).toEqual({
      providerId: 'gleif',
      countryCode: 'SG',
      cursor: '0:2',
      pageIndex: 1,
    });
  });

  it('rejects malformed input', () => {
    expect(parseDiscoverPageJobInput({ providerId: 'gleif' })).toBeNull();
  });
});

describe('filterDiscoveryRecords', () => {
  const icp = prospectingIcpSchema.parse({
    targetGeographies: [{ countryCode: 'SG' }],
    excludedCountryCodes: ['MY'],
    excludedDomains: ['competitor.com'],
    employeeCountMin: 10,
    employeeCountMax: 500,
  });

  it('drops excluded countries and domains, including subdomains', () => {
    const kept = filterDiscoveryRecords({
      icp,
      records: [
        buildRecord({ externalId: 'kept' }),
        buildRecord({ externalId: 'country', countryCode: 'MY' }),
        buildRecord({ externalId: 'domain', domain: 'competitor.com' }),
        buildRecord({ externalId: 'subdomain', domain: 'sg.competitor.com' }),
      ],
    });

    expect(kept.map(({ externalId }) => externalId)).toEqual(['kept']);
  });

  it('drops known sizes outside the range and keeps unknown sizes', () => {
    const kept = filterDiscoveryRecords({
      icp,
      records: [
        buildRecord({ externalId: 'unknown', employeeCount: null }),
        buildRecord({ externalId: 'small', employeeCount: 5 }),
        buildRecord({ externalId: 'large', employeeCount: 5000 }),
        buildRecord({ externalId: 'fits', employeeCount: 100 }),
      ],
    });

    expect(kept.map(({ externalId }) => externalId)).toEqual([
      'unknown',
      'fits',
    ]);
  });
});
