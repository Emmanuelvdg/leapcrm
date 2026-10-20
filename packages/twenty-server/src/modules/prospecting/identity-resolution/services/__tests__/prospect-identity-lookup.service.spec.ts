import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { ProspectIdentityLookupService } from 'src/modules/prospecting/identity-resolution/services/prospect-identity-lookup.service';
import { buildNameLookupPattern } from 'src/modules/prospecting/identity-resolution/utils/build-company-lookup-patterns.util';
import { buildCompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';
import { matchCompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/match-company-identity.util';

const WORKSPACE_ID = '20202020-0000-4000-8000-000000000001';
const CAMPAIGN_ID = '20202020-0000-4000-8000-000000000002';

describe('ProspectIdentityLookupService', () => {
  let find: jest.Mock;
  let getRepository: jest.Mock;
  let service: ProspectIdentityLookupService;

  beforeEach(() => {
    find = jest.fn().mockResolvedValue([]);
    getRepository = jest.fn().mockResolvedValue({ find });
    service = new ProspectIdentityLookupService({
      getRepository,
    } as unknown as GlobalWorkspaceOrmManager);
  });

  it('only looks inside the campaign', async () => {
    await service.findCampaignCandidates({
      workspaceId: WORKSPACE_ID,
      campaignId: CAMPAIGN_ID,
      identities: [
        buildCompanyIdentity({
          name: 'Headstand Pte Ltd',
          lei: '254900NM2JQUVESOI109',
          registrationAuthority: 'RA000523',
          registrationNumber: '201222649R',
          domain: 'headstand.sg',
          country: 'SG',
        }),
      ],
    });

    const [{ where }] = find.mock.calls[0];

    expect(where).toHaveLength(4);
    expect(
      where.every(
        (condition: { campaignId?: string }) =>
          condition.campaignId === CAMPAIGN_ID,
      ),
    ).toBe(true);
  });

  it('finds an existing CRM company that the matcher then confirms', async () => {
    find.mockResolvedValue([
      {
        id: 'company-1',
        name: 'Acme Asia',
        domainName: { primaryLinkUrl: 'https://www.acme.sg' },
        address: { addressCountry: 'Singapore' },
      },
    ]);

    const identity = buildCompanyIdentity({
      name: 'Acme Pte Ltd',
      domain: 'acme.sg',
      country: 'SG',
    });

    const companies = await service.findCompanies({
      workspaceId: WORKSPACE_ID,
      identities: [identity],
    });

    expect(
      matchCompanyIdentity({ identity, existingIdentities: companies }),
    ).toEqual({ status: 'CONFIRMED_MATCH', matchedId: 'company-1' });
  });

  it('does not query when there is nothing to look up', async () => {
    const candidates = await service.findCampaignCandidates({
      workspaceId: WORKSPACE_ID,
      campaignId: CAMPAIGN_ID,
      identities: [buildCompanyIdentity({ name: null })],
    });

    expect(candidates).toEqual([]);
    expect(getRepository).not.toHaveBeenCalled();
  });
});

describe('buildNameLookupPattern', () => {
  it('tolerates punctuation and legal forms between words', () => {
    expect(buildNameLookupPattern('ACME HOLDINGS')).toBe('acme%holdings%');
  });

  it('escapes LIKE wildcards in the name', () => {
    expect(buildNameLookupPattern('100% PURE_CO')).toBe('100\\%%pure\\_co%');
  });
});
