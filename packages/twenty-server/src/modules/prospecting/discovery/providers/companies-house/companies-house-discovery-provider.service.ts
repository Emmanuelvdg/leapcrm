import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { COMPANIES_HOUSE_API_BASE_URL } from 'src/modules/prospecting/discovery/providers/companies-house/constants/companies-house-api-base-url.constant';
import { COMPANIES_HOUSE_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/companies-house/constants/companies-house-discovery-capabilities.constant';
import { COMPANIES_HOUSE_DISCOVERY_PROVIDER_ID } from 'src/modules/prospecting/discovery/providers/companies-house/constants/companies-house-discovery-provider-id.constant';
import { COMPANIES_HOUSE_MAX_PAGE_SIZE } from 'src/modules/prospecting/discovery/providers/companies-house/constants/companies-house-max-page-size.constant';
import { COMPANIES_HOUSE_REQUEST_TIMEOUT_MS } from 'src/modules/prospecting/discovery/providers/companies-house/constants/companies-house-request-timeout-ms.constant';
import { mapCompaniesHouseCompany } from 'src/modules/prospecting/discovery/providers/companies-house/utils/map-companies-house-company.util';
import { companiesHouseAdvancedSearchResponseSchema } from 'src/modules/prospecting/discovery/providers/companies-house/zod-schemas/companies-house-advanced-search-response.zod-schema';
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
export class CompaniesHouseDiscoveryProvider implements DiscoveryProvider {
  readonly id = COMPANIES_HOUSE_DISCOVERY_PROVIDER_ID;

  constructor(
    private readonly secureHttpClientService: SecureHttpClientService,
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  getCapabilities(): DiscoveryCapabilities {
    return COMPANIES_HOUSE_DISCOVERY_CAPABILITIES;
  }

  async search(
    request: DiscoveryRequest,
    context: DiscoveryContext,
  ): Promise<DiscoveryPage> {
    const apiKey = this.twentyConfigService.get('COMPANIES_HOUSE_API_KEY');

    if (!isNonEmptyString(apiKey)) {
      throw new DiscoveryProviderException(
        'Companies House is not configured: COMPANIES_HOUSE_API_KEY is missing',
        'PROVIDER_REQUEST_REJECTED',
      );
    }

    if (isDefined(request.countryCode) && request.countryCode !== 'GB') {
      throw new DiscoveryProviderException(
        `Companies House only covers GB, not ${request.countryCode}`,
        'UNSUPPORTED_DISCOVERY_REQUEST',
      );
    }

    const searchTerms = getDiscoverySearchTerms(request.icp.keywords);
    const sicCodes = request.icp.industryCodes
      .filter(({ scheme }) => scheme === 'SIC')
      .map(({ code }) => code);

    if (searchTerms.length === 0 && sicCodes.length === 0) {
      throw new DiscoveryProviderException(
        'Companies House needs a keyword or a SIC code, otherwise it would list every UK company',
        'UNSUPPORTED_DISCOVERY_REQUEST',
      );
    }

    const { termIndex, pageNumber } = parseTermPageCursor(request.cursor);
    const searchTerm = searchTerms[termIndex];

    if (searchTerms.length > 0 && !isDefined(searchTerm)) {
      throw new DiscoveryProviderException(
        `Companies House cursor points past the last search term (${termIndex})`,
        'UNSUPPORTED_DISCOVERY_REQUEST',
      );
    }

    const pageSize = Math.min(request.pageSize, COMPANIES_HOUSE_MAX_PAGE_SIZE);
    const startIndex = (pageNumber - 1) * pageSize;

    const responseBody = await requestDiscoveryProviderOrThrow({
      httpClient: this.secureHttpClientService.getHttpClient(
        {
          baseURL: COMPANIES_HOUSE_API_BASE_URL,
          timeout: COMPANIES_HOUSE_REQUEST_TIMEOUT_MS,
          // The API key is the basic auth user name, with no password.
          auth: { username: apiKey, password: '' },
        },
        { workspaceId: context.workspaceId, source: 'prospecting-discovery' },
      ),
      providerId: this.id,
      requestConfig: {
        method: 'GET',
        url: '/advanced-search/companies',
        params: {
          company_status: 'active',
          ...(isDefined(searchTerm)
            ? { company_name_includes: searchTerm }
            : {}),
          ...(sicCodes.length > 0 ? { sic_codes: sicCodes.join(',') } : {}),
          size: pageSize,
          start_index: startIndex,
        },
      },
      emptyResponseStatuses: [404],
    });

    if (responseBody === null) {
      return {
        records: [],
        nextCursor: buildNextTermPageCursor({
          termIndex,
          pageNumber,
          hasMorePages: false,
          termCount: searchTerms.length,
        }),
      };
    }

    const parsedResponse =
      companiesHouseAdvancedSearchResponseSchema.safeParse(responseBody);

    if (!parsedResponse.success) {
      throw new DiscoveryProviderException(
        `Companies House returned an unexpected response: ${parsedResponse.error.message}`,
        'PROVIDER_RESPONSE_INVALID',
      );
    }

    const retrievedAt = new Date().toISOString();
    const { items, hits } = parsedResponse.data;

    return {
      records: items.map((company) =>
        mapCompaniesHouseCompany({
          company,
          requestedSicCodes: sicCodes,
          retrievedAt,
        }),
      ),
      nextCursor: buildNextTermPageCursor({
        termIndex,
        pageNumber,
        hasMorePages: items.length > 0 && startIndex + items.length < hits,
        termCount: searchTerms.length,
      }),
    };
  }
}
