import { Module } from '@nestjs/common';

import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { GlobalCompanyDirectoryModule } from 'src/engine/core-modules/global-company-directory/global-company-directory.module';
import { ProspectingJobModule } from 'src/engine/core-modules/prospecting-job/prospecting-job.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { ProspectingDiscoveryModule } from 'src/modules/prospecting/discovery/prospecting-discovery.module';
import { ProspectingIdentityResolutionModule } from 'src/modules/prospecting/identity-resolution/prospecting-identity-resolution.module';
import { ProspectCampaignCandidateCounterService } from 'src/modules/prospecting/candidate/services/prospect-campaign-candidate-counter.service';
import { ProspectCandidateImportService } from 'src/modules/prospecting/candidate/services/prospect-candidate-import.service';
import { ProspectCandidateWriterService } from 'src/modules/prospecting/candidate/services/prospect-candidate-writer.service';
import { DiscoveryPageService } from 'src/modules/prospecting/discovery/services/discovery-page.service';
import { ProspectingJobRunnerJob } from 'src/modules/prospecting/jobs/prospecting-job-runner.job';
import { ProspectingCampaignResolver } from 'src/modules/prospecting/resolvers/prospecting-campaign.resolver';
import { ProspectingCampaignService } from 'src/modules/prospecting/services/prospecting-campaign.service';

@Module({
  imports: [
    FeatureFlagModule,
    PermissionsModule,
    UserRoleModule,
    ProspectingJobModule,
    GlobalCompanyDirectoryModule,
    ProspectingDiscoveryModule,
    ProspectingIdentityResolutionModule,
  ],
  providers: [
    ProspectingCampaignService,
    ProspectingCampaignResolver,
    ProspectCandidateWriterService,
    ProspectCandidateImportService,
    ProspectCampaignCandidateCounterService,
    DiscoveryPageService,
    ProspectingJobRunnerJob,
  ],
  exports: [ProspectingCampaignService],
})
export class ProspectingModule {}
