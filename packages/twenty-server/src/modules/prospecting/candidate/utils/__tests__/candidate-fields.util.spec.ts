import { type DiscoveredCompany } from 'src/modules/prospecting/candidate/types/discovered-company.type';
import {
  buildNewProspectCandidate,
  buildProspectCandidateMergeUpdate,
} from 'src/modules/prospecting/candidate/utils/build-prospect-candidate-fields.util';
import { normalizeCustomerImportRow } from 'src/modules/prospecting/candidate/utils/normalize-customer-import-row.util';
import { buildCompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';
import { type ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

const SOURCE = {
  providerId: 'wikidata',
  externalId: 'Q1',
  sourceUrl: 'https://www.wikidata.org/wiki/Q1',
  licenceId: 'CC0-1.0',
  retrievedAt: '2026-10-20T00:00:00.000Z',
};

const buildDiscoveredCompany = (
  record: Partial<DiscoveredCompany['record']>,
  sources = [SOURCE],
): DiscoveredCompany => ({
  record: {
    ...SOURCE,
    name: 'Acme Pte Ltd',
    domain: 'acme.sg',
    countryCode: 'SG',
    region: null,
    registrationAuthority: null,
    registrationNumber: null,
    lei: null,
    industry: 'Payments',
    industryCode: { scheme: 'SSIC', code: '62011' },
    employeeCount: 120,
    description: 'Payments company',
    ...record,
  },
  sources,
});

describe('buildNewProspectCandidate', () => {
  it('stores normalised identifiers, provenance and the CRM match', () => {
    const discoveredCompany = buildDiscoveredCompany({});

    const candidate = buildNewProspectCandidate({
      id: 'candidate-1',
      campaignId: 'campaign-1',
      discoveredCompany,
      identity: buildCompanyIdentity({
        name: 'Acme Pte Ltd',
        domain: 'https://www.acme.sg/',
        country: 'SG',
      }),
      identityKey: 'domain:SG:acme.sg',
      companyMatch: { status: 'CONFIRMED_MATCH', matchedId: 'company-1' },
      lifecycleStage: 'DISCOVERED',
    });

    expect(candidate).toMatchObject({
      domain: { primaryLinkUrl: 'https://acme.sg' },
      country: 'SG',
      industryCode: 'SSIC 62011',
      sources: [SOURCE],
      matchStatus: 'CONFIRMED_MATCH',
      matchedCompanyId: 'company-1',
    });
  });
});

describe('buildProspectCandidateMergeUpdate', () => {
  const existingCandidate = {
    lei: null,
    registrationAuthority: null,
    registrationNumber: null,
    domain: { primaryLinkUrl: 'https://acme.sg' },
    country: 'SG',
    region: null,
    industry: 'Fintech',
    industryCode: null,
    employeeCount: null,
    description: null,
    matchedCompanyId: null,
    sources: [SOURCE],
  } as unknown as ProspectCandidateWorkspaceEntity;

  it('adds what the candidate lacks without replacing what it has', () => {
    const gleifSource = { ...SOURCE, providerId: 'gleif', externalId: 'LEI1' };

    const update = buildProspectCandidateMergeUpdate({
      candidate: existingCandidate,
      discoveredCompany: buildDiscoveredCompany(
        { industry: 'Payments', employeeCount: 120, domain: 'other.sg' },
        [gleifSource],
      ),
      identity: buildCompanyIdentity({
        name: 'Acme',
        lei: '254900NM2JQUVESOI109',
        domain: 'other.sg',
        country: 'SG',
      }),
      companyMatch: { status: 'DISTINCT' },
    });

    expect(update).toEqual({
      lei: '254900NM2JQUVESOI109',
      industryCode: 'SSIC 62011',
      employeeCount: 120,
      description: 'Payments company',
      sources: [SOURCE, gleifSource],
    });
  });

  it('does not list the same source twice', () => {
    const update = buildProspectCandidateMergeUpdate({
      candidate: existingCandidate,
      discoveredCompany: buildDiscoveredCompany({}),
      identity: buildCompanyIdentity({ name: 'Acme', country: 'SG' }),
      companyMatch: { status: 'DISTINCT' },
    });

    expect(update.sources).toBeUndefined();
  });
});

describe('normalizeCustomerImportRow', () => {
  const importedAt = '2026-10-20T00:00:00.000Z';

  it('normalises the row and credits the customer file', () => {
    const { record, sources } = normalizeCustomerImportRow({
      row: {
        name: ' Acme Pte Ltd ',
        domain: 'https://www.acme.sg/contact',
        country: 'Singapore',
        employeeCount: 40,
      },
      importedAt,
    });

    expect(record).toMatchObject({
      providerId: 'customer-import',
      licenceId: 'customer-provided',
      name: 'Acme Pte Ltd',
      domain: 'acme.sg',
      countryCode: 'SG',
      employeeCount: 40,
    });
    expect(sources[0].providerId).toBe('customer-import');
  });

  it('gives the same row the same id on every import', () => {
    const firstImport = normalizeCustomerImportRow({
      row: { name: 'Acme', country: 'SG' },
      importedAt,
    });
    const secondImport = normalizeCustomerImportRow({
      row: { name: 'ACME ', country: 'sg' },
      importedAt: '2026-11-01T00:00:00.000Z',
    });

    expect(secondImport.record.externalId).toBe(firstImport.record.externalId);
  });
});
