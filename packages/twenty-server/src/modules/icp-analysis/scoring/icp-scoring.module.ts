import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { IcpScoreAllCronCommand } from 'src/modules/icp-analysis/scoring/crons/commands/icp-score-all.cron.command';
import { IcpScoreAllCronJob } from 'src/modules/icp-analysis/scoring/crons/jobs/icp-score-all.cron.job';
import { IcpScoreAllJob } from 'src/modules/icp-analysis/scoring/jobs/icp-score-all.job';
import { IcpScoreRecordsJob } from 'src/modules/icp-analysis/scoring/jobs/icp-score-records.job';
import { IcpScoringListener } from 'src/modules/icp-analysis/scoring/listeners/icp-scoring.listener';
import { IcpScoringService } from 'src/modules/icp-analysis/scoring/services/icp-scoring.service';
import { IcpEvidenceService } from 'src/modules/icp-analysis/services/icp-evidence.service';

@Module({
  imports: [
    FeatureFlagModule,
    TypeOrmModule.forFeature([WorkspaceEntity]),
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
  ],
  providers: [
    IcpEvidenceService,
    IcpScoringService,
    IcpScoreAllJob,
    IcpScoreRecordsJob,
    IcpScoringListener,
    IcpScoreAllCronJob,
    IcpScoreAllCronCommand,
  ],
  exports: [IcpScoreAllCronCommand],
})
export class IcpScoringModule {}
