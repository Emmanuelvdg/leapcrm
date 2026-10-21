import { type GlobalCompanyDirectoryService } from 'src/engine/core-modules/global-company-directory/services/global-company-directory.service';
import { type ClaimedProspectingJob } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type ProspectCampaignCandidateCounterService } from 'src/modules/prospecting/candidate/services/prospect-campaign-candidate-counter.service';
import { type ProspectCandidateWriterService } from 'src/modules/prospecting/candidate/services/prospect-candidate-writer.service';
import { type DiscoveredCompany } from 'src/modules/prospecting/candidate/types/discovered-company.type';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { FixtureDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/fixture/fixture-discovery-provider.service';
import { GleifDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/gleif/gleif-discovery-provider.service';
import { WikidataDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/wikidata/wikidata-discovery-provider.service';
import { DiscoveryPageService } from 'src/modules/prospecting/discovery/services/discovery-page.service';
import { DiscoveryProviderRegistryService } from 'src/modules/prospecting/discovery/services/discovery-provider-registry.service';
import { DIRECTORY_DISCOVERY_STAGE_ID } from 'src/modules/prospecting/discovery/utils/build-discovery-stages.util';
import { type ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';

const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';
const CAMPAIGN_ID = '20202020-0000-4000-8000-000000000002';

const buildCampaign = (
  overrides: Partial<ProspectingCampaignWorkspaceEntity> = {},
) =>
  ({
    id: CAMPAIGN_ID,
    status: 'RUNNING',
    icp: { targetGeographies: [{ countryCode: 'SG' }], keywords: ['payments'] },
    discoverySources: ['fixture', 'gleif'],
    targetCandidateCount: 100,
    candidatesFound: 0,
    icpVersion: 1,
    ...overrides,
  }) as ProspectingCampaignWorkspaceEntity;

const buildClaimedJob = (
  input: Record<string, string | number | null>,
  attempts = 1,
): ClaimedProspectingJob =>
  ({
    lockToken: 'lock',
    job: {
      id: 'job-1',
      workspaceId: WORKSPACE_ID,
      campaignId: CAMPAIGN_ID,
      operation: 'DISCOVER_PAGE',
      attempts,
      maxAttempts: 5,
      input,
    },
  }) as unknown as ClaimedProspectingJob;

const DIRECTORY_COMPANY = {
  globalCompany: {
    id: 'global-1',
    name: 'HEADSTAND PTE. LTD.',
    canonicalDomain: null,
    countryCode: 'SG',
    region: null,
    registrationAuthority: 'RA000523',
    registrationNumber: '201222649R',
    lei: '254900NM2JQUVESOI109',
    industry: null,
    industryCode: null,
    industryCodeScheme: null,
    employeeCount: null,
    description: null,
  },
  sources: [
    {
      providerId: 'gleif',
      externalId: '254900NM2JQUVESOI109',
      sourceUrl: 'https://search.gleif.org/#/record/254900NM2JQUVESOI109',
      licenceId: 'CC0-1.0',
      retrievedAt: new Date('2026-09-01T00:00:00.000Z'),
    },
  ],
};

describe('DiscoveryPageService', () => {
  let registry: DiscoveryProviderRegistryService;
  let gleifProvider: GleifDiscoveryProvider;
  let directory: {
    findPublicCompanies: jest.Mock;
    recordPublicCompany: jest.Mock;
    linkCandidate: jest.Mock;
  };
  let writeDiscoveredCompanies: jest.Mock;
  let refreshCandidatesFound: jest.Mock;
  let service: DiscoveryPageService;

  beforeEach(() => {
    gleifProvider = new GleifDiscoveryProvider({} as SecureHttpClientService);
    registry = new DiscoveryProviderRegistryService(
      { get: () => 'test' } as unknown as TwentyConfigService,
      gleifProvider,
      new WikidataDiscoveryProvider({} as SecureHttpClientService),
      new FixtureDiscoveryProvider(),
    );
    directory = {
      findPublicCompanies: jest.fn().mockResolvedValue([]),
      recordPublicCompany: jest.fn().mockResolvedValue('global-new'),
      linkCandidate: jest.fn().mockResolvedValue(undefined),
    };
    writeDiscoveredCompanies = jest.fn(
      async ({
        discoveredCompanies,
      }: {
        discoveredCompanies: DiscoveredCompany[];
      }) =>
        discoveredCompanies.map((_, index) => ({
          candidateId: `candidate-${index}`,
          outcome: 'CREATED',
        })),
    );
    refreshCandidatesFound = jest.fn().mockResolvedValue(10);

    service = new DiscoveryPageService(
      registry,
      directory as unknown as GlobalCompanyDirectoryService,
      { writeDiscoveredCompanies } as unknown as ProspectCandidateWriterService,
      {
        refreshCandidatesFound,
      } as unknown as ProspectCampaignCandidateCounterService,
    );
  });

  const process = (
    input: Record<string, string | number | null>,
    campaign = buildCampaign(),
    attempts = 1,
  ) =>
    service.processPage({
      workspaceId: WORKSPACE_ID,
      campaign,
      claimedJob: buildClaimedJob(input, attempts),
    });

  it('credits directory companies to their original public sources', async () => {
    directory.findPublicCompanies.mockResolvedValue([DIRECTORY_COMPANY]);

    await process({
      providerId: DIRECTORY_DISCOVERY_STAGE_ID,
      countryCode: 'SG',
      cursor: null,
      pageIndex: 0,
    });

    const [{ discoveredCompanies }] = writeDiscoveredCompanies.mock.calls[0];
    const sourceProviderIds = discoveredCompanies.flatMap(
      ({ sources }: DiscoveredCompany) =>
        sources.map(({ providerId }) => providerId),
    );

    expect(sourceProviderIds).toEqual(['gleif']);
    expect(JSON.stringify(discoveredCompanies)).not.toContain(
      DIRECTORY_DISCOVERY_STAGE_ID,
    );
    expect(directory.recordPublicCompany).not.toHaveBeenCalled();
    expect(directory.linkCandidate).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      candidateId: 'candidate-0',
      globalCompanyId: 'global-1',
    });
  });

  it('moves from the directory to the first source once the directory has nothing more', async () => {
    const outcome = await process({
      providerId: DIRECTORY_DISCOVERY_STAGE_ID,
      countryCode: 'SG',
      cursor: null,
      pageIndex: 0,
    });

    expect(outcome.isCampaignFinished).toBe(false);
    expect(outcome.followUpJobs[0].input).toEqual({
      providerId: 'fixture',
      countryCode: 'SG',
      cursor: null,
      pageIndex: 0,
    });
  });

  it('never shares test records with the directory', async () => {
    await process({
      providerId: 'fixture',
      countryCode: 'SG',
      cursor: null,
      pageIndex: 0,
    });

    expect(writeDiscoveredCompanies).toHaveBeenCalled();
    expect(directory.recordPublicCompany).not.toHaveBeenCalled();
  });

  it('shares public records with the directory and links the candidates', async () => {
    jest.spyOn(gleifProvider, 'search').mockResolvedValue({
      records: [
        {
          providerId: 'gleif',
          externalId: '254900NM2JQUVESOI109',
          sourceUrl: null,
          licenceId: 'CC0-1.0',
          retrievedAt: '2026-10-20T00:00:00.000Z',
          name: 'HEADSTAND PTE. LTD.',
          domain: null,
          countryCode: 'SG',
          region: null,
          registrationAuthority: 'RA000523',
          registrationNumber: '201222649R',
          lei: '254900NM2JQUVESOI109',
          industry: null,
          industryCode: null,
          employeeCount: null,
          description: null,
        },
      ],
      nextCursor: '0:2',
    });

    const outcome = await process({
      providerId: 'gleif',
      countryCode: 'SG',
      cursor: null,
      pageIndex: 0,
    });

    expect(directory.recordPublicCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'gleif',
        sourceRank: 10,
        values: expect.objectContaining({
          lei: '254900NM2JQUVESOI109',
          registrationAuthority: 'RA000523',
        }),
      }),
    );
    expect(directory.linkCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ globalCompanyId: 'global-new' }),
    );
    expect(outcome.followUpJobs[0].input).toMatchObject({
      providerId: 'gleif',
      cursor: '0:2',
      pageIndex: 1,
    });
  });

  it('finishes the campaign once the target is reached', async () => {
    refreshCandidatesFound.mockResolvedValue(100);

    const outcome = await process({
      providerId: 'fixture',
      countryCode: 'SG',
      cursor: null,
      pageIndex: 0,
    });

    expect(outcome.isCampaignFinished).toBe(true);
    expect(outcome.followUpJobs).toEqual([]);
  });

  it('asks for full pages even when few candidates are missing', async () => {
    const search = jest
      .spyOn(gleifProvider, 'search')
      .mockResolvedValue({ records: [], nextCursor: null });

    await process(
      { providerId: 'gleif', countryCode: 'SG', cursor: '0:3', pageIndex: 2 },
      buildCampaign({ candidatesFound: 98 }),
    );

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: '0:3', pageSize: 50 }),
      expect.anything(),
    );
  });

  it('writes only the companies the campaign still needs', async () => {
    const outcome = await process(
      { providerId: 'fixture', countryCode: 'SG', cursor: null, pageIndex: 0 },
      buildCampaign({ candidatesFound: 97 }),
    );

    expect(writeDiscoveredCompanies).toHaveBeenCalledTimes(1);
    expect(
      writeDiscoveredCompanies.mock.calls[0][0].discoveredCompanies,
    ).toHaveLength(3);
    expect(outcome.result).toMatchObject({ recordCount: 25, createdCount: 3 });
  });

  it('keeps writing past companies that were already candidates', async () => {
    writeDiscoveredCompanies.mockImplementationOnce(
      async ({
        discoveredCompanies,
      }: {
        discoveredCompanies: DiscoveredCompany[];
      }) =>
        discoveredCompanies.map((_, index) => ({
          candidateId: `existing-${index}`,
          outcome: 'MERGED',
        })),
    );

    const outcome = await process(
      { providerId: 'fixture', countryCode: 'SG', cursor: null, pageIndex: 0 },
      buildCampaign({ candidatesFound: 97 }),
    );

    expect(writeDiscoveredCompanies).toHaveBeenCalledTimes(2);
    expect(outcome.result).toMatchObject({ createdCount: 3, mergedCount: 3 });
  });

  it('finishes the campaign after the last stage is exhausted', async () => {
    jest
      .spyOn(gleifProvider, 'search')
      .mockResolvedValue({ records: [], nextCursor: null });

    const outcome = await process({
      providerId: 'gleif',
      countryCode: 'SG',
      cursor: '0:9',
      pageIndex: 8,
    });

    expect(outcome.isCampaignFinished).toBe(true);
  });

  it('skips a source that rejects the campaign and carries on', async () => {
    jest
      .spyOn(gleifProvider, 'search')
      .mockRejectedValue(
        new DiscoveryProviderException(
          'bad request',
          'PROVIDER_REQUEST_REJECTED',
        ),
      );

    const outcome = await process(
      { providerId: 'gleif', countryCode: 'SG', cursor: null, pageIndex: 0 },
      buildCampaign({ discoverySources: ['gleif', 'fixture'] }),
    );

    expect(outcome.result.errorCode).toBe('PROVIDER_REQUEST_REJECTED');
    expect(outcome.followUpJobs[0].input).toMatchObject({
      providerId: 'fixture',
    });
  });

  it('retries a temporary source failure until its last attempt', async () => {
    jest
      .spyOn(gleifProvider, 'search')
      .mockRejectedValue(
        new DiscoveryProviderException('busy', 'PROVIDER_RATE_LIMITED'),
      );

    const input = {
      providerId: 'gleif',
      countryCode: 'SG',
      cursor: null,
      pageIndex: 0,
    };

    await expect(process(input)).rejects.toBeInstanceOf(
      DiscoveryProviderException,
    );

    const lastAttemptOutcome = await process(input, buildCampaign(), 5);

    expect(lastAttemptOutcome.result.errorCode).toBe('PROVIDER_RATE_LIMITED');
  });
});
