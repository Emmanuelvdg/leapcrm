import { type ProspectingJobLedgerService } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { type UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { FixtureDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/fixture/fixture-discovery-provider.service';
import { GleifDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/gleif/gleif-discovery-provider.service';
import { WikidataDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/wikidata/wikidata-discovery-provider.service';
import { DiscoveryProviderRegistryService } from 'src/modules/prospecting/discovery/services/discovery-provider-registry.service';
import { type ProspectingExceptionCode } from 'src/modules/prospecting/exceptions/prospecting-exception-code.type';
import { ProspectingException } from 'src/modules/prospecting/exceptions/prospecting.exception';
import { ProspectingCampaignService } from 'src/modules/prospecting/services/prospecting-campaign.service';
import { type ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';

const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';
const USER_WORKSPACE_ID = '20202020-0000-4000-8000-000000000002';
const CAMPAIGN_ID = '20202020-0000-4000-8000-000000000003';
const ROLE_ID = '20202020-0000-4000-8000-000000000004';

const buildCampaign = (
  overrides: Partial<ProspectingCampaignWorkspaceEntity> = {},
) =>
  ({
    id: CAMPAIGN_ID,
    status: 'DRAFT',
    icp: { targetGeographies: [{ countryCode: 'SG' }] },
    discoverySources: null,
    targetCandidateCount: 100,
    icpVersion: 1,
    ...overrides,
  }) as ProspectingCampaignWorkspaceEntity;

describe('ProspectingCampaignService', () => {
  let service: ProspectingCampaignService;
  let campaignRepository: { findOne: jest.Mock; update: jest.Mock };
  let getRepository: jest.Mock;
  let ledgerService: {
    createJobs: jest.Mock;
    holdCampaignJobs: jest.Mock;
    releaseCampaignJobs: jest.Mock;
    cancelCampaignJobs: jest.Mock;
  };

  const actionArgs = {
    workspaceId: WORKSPACE_ID,
    userWorkspaceId: USER_WORKSPACE_ID,
    campaignId: CAMPAIGN_ID,
  };

  const givenCampaign = (campaign: ProspectingCampaignWorkspaceEntity | null) =>
    campaignRepository.findOne.mockResolvedValue(campaign);

  const expectProspectingError = async (
    action: Promise<unknown>,
    code: ProspectingExceptionCode,
  ) => {
    await expect(action).rejects.toBeInstanceOf(ProspectingException);
    await expect(action).rejects.toMatchObject({ code });
  };

  beforeEach(() => {
    campaignRepository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    getRepository = jest.fn().mockResolvedValue(campaignRepository);
    ledgerService = {
      createJobs: jest.fn().mockResolvedValue([]),
      holdCampaignJobs: jest.fn().mockResolvedValue(0),
      releaseCampaignJobs: jest.fn().mockResolvedValue(0),
      cancelCampaignJobs: jest.fn().mockResolvedValue(0),
    };

    service = new ProspectingCampaignService(
      {
        executeInWorkspaceContext: jest.fn((callback: () => unknown) =>
          callback(),
        ),
        getRepository,
      } as unknown as GlobalWorkspaceOrmManager,
      {
        getRoleIdForUserWorkspace: jest.fn().mockResolvedValue(ROLE_ID),
      } as unknown as UserRoleService,
      ledgerService as unknown as ProspectingJobLedgerService,
      new DiscoveryProviderRegistryService(
        { get: () => 'test' } as unknown as TwentyConfigService,
        new GleifDiscoveryProvider({} as SecureHttpClientService),
        new WikidataDiscoveryProvider({} as SecureHttpClientService),
        new FixtureDiscoveryProvider(),
      ),
    );
  });

  it('starts a draft campaign with the caller role permissions', async () => {
    givenCampaign(buildCampaign());

    const result = await service.start(actionArgs);

    expect(result).toEqual({ campaignId: CAMPAIGN_ID, status: 'RUNNING' });
    expect(getRepository).toHaveBeenCalledWith(
      WORKSPACE_ID,
      expect.anything(),
      {
        unionOf: [ROLE_ID],
      },
    );
    expect(campaignRepository.update).toHaveBeenCalledWith(
      { id: CAMPAIGN_ID, status: 'DRAFT' },
      {
        status: 'RUNNING',
        lastRunAt: expect.any(Date),
        discoverySources: ['gleif'],
      },
    );
  });

  it('plans the first discovery job, reading the directory first', async () => {
    givenCampaign(buildCampaign());

    await service.start(actionArgs);

    expect(ledgerService.createJobs).toHaveBeenCalledWith([
      expect.objectContaining({
        campaignId: CAMPAIGN_ID,
        operation: 'DISCOVER_PAGE',
        input: {
          providerId: 'internal-directory',
          countryCode: 'SG',
          cursor: null,
          pageIndex: 0,
        },
      }),
    ]);
  });

  it('plans again on resume when no job was on hold', async () => {
    givenCampaign(buildCampaign({ status: 'PAUSED' }));

    await service.resume(actionArgs);

    expect(ledgerService.createJobs).toHaveBeenCalledTimes(1);
  });

  it('keeps the discovery sources the user chose', async () => {
    givenCampaign(buildCampaign({ discoverySources: ['wikidata', 'fixture'] }));

    await service.start(actionArgs);

    expect(campaignRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ discoverySources: ['wikidata', 'fixture'] }),
    );
  });

  it('refuses to start with a discovery source that does not exist', async () => {
    givenCampaign(buildCampaign({ discoverySources: ['made-up-source'] }));

    await expectProspectingError(
      service.start(actionArgs),
      'CAMPAIGN_NOT_STARTABLE',
    );
  });

  it('refuses to start when no discovery source covers the ICP', async () => {
    givenCampaign(
      buildCampaign({
        icp: { industryCodes: [{ scheme: 'NAICS', code: '5112' }] },
      }),
    );

    await expect(service.start(actionArgs)).rejects.toThrow(
      'no discovery source covers this ICP',
    );
  });

  it('refuses to start a campaign whose ICP is invalid', async () => {
    givenCampaign(
      buildCampaign({ icp: { targetGeographies: [{ countryCode: 'XX' }] } }),
    );

    await expectProspectingError(
      service.start(actionArgs),
      'CAMPAIGN_NOT_STARTABLE',
    );
    expect(campaignRepository.update).not.toHaveBeenCalled();
  });

  it('refuses to start a campaign without a target number of candidates', async () => {
    givenCampaign(buildCampaign({ targetCandidateCount: null }));

    await expectProspectingError(
      service.start(actionArgs),
      'CAMPAIGN_NOT_STARTABLE',
    );
  });

  it('refuses to start a campaign that is already running', async () => {
    givenCampaign(buildCampaign({ status: 'RUNNING' }));

    await expectProspectingError(
      service.start(actionArgs),
      'INVALID_CAMPAIGN_STATUS_TRANSITION',
    );
  });

  it('reports a missing campaign', async () => {
    givenCampaign(null);

    await expectProspectingError(
      service.start(actionArgs),
      'CAMPAIGN_NOT_FOUND',
    );
  });

  it('reports a concurrent status change instead of overwriting it', async () => {
    givenCampaign(buildCampaign({ status: 'RUNNING' }));
    campaignRepository.update.mockResolvedValue({ affected: 0 });

    await expectProspectingError(
      service.pause(actionArgs),
      'CAMPAIGN_STATUS_CONFLICT',
    );
    expect(ledgerService.holdCampaignJobs).not.toHaveBeenCalled();
  });

  it('pauses a running campaign and holds its pending jobs', async () => {
    givenCampaign(buildCampaign({ status: 'RUNNING' }));

    const result = await service.pause(actionArgs);

    expect(result.status).toBe('PAUSED');
    expect(ledgerService.holdCampaignJobs).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      campaignId: CAMPAIGN_ID,
    });
  });

  it('refuses to pause a draft campaign', async () => {
    givenCampaign(buildCampaign({ status: 'DRAFT' }));

    await expectProspectingError(
      service.pause(actionArgs),
      'INVALID_CAMPAIGN_STATUS_TRANSITION',
    );
  });

  it('resumes a paused campaign and releases its jobs', async () => {
    givenCampaign(buildCampaign({ status: 'PAUSED' }));

    const result = await service.resume(actionArgs);

    expect(result.status).toBe('RUNNING');
    expect(ledgerService.releaseCampaignJobs).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      campaignId: CAMPAIGN_ID,
    });
  });

  it('does not resume a paused campaign whose ICP became invalid', async () => {
    givenCampaign(buildCampaign({ status: 'PAUSED', icp: null }));

    await expectProspectingError(
      service.resume(actionArgs),
      'CAMPAIGN_NOT_STARTABLE',
    );
    expect(ledgerService.releaseCampaignJobs).not.toHaveBeenCalled();
  });

  it('does not treat start as resume', async () => {
    givenCampaign(buildCampaign({ status: 'PAUSED' }));

    await expectProspectingError(
      service.start(actionArgs),
      'INVALID_CAMPAIGN_STATUS_TRANSITION',
    );
  });

  it('cancels a campaign and its pending and running jobs', async () => {
    givenCampaign(buildCampaign({ status: 'PAUSED' }));

    const result = await service.cancel(actionArgs);

    expect(result.status).toBe('CANCELLED');
    expect(ledgerService.cancelCampaignJobs).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      campaignId: CAMPAIGN_ID,
    });
  });

  it('refuses to cancel a completed campaign', async () => {
    givenCampaign(buildCampaign({ status: 'COMPLETED' }));

    await expectProspectingError(
      service.cancel(actionArgs),
      'INVALID_CAMPAIGN_STATUS_TRANSITION',
    );
    expect(ledgerService.cancelCampaignJobs).not.toHaveBeenCalled();
  });
});
