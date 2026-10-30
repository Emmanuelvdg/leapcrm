import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { CompaniesHouseDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/companies-house/companies-house-discovery-provider.service';
import { FixtureDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/fixture/fixture-discovery-provider.service';
import { GleifDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/gleif/gleif-discovery-provider.service';
import { WikidataDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/wikidata/wikidata-discovery-provider.service';
import { DiscoveryProviderRegistryService } from 'src/modules/prospecting/discovery/services/discovery-provider-registry.service';
import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const buildRegistry = (
  nodeEnvironment: string,
  companiesHouseApiKey?: string,
) => {
  const twentyConfigService = {
    get: (key: string) =>
      key === 'COMPANIES_HOUSE_API_KEY'
        ? companiesHouseApiKey
        : nodeEnvironment,
  } as unknown as TwentyConfigService;

  return new DiscoveryProviderRegistryService(
    twentyConfigService,
    new GleifDiscoveryProvider({} as SecureHttpClientService),
    new WikidataDiscoveryProvider({} as SecureHttpClientService),
    new FixtureDiscoveryProvider(),
    new CompaniesHouseDiscoveryProvider(
      {} as SecureHttpClientService,
      twentyConfigService,
    ),
  );
};

describe('DiscoveryProviderRegistryService', () => {
  it('offers the fixture source outside production only', () => {
    expect(
      buildRegistry('development')
        .getProviders()
        .map(({ id }) => id),
    ).toEqual(['gleif', 'wikidata', 'fixture']);
    expect(
      buildRegistry('production')
        .getProviders()
        .map(({ id }) => id),
    ).toEqual(['gleif', 'wikidata']);
  });

  it('offers Companies House only once its API key is configured', () => {
    expect(
      buildRegistry('production', 'configured-key')
        .getProviders()
        .map(({ id }) => id),
    ).toEqual(['companies-house', 'gleif', 'wikidata']);
    expect(
      buildRegistry('production', '').findUnknownProviderIds([
        'companies-house',
      ]),
    ).toEqual(['companies-house']);
  });

  it('picks Companies House before GLEIF for a UK campaign with a keyword', () => {
    const selectedProviderIds = buildRegistry(
      'production',
      'configured-key',
    ).selectProviderIds(
      prospectingIcpSchema.parse({
        targetGeographies: [{ countryCode: 'GB' }],
        keywords: ['payments'],
      }),
    );

    expect(selectedProviderIds.slice(0, 2)).toEqual([
      'companies-house',
      'gleif',
    ]);
  });

  it('reports source ids that do not exist', () => {
    expect(
      buildRegistry('production').findUnknownProviderIds([
        'gleif',
        'fixture',
        'unknown',
      ]),
    ).toEqual(['fixture', 'unknown']);
  });

  it('fails on an unknown source', () => {
    expect(() =>
      buildRegistry('development').getProviderOrThrow('unknown'),
    ).toThrow('Unknown discovery provider unknown');
  });
});
