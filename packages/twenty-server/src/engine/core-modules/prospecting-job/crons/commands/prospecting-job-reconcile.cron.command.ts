import { Command, CommandRunner } from 'nest-commander';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { PROSPECTING_JOB_RECONCILE_CRON_PATTERN } from 'src/engine/core-modules/prospecting-job/constants/prospecting-job-reconcile-cron-pattern.constant';
import { ProspectingJobReconcileCronJob } from 'src/engine/core-modules/prospecting-job/crons/jobs/prospecting-job-reconcile.cron.job';

@Command({
  name: 'cron:prospecting-job:reconcile',
  description:
    'Starts a cron job that re-enqueues overdue prospecting jobs and releases expired leases',
})
export class ProspectingJobReconcileCronCommand extends CommandRunner {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.messageQueueService.addCron<undefined>({
      jobName: ProspectingJobReconcileCronJob.name,
      data: undefined,
      options: {
        repeat: {
          pattern: PROSPECTING_JOB_RECONCILE_CRON_PATTERN,
        },
      },
    });
  }
}
