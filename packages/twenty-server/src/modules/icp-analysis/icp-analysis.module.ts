import { Module } from '@nestjs/common';

import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { IcpModelResolver } from 'src/modules/icp-analysis/resolvers/icp-model.resolver';
import { IcpEvidenceService } from 'src/modules/icp-analysis/services/icp-evidence.service';
import { IcpModelAnalysisService } from 'src/modules/icp-analysis/services/icp-model-analysis.service';

@Module({
  imports: [
    FeatureFlagModule,
    PermissionsModule,
    UserRoleModule,
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
  ],
  providers: [IcpEvidenceService, IcpModelAnalysisService, IcpModelResolver],
  exports: [IcpEvidenceService],
})
export class IcpAnalysisModule {}
