import { Module } from '@nestjs/common';

import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { ProspectingJobModule } from 'src/engine/core-modules/prospecting-job/prospecting-job.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { ProspectingCampaignResolver } from 'src/modules/prospecting/resolvers/prospecting-campaign.resolver';
import { ProspectingCampaignService } from 'src/modules/prospecting/services/prospecting-campaign.service';

@Module({
  imports: [
    FeatureFlagModule,
    PermissionsModule,
    UserRoleModule,
    ProspectingJobModule,
  ],
  providers: [ProspectingCampaignService, ProspectingCampaignResolver],
  exports: [ProspectingCampaignService],
})
export class ProspectingModule {}
