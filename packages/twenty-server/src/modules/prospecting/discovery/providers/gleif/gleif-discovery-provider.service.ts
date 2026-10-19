import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { GLEIF_API_BASE_URL } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-api-base-url.constant';
import { GLEIF_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-discovery-capabilities.constant';
import { GLEIF_DISCOVERY_PROVIDER_ID } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-discovery-provider-id.constant';
import { GLEIF_MAX_PAGE_SIZE } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-max-page-size.constant';
import { GLEIF_REQUEST_TIMEOUT_MS } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-request-timeout-ms.constant';
import { mapGleifLeiRecord } from 'src/modules/prospecting/discovery/providers/gleif/utils/map-gleif-lei-record.util';
import { gleifLeiRecordsResponseSchema } from 'src/modules/prospecting/discovery/providers/gleif/zod-schemas/gleif-lei-records-response.zod-schema';
import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';
import {
  type DiscoveryContext,
  type DiscoveryPage,
  type DiscoveryProvider,
  type DiscoveryRequest,
} from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { getDiscoverySearchTerms } from 'src/modules/prospecting/discovery/utils/get-discovery-search-terms.util';
import { requestDiscoveryProviderOrThrow } from 'src/modules/prospecting/discovery/utils/request-discovery-provider-or-throw.util';
import {
  buildNextTermPageCursor,
  parseTermPageCursor,
} from 'src/modules/prospecting/discovery/utils/term-page-cursor.util';

@Injectable()
export class GleifDiscoveryProvider implements DiscoveryProvider {
  readonly id = GLEIF_DISCOVERY_PROVIDER_ID;

  constructor(
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  getCapabilities(): DiscoveryCapabilities {
    return GLEIF_DISCOVERY_CAPABILITIES;
  }

  async search(
    request: DiscoveryRequest,
    context: DiscoveryContext,
  ): Promise<DiscoveryPage> {
    const searchTerms = getDiscoverySearchTerms(request.icp.keywords);

    if (!isDefined(request.countryCode) && searchTerms.length === 0) {
      throw new DiscoveryProviderException(
        'GLEIF needs a country or a keyword, otherwise it would list every legal entity',
        'UNSUPPORTED_DISCOVERY_REQUEST',
      );
    }

    const { termIndex, pageNumber } = parseTermPageCursor(request.cursor);
    const searchTerm = searchTerms[termIndex];

    if (searchTerms.length > 0 && !isDefined(searchTerm)) {
      throw new DiscoveryProviderException(
        `GLEIF cursor points past the last search term (${termIndex})`,
        'UNSUPPORTED_DISCOVERY_REQUEST',
      );
    }

    const responseBody = await requestDiscoveryProviderOrThrow({
      httpClient: this.secureHttpClientService.getHttpClient(
        {
          baseURL: GLEIF_API_BASE_URL,
          timeout: GLEIF_REQUEST_TIMEOUT_MS,
          headers: { Accept: 'application/vnd.api+json' },
        },
        { workspaceId: context.workspaceId, source: 'prospecting-discovery' },
      ),
      providerId: this.id,
      requestConfig: {
        method: 'GET',
        url: '/lei-records',
        params: {
          // Funds, branches and government bodies are not prospects.
          'filter[entity.category]': 'GENERAL',
          'filter[entity.status]': 'ACTIVE',
          ...(isDefined(request.countryCode)
            ? { 'filter[entity.legalAddress.country]': request.countryCode }
            : {}),
          ...(isDefined(searchTerm) ? { 'filter[fulltext]': searchTerm } : {}),
          'page[size]': Math.min(request.pageSize, GLEIF_MAX_PAGE_SIZE),
          'page[number]': pageNumber,
        },
      },
    });

    const parsedResponse =
      gleifLeiRecordsResponseSchema.safeParse(responseBody);

    if (!parsedResponse.success) {
      throw new DiscoveryProviderException(
        `GLEIF returned an unexpected response: ${parsedResponse.error.message}`,
        'PROVIDER_RESPONSE_INVALID',
      );
    }

    const retrievedAt = new Date().toISOString();
    const { pagination } = parsedResponse.data.meta;

    return {
      records: parsedResponse.data.data.map((record) =>
        mapGleifLeiRecord({ record, retrievedAt }),
      ),
      nextCursor: buildNextTermPageCursor({
        termIndex,
        pageNumber,
        hasMorePages: pagination.currentPage < pagination.lastPage,
        termCount: searchTerms.length,
      }),
    };
  }
}
