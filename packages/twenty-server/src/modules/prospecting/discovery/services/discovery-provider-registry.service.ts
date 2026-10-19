import { Injectable } from '@nestjs/common';

import { NodeEnvironment } from 'src/engine/core-modules/twenty-config/interfaces/node-environment.interface';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { FixtureDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/fixture/fixture-discovery-provider.service';
import { GleifDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/gleif/gleif-discovery-provider.service';
import { WikidataDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/wikidata/wikidata-discovery-provider.service';
import { type DiscoveryProvider } from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { selectDiscoveryProviderIds } from 'src/modules/prospecting/discovery/utils/select-discovery-provider-ids.util';
import { type ProspectingIcp } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

@Injectable()
export class DiscoveryProviderRegistryService {
  private readonly providers: DiscoveryProvider[];

  constructor(
    twentyConfigService: TwentyConfigService,
    gleifDiscoveryProvider: GleifDiscoveryProvider,
    wikidataDiscoveryProvider: WikidataDiscoveryProvider,
    fixtureDiscoveryProvider: FixtureDiscoveryProvider,
  ) {
    const isFixtureProviderEnabled =
      twentyConfigService.get('NODE_ENV') !== NodeEnvironment.PRODUCTION;

    this.providers = [
      gleifDiscoveryProvider,
      wikidataDiscoveryProvider,
      ...(isFixtureProviderEnabled ? [fixtureDiscoveryProvider] : []),
    ];
  }

  getProviders(): DiscoveryProvider[] {
    return this.providers;
  }

  getProviderOrThrow(providerId: string): DiscoveryProvider {
    const provider = this.providers.find(({ id }) => id === providerId);

    if (!provider) {
      throw new DiscoveryProviderException(
        `Unknown discovery provider ${providerId}`,
        'UNKNOWN_DISCOVERY_PROVIDER',
      );
    }

    return provider;
  }

  findUnknownProviderIds(providerIds: string[]): string[] {
    return providerIds.filter(
      (providerId) => !this.providers.some(({ id }) => id === providerId),
    );
  }

  selectProviderIds(icp: ProspectingIcp): string[] {
    return selectDiscoveryProviderIds({ icp, providers: this.providers });
  }
}
