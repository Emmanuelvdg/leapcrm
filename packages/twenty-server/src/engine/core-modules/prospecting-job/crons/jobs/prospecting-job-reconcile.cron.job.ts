import { Injectable, Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { PROSPECTING_JOB_RECONCILE_CRON_PATTERN } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-reconcile-cron-pattern.constant';
import { ProspectingJobLedgerService } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';

@Injectable()
@Processor(MessageQueue.cronQueue)
export class ProspectingJobReconcileCronJob {
  private readonly logger = new Logger(ProspectingJobReconcileCronJob.name);

  constructor(
    private readonly prospectingJobLedgerService: ProspectingJobLedgerService,
  ) {}

  @Process(ProspectingJobReconcileCronJob.name)
  @SentryCronMonitor(
    ProspectingJobReconcileCronJob.name,
    PROSPECTING_JOB_RECONCILE_CRON_PATTERN,
  )
  async handle(): Promise<void> {
    const {
      requeuedExpiredLeaseCount,
      deadExpiredLeaseCount,
      reenqueuedPendingCount,
    } = await this.prospectingJobLedgerService.reconcile();

    if (
      requeuedExpiredLeaseCount > 0 ||
      deadExpiredLeaseCount > 0 ||
      reenqueuedPendingCount > 0
    ) {
      this.logger.log(
        `Requeued ${requeuedExpiredLeaseCount} and marked dead ${deadExpiredLeaseCount} prospecting jobs with expired leases, re-enqueued ${reenqueuedPendingCount} overdue pending jobs`,
      );
    }
  }
}
