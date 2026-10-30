import { AxiosError, type AxiosResponse } from 'axios';

import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { mockCompaniesHouseAdvancedSearchResponse } from 'src/modules/prospecting/discovery/providers/companies-house/__mocks__/companies-house-advanced-search-response';
import { CompaniesHouseDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/companies-house/companies-house-discovery-provider.service';
import { type DiscoveryRequest } from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const CONTEXT = {
  workspaceId: '20202020-0000-4000-8000-000000000001',
  campaignId: '20202020-0000-4000-8000-000000000002',
};

const buildRequest = ({
  keywords = ['payments'],
  industryCodes = [],
  cursor = null,
  countryCode = 'GB',
}: {
  keywords?: string[];
  industryCodes?: { scheme: string; code: string }[];
  cursor?: string | null;
  countryCode?: string | null;
} = {}): DiscoveryRequest => ({
  countryCode,
  icp: prospectingIcpSchema.parse({
    targetGeographies: [{ countryCode: 'GB' }],
    keywords,
    industryCodes,
  }),
  cursor,
  pageSize: 2,
});

describe('CompaniesHouseDiscoveryProvider', () => {
  let request: jest.Mock;
  let getHttpClient: jest.Mock;
  let apiKey: string | undefined;
  let provider: CompaniesHouseDiscoveryProvider;

  beforeEach(() => {
    apiKey = 'test-api-key';
    request = jest
      .fn()
      .mockResolvedValue({ data: mockCompaniesHouseAdvancedSearchResponse });
    getHttpClient = jest.fn(() => ({ request }));
    provider = new CompaniesHouseDiscoveryProvider(
      { getHttpClient } as unknown as SecureHttpClientService,
      { get: () => apiKey } as unknown as TwentyConfigService,
    );
  });

  it('maps register entries to discovery records', async () => {
    const page = await provider.search(buildRequest(), CONTEXT);

    expect(page.records).toEqual([
      {
        providerId: 'companies-house',
        externalId: 'SC759349',
        sourceUrl:
          'https://find-and-update.company-information.service.gov.uk/company/SC759349',
        licenceId: 'companies-house-public-register',
        retrievedAt: expect.any(String),
        name: 'WILKIE PAYMENTS LTD',
        domain: null,
        countryCode: 'GB',
        region: 'Scotland',
        registrationAuthority: 'RA000587',
        registrationNumber: 'SC759349',
        lei: null,
        industry: null,
        industryCode: { scheme: 'SIC', code: '62020' },
        employeeCount: null,
        description: null,
      },
      expect.objectContaining({
        externalId: '10207832',
        region: 'England',
        registrationAuthority: 'RA000585',
      }),
    ]);
  });

  it('authenticates with the API key and searches active companies by name', async () => {
    await provider.search(buildRequest(), CONTEXT);

    expect(getHttpClient).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { username: 'test-api-key', password: '' },
      }),
      expect.anything(),
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/advanced-search/companies',
        params: {
          company_status: 'active',
          company_name_includes: 'payments',
          size: 2,
          start_index: 0,
        },
      }),
    );
  });

  it('filters by SIC code and shows the code the campaign asked for', async () => {
    const page = await provider.search(
      buildRequest({
        keywords: [],
        industryCodes: [{ scheme: 'SIC', code: '64999' }],
      }),
      CONTEXT,
    );

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ sic_codes: '64999' }),
      }),
    );
    expect(page.records[0].industryCode).toEqual({
      scheme: 'SIC',
      code: '64999',
    });
  });

  it('pages by offset and moves on once the results run out', async () => {
    const firstPage = await provider.search(buildRequest(), CONTEXT);

    expect(firstPage.nextCursor).toBe('0:2');

    await provider.search(buildRequest({ cursor: '0:3' }), CONTEXT);

    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ start_index: 4 }),
      }),
    );

    request.mockResolvedValue({
      data: { ...mockCompaniesHouseAdvancedSearchResponse, hits: 6 },
    });

    const lastPage = await provider.search(
      buildRequest({ cursor: '0:3' }),
      CONTEXT,
    );

    expect(lastPage.nextCursor).toBeNull();
  });

  it('treats a search without results as an empty page', async () => {
    request.mockRejectedValue(
      new AxiosError('not found', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 404,
      } as AxiosResponse),
    );

    const page = await provider.search(
      buildRequest({ keywords: ['first', 'second'] }),
      CONTEXT,
    );

    expect(page).toEqual({ records: [], nextCursor: '1:1' });
  });

  it('refuses a search that would list every UK company', async () => {
    await expect(
      provider.search(buildRequest({ keywords: [] }), CONTEXT),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_DISCOVERY_REQUEST' });
  });

  it('refuses to run without an API key', async () => {
    apiKey = undefined;

    await expect(
      provider.search(buildRequest(), CONTEXT),
    ).rejects.toMatchObject({ code: 'PROVIDER_REQUEST_REJECTED' });
    expect(request).not.toHaveBeenCalled();
  });
});
