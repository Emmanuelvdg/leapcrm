import { type SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { FixtureDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/fixture/fixture-discovery-provider.service';
import { GleifDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/gleif/gleif-discovery-provider.service';
import { WikidataDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/wikidata/wikidata-discovery-provider.service';
import { DiscoveryProviderRegistryService } from 'src/modules/prospecting/discovery/services/discovery-provider-registry.service';

const buildRegistry = (nodeEnvironment: string) =>
  new DiscoveryProviderRegistryService(
    { get: () => nodeEnvironment } as unknown as TwentyConfigService,
    new GleifDiscoveryProvider({} as SecureHttpClientService),
    new WikidataDiscoveryProvider({} as SecureHttpClientService),
    new FixtureDiscoveryProvider(),
  );

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
