import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { mockWikidataCompanySearchResponse } from 'src/modules/prospecting/discovery/providers/wikidata/__mocks__/wikidata-company-search-response';
import { WikidataDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/wikidata/wikidata-discovery-provider.service';
import { type DiscoveryRequest } from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const CONTEXT = {
  workspaceId: '20202020-0000-4000-8000-000000000001',
  campaignId: '20202020-0000-4000-8000-000000000002',
};

const buildRequest = (
  icp: Record<string, unknown> = {
    targetGeographies: [{ countryCode: 'SG' }],
    targetIndustries: ['Financial services'],
    keywords: ['bank'],
    employeeCountMin: 50,
  },
  overrides: Partial<DiscoveryRequest> = {},
): DiscoveryRequest => ({
  countryCode: 'SG',
  icp: prospectingIcpSchema.parse(icp),
  cursor: null,
  pageSize: 3,
  ...overrides,
});

describe('WikidataDiscoveryProvider', () => {
  let request: jest.Mock;
  let provider: WikidataDiscoveryProvider;

  beforeEach(() => {
    request = jest
      .fn()
      .mockResolvedValue({ data: mockWikidataCompanySearchResponse });
    provider = new WikidataDiscoveryProvider({
      getHttpClient: jest.fn(() => ({ request })),
    } as unknown as SecureHttpClientService);
  });

  it('maps companies with their website domain, size and industries', async () => {
    const page = await provider.search(buildRequest(), CONTEXT);

    expect(page.records[0]).toEqual({
      providerId: 'wikidata',
      externalId: 'Q2042423',
      sourceUrl: 'https://www.wikidata.org/wiki/Q2042423',
      licenceId: 'CC0-1.0',
      retrievedAt: expect.any(String),
      name: 'Oversea-Chinese Banking Corporation',
      domain: 'ocbc.com',
      countryCode: 'SG',
      region: null,
      registrationAuthority: null,
      registrationNumber: null,
      lei: null,
      industry: 'financial services, financial sector',
      industryCode: null,
      employeeCount: 29174,
      description: 'Singapore company',
    });
  });

  it('identifies itself and searches every industry and keyword term', async () => {
    await provider.search(buildRequest(), CONTEXT);

    const [requestConfig] = request.mock.calls[0];
    const query = new URLSearchParams(requestConfig.data).get('query') ?? '';

    expect(requestConfig.method).toBe('POST');
    expect(requestConfig.headers['User-Agent']).toContain('LeapCRM');
    expect(query).toContain('mwapi:search "financial services"');
    expect(query).toContain('mwapi:search "bank"');
    expect(query).toContain('?country wdt:P297 "SG"');
    expect(query).toContain('?employeeFilter >= 50');
  });

  it('skips items without an English name', async () => {
    const [firstBinding] = mockWikidataCompanySearchResponse.results.bindings;

    request.mockResolvedValueOnce({
      data: {
        results: {
          bindings: [
            { item: firstBinding.item },
            ...mockWikidataCompanySearchResponse.results.bindings.slice(1),
          ],
        },
      },
    });

    const page = await provider.search(buildRequest(), CONTEXT);

    expect(page.records.map((record) => record.externalId)).not.toContain(
      'Q2042423',
    );
  });

  it('pages by offset and stops on a short page', async () => {
    const fullPage = await provider.search(buildRequest(), CONTEXT);
    const shortPage = await provider.search(
      buildRequest(undefined, { cursor: '3', pageSize: 50 }),
      CONTEXT,
    );

    expect(fullPage.nextCursor).toBe('3');
    expect(shortPage.nextCursor).toBeNull();
  });

  it('refuses a request without industries or keywords', async () => {
    await expect(
      provider.search(
        buildRequest({ targetGeographies: [{ countryCode: 'SG' }] }),
        CONTEXT,
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_DISCOVERY_REQUEST' });
    expect(request).not.toHaveBeenCalled();
  });
});
