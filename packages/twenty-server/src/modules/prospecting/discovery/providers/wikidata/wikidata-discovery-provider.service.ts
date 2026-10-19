import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { WIKIDATA_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-discovery-capabilities.constant';
import { WIKIDATA_DISCOVERY_PROVIDER_ID } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-discovery-provider-id.constant';
import { WIKIDATA_MAX_PAGE_SIZE } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-max-page-size.constant';
import { WIKIDATA_REQUEST_TIMEOUT_MS } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-request-timeout-ms.constant';
import { WIKIDATA_SPARQL_ENDPOINT_URL } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-sparql-endpoint-url.constant';
import { WIKIDATA_USER_AGENT } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-user-agent.constant';
import { buildWikidataCompanySearchQuery } from 'src/modules/prospecting/discovery/providers/wikidata/utils/build-wikidata-company-search-query.util';
import { mapWikidataCompanyBinding } from 'src/modules/prospecting/discovery/providers/wikidata/utils/map-wikidata-company-binding.util';
import { wikidataCompanySearchResponseSchema } from 'src/modules/prospecting/discovery/providers/wikidata/zod-schemas/wikidata-company-search-response.zod-schema';
import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';
import {
  type DiscoveryContext,
  type DiscoveryPage,
  type DiscoveryProvider,
  type DiscoveryRequest,
} from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { getDiscoverySearchTerms } from 'src/modules/prospecting/discovery/utils/get-discovery-search-terms.util';
import {
  buildNextOffsetCursor,
  parseOffsetCursor,
} from 'src/modules/prospecting/discovery/utils/offset-cursor.util';
import { requestDiscoveryProviderOrThrow } from 'src/modules/prospecting/discovery/utils/request-discovery-provider-or-throw.util';

@Injectable()
export class WikidataDiscoveryProvider implements DiscoveryProvider {
  readonly id = WIKIDATA_DISCOVERY_PROVIDER_ID;

  constructor(
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  getCapabilities(): DiscoveryCapabilities {
    return WIKIDATA_DISCOVERY_CAPABILITIES;
  }

  async search(
    request: DiscoveryRequest,
    context: DiscoveryContext,
  ): Promise<DiscoveryPage> {
    const searchTerms = getDiscoverySearchTerms([
      ...request.icp.targetIndustries,
      ...request.icp.keywords,
    ]);

    if (searchTerms.length === 0) {
      throw new DiscoveryProviderException(
        'Wikidata needs at least one industry or keyword to search',
        'UNSUPPORTED_DISCOVERY_REQUEST',
      );
    }

    const offset = parseOffsetCursor(request.cursor);
    const pageSize = Math.min(request.pageSize, WIKIDATA_MAX_PAGE_SIZE);

    const responseBody = await requestDiscoveryProviderOrThrow({
      httpClient: this.secureHttpClientService.getHttpClient(
        { timeout: WIKIDATA_REQUEST_TIMEOUT_MS },
        { workspaceId: context.workspaceId, source: 'prospecting-discovery' },
      ),
      providerId: this.id,
      requestConfig: {
        method: 'POST',
        url: WIKIDATA_SPARQL_ENDPOINT_URL,
        // POST keeps long multi-term queries clear of URL length limits.
        data: new URLSearchParams({
          query: buildWikidataCompanySearchQuery({
            countryCode: request.countryCode,
            searchTerms,
            employeeCountMin: request.icp.employeeCountMin,
            employeeCountMax: request.icp.employeeCountMax,
            limit: pageSize,
            offset,
          }),
          format: 'json',
        }).toString(),
        headers: {
          Accept: 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': WIKIDATA_USER_AGENT,
        },
      },
    });

    const parsedResponse =
      wikidataCompanySearchResponseSchema.safeParse(responseBody);

    if (!parsedResponse.success) {
      throw new DiscoveryProviderException(
        `Wikidata returned an unexpected response: ${parsedResponse.error.message}`,
        'PROVIDER_RESPONSE_INVALID',
      );
    }

    const retrievedAt = new Date().toISOString();
    const { bindings } = parsedResponse.data.results;

    return {
      records: bindings
        .map((binding) =>
          mapWikidataCompanyBinding({
            binding,
            countryCode: request.countryCode,
            retrievedAt,
          }),
        )
        .filter(isDefined),
      nextCursor: buildNextOffsetCursor({
        offset,
        pageSize,
        receivedCount: bindings.length,
      }),
    };
  }
}
