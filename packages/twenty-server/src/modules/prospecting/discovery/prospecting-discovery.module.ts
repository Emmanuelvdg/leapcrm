import { Module } from '@nestjs/common';

import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { FixtureDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/fixture/fixture-discovery-provider.service';
import { GleifDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/gleif/gleif-discovery-provider.service';
import { WikidataDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/wikidata/wikidata-discovery-provider.service';
import { DiscoveryProviderRegistryService } from 'src/modules/prospecting/discovery/services/discovery-provider-registry.service';

@Module({
  imports: [SecureHttpClientModule],
  providers: [
    GleifDiscoveryProvider,
    WikidataDiscoveryProvider,
    FixtureDiscoveryProvider,
    DiscoveryProviderRegistryService,
  ],
  exports: [DiscoveryProviderRegistryService],
})
export class ProspectingDiscoveryModule {}
