import { Module } from '@nestjs/common';

import { ProspectIdentityLookupService } from 'src/modules/prospecting/identity-resolution/services/prospect-identity-lookup.service';

@Module({
  providers: [ProspectIdentityLookupService],
  exports: [ProspectIdentityLookupService],
})
export class ProspectingIdentityResolutionModule {}
