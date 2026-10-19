import { AxiosError, type AxiosResponse } from 'axios';

import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { mockGleifLeiRecordsResponse } from 'src/modules/prospecting/discovery/providers/gleif/__mocks__/gleif-lei-records-response';
import { GleifDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/gleif/gleif-discovery-provider.service';
import { type DiscoveryRequest } from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { isRetryableDiscoveryProviderExceptionCode } from 'src/modules/prospecting/discovery/utils/is-retryable-discovery-provider-exception-code.util';
import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const CONTEXT = {
  workspaceId: '20202020-0000-4000-8000-000000000001',
  campaignId: '20202020-0000-4000-8000-000000000002',
};

const buildRequest = (
  overrides: Partial<DiscoveryRequest> & { keywords?: string[] } = {},
): DiscoveryRequest => {
  const { keywords = ['payments'], ...requestOverrides } = overrides;

  return {
    countryCode: 'SG',
    icp: prospectingIcpSchema.parse({
      targetGeographies: [{ countryCode: 'SG' }],
      keywords,
    }),
    cursor: null,
    pageSize: 3,
    ...requestOverrides,
  };
};

const withPagination = (currentPage: number, lastPage: number) => ({
  ...mockGleifLeiRecordsResponse,
  meta: {
    pagination: {
      ...mockGleifLeiRecordsResponse.meta.pagination,
      currentPage,
      lastPage,
    },
  },
});

describe('GleifDiscoveryProvider', () => {
  let request: jest.Mock;
  let provider: GleifDiscoveryProvider;

  beforeEach(() => {
    request = jest
      .fn()
      .mockResolvedValue({ data: mockGleifLeiRecordsResponse });
    provider = new GleifDiscoveryProvider({
      getHttpClient: jest.fn(() => ({ request })),
    } as unknown as SecureHttpClientService);
  });

  it('maps LEI records to discovery records', async () => {
    const page = await provider.search(buildRequest(), CONTEXT);

    expect(page.records).toHaveLength(3);
    expect(page.records[0]).toEqual({
      providerId: 'gleif',
      externalId: '254900NM2JQUVESOI109',
      sourceUrl: 'https://search.gleif.org/#/record/254900NM2JQUVESOI109',
      licenceId: 'CC0-1.0',
      retrievedAt: expect.any(String),
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
    });
  });

  it('asks for active general companies in the country matching the keyword', async () => {
    await provider.search(buildRequest(), CONTEXT);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/lei-records',
        params: {
          'filter[entity.category]': 'GENERAL',
          'filter[entity.status]': 'ACTIVE',
          'filter[entity.legalAddress.country]': 'SG',
          'filter[fulltext]': 'payments',
          'page[size]': 3,
          'page[number]': 1,
        },
      }),
    );
  });

  it('continues with the next page, then the next keyword, then stops', async () => {
    const twoKeywordRequest = buildRequest({
      keywords: ['payments', 'wallet'],
    });

    request.mockResolvedValueOnce({ data: withPagination(1, 2) });
    const firstPage = await provider.search(twoKeywordRequest, CONTEXT);

    request.mockResolvedValueOnce({ data: withPagination(2, 2) });
    const lastPageOfFirstKeyword = await provider.search(
      { ...twoKeywordRequest, cursor: firstPage.nextCursor },
      CONTEXT,
    );

    request.mockResolvedValueOnce({ data: withPagination(1, 1) });
    const onlyPageOfSecondKeyword = await provider.search(
      { ...twoKeywordRequest, cursor: lastPageOfFirstKeyword.nextCursor },
      CONTEXT,
    );

    expect(firstPage.nextCursor).toBe('0:2');
    expect(lastPageOfFirstKeyword.nextCursor).toBe('1:1');
    expect(request.mock.calls[2][0].params['filter[fulltext]']).toBe('wallet');
    expect(onlyPageOfSecondKeyword.nextCursor).toBeNull();
  });

  it('drops the placeholder authority used for unregistered entities', async () => {
    const [firstRecord] = mockGleifLeiRecordsResponse.data;

    request.mockResolvedValueOnce({
      data: {
        ...mockGleifLeiRecordsResponse,
        data: [
          {
            ...firstRecord,
            attributes: {
              ...firstRecord.attributes,
              entity: {
                ...firstRecord.attributes.entity,
                registeredAt: { id: 'RA999999', other: null },
              },
            },
          },
        ],
      },
    });

    const page = await provider.search(buildRequest(), CONTEXT);

    expect(page.records[0].registrationAuthority).toBeNull();
    expect(page.records[0].registrationNumber).toBeNull();
  });

  it('refuses a request without a country or keyword', async () => {
    await expect(
      provider.search(
        buildRequest({ countryCode: null, keywords: [] }),
        CONTEXT,
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_DISCOVERY_REQUEST' });
    expect(request).not.toHaveBeenCalled();
  });

  it('reports rate limiting as a retryable failure', async () => {
    request.mockRejectedValueOnce(
      new AxiosError(
        'Too Many Requests',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 429,
        } as AxiosResponse,
      ),
    );

    const failure = await provider
      .search(buildRequest(), CONTEXT)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(DiscoveryProviderException);
    expect((failure as DiscoveryProviderException).code).toBe(
      'PROVIDER_RATE_LIMITED',
    );
    expect(
      isRetryableDiscoveryProviderExceptionCode(
        (failure as DiscoveryProviderException).code,
      ),
    ).toBe(true);
  });

  it('rejects a response it cannot read', async () => {
    request.mockResolvedValueOnce({ data: { data: 'unexpected' } });

    await expect(
      provider.search(buildRequest(), CONTEXT),
    ).rejects.toMatchObject({ code: 'PROVIDER_RESPONSE_INVALID' });
  });
});
