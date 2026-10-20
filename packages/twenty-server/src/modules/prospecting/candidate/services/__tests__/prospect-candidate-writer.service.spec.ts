import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { ProspectCandidateWriterService } from 'src/modules/prospecting/candidate/services/prospect-candidate-writer.service';
import { type DiscoveredCompany } from 'src/modules/prospecting/candidate/types/discovered-company.type';
import { type ProspectIdentityLookupService } from 'src/modules/prospecting/identity-resolution/services/prospect-identity-lookup.service';
import { buildCompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';
import { type ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';
const CAMPAIGN_ID = '20202020-0000-4000-8000-000000000002';
const LEI = '254900NM2JQUVESOI109';

const buildDiscoveredCompany = (
  record: Partial<DiscoveredCompany['record']>,
): DiscoveredCompany => {
  const fullRecord = {
    providerId: 'gleif',
    externalId: record.externalId ?? 'external-1',
    sourceUrl: null,
    licenceId: 'CC0-1.0',
    retrievedAt: '2026-10-20T00:00:00.000Z',
    name: 'Acme Pte Ltd',
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
    ...record,
  };

  return {
    record: fullRecord,
    sources: [
      {
        providerId: fullRecord.providerId,
        externalId: fullRecord.externalId,
        sourceUrl: null,
        licenceId: 'CC0-1.0',
        retrievedAt: fullRecord.retrievedAt,
      },
    ],
  };
};

describe('ProspectCandidateWriterService', () => {
  let findCampaignCandidates: jest.Mock;
  let findCompanies: jest.Mock;
  let insert: jest.Mock;
  let update: jest.Mock;
  let getRepository: jest.Mock;
  let service: ProspectCandidateWriterService;

  const write = (discoveredCompanies: DiscoveredCompany[]) =>
    service.writeDiscoveredCompanies({
      workspaceId: WORKSPACE_ID,
      campaignId: CAMPAIGN_ID,
      discoveredCompanies,
      writePermissions: { shouldBypassPermissionChecks: true },
    });

  beforeEach(() => {
    findCampaignCandidates = jest.fn().mockResolvedValue([]);
    findCompanies = jest.fn().mockResolvedValue([]);
    insert = jest.fn().mockResolvedValue({});
    update = jest.fn().mockResolvedValue({ affected: 1 });
    getRepository = jest.fn().mockResolvedValue({ insert, update });

    service = new ProspectCandidateWriterService(
      { getRepository } as unknown as GlobalWorkspaceOrmManager,
      {
        findCampaignCandidates,
        findCompanies,
      } as unknown as ProspectIdentityLookupService,
    );
  });

  it('creates a candidate and links the CRM company it matches, without creating one', async () => {
    findCompanies.mockResolvedValue([
      {
        id: 'company-1',
        identity: buildCompanyIdentity({
          name: 'Acme',
          domain: 'acme.sg',
          country: 'SG',
        }),
      },
    ]);

    const written = await write([
      buildDiscoveredCompany({ domain: 'acme.sg' }),
    ]);

    expect(written[0].outcome).toBe('CREATED');
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      campaignId: CAMPAIGN_ID,
      identityKey: 'domain:SG:acme.sg',
      lifecycleStage: 'DISCOVERED',
      matchStatus: 'CONFIRMED_MATCH',
      matchedCompanyId: 'company-1',
    });
  });

  it('merges a company found again into its candidate', async () => {
    findCampaignCandidates.mockResolvedValue([
      {
        id: 'candidate-1',
        identity: buildCompanyIdentity({ name: 'Acme', lei: LEI }),
        candidate: {
          id: 'candidate-1',
          identityKey: `lei:${LEI}`,
          lei: LEI,
          sources: [],
          domain: { primaryLinkUrl: '' },
        } as unknown as ProspectCandidateWorkspaceEntity,
      },
    ]);

    const written = await write([
      buildDiscoveredCompany({
        providerId: 'wikidata',
        lei: LEI,
        domain: 'acme.sg',
        employeeCount: 120,
      }),
    ]);

    expect(written).toEqual([
      { candidateId: 'candidate-1', outcome: 'MERGED' },
    ]);
    expect(insert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      { id: 'candidate-1' },
      expect.objectContaining({
        domain: expect.objectContaining({ primaryLinkUrl: 'https://acme.sg' }),
        employeeCount: 120,
      }),
    );
  });

  it('sends a namesake of an existing candidate to human review', async () => {
    findCampaignCandidates.mockResolvedValue([
      {
        id: 'candidate-1',
        identity: buildCompanyIdentity({
          name: 'Acme Pte. Ltd.',
          country: 'SG',
        }),
        candidate: {
          id: 'candidate-1',
          identityKey: 'source:gleif:other',
        } as unknown as ProspectCandidateWorkspaceEntity,
      },
    ]);

    await write([buildDiscoveredCompany({ name: 'ACME PRIVATE LIMITED' })]);

    expect(insert.mock.calls[0][0].lifecycleStage).toBe('HUMAN_REVIEW');
  });

  it('merges two records of the same page that describe one company', async () => {
    const written = await write([
      buildDiscoveredCompany({ externalId: 'first', lei: LEI }),
      buildDiscoveredCompany({
        providerId: 'wikidata',
        externalId: 'second',
        lei: LEI,
        employeeCount: 50,
      }),
    ]);

    expect(written.map(({ outcome }) => outcome)).toEqual([
      'CREATED',
      'MERGED',
    ]);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(written[1].candidateId).toBe(written[0].candidateId);
  });

  it('writes with the permissions it is given', async () => {
    await service.writeDiscoveredCompanies({
      workspaceId: WORKSPACE_ID,
      campaignId: CAMPAIGN_ID,
      discoveredCompanies: [buildDiscoveredCompany({})],
      writePermissions: { unionOf: ['role-1'] },
    });

    expect(getRepository).toHaveBeenCalledWith(
      WORKSPACE_ID,
      expect.anything(),
      {
        unionOf: ['role-1'],
      },
    );
  });
});
