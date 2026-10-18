import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProspectingJobReconcileCronCommand } from 'src/engine/core-modules/prospecting-job/crons/commands/prospecting-job-reconcile.cron.command';
import { ProspectingJobReconcileCronJob } from 'src/engine/core-modules/prospecting-job/crons/jobs/prospecting-job-reconcile.cron.job';
import { ProspectingJobEntity } from 'src/engine/core-modules/prospecting-job/prospecting-job.entity';
import { ProspectingJobLedgerService } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProspectingJobEntity])],
  providers: [
    ProspectingJobLedgerService,
    ProspectingJobReconcileCronJob,
    ProspectingJobReconcileCronCommand,
  ],
  exports: [ProspectingJobLedgerService, ProspectingJobReconcileCronCommand],
})
export class ProspectingJobModule {}
