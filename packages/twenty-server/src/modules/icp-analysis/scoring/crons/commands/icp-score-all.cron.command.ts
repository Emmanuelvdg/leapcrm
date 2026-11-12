import { Command, CommandRunner } from 'nest-commander';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { ICP_SCORE_ALL_CRON_PATTERN } from 'src/modules/icp-analysis/scoring/constants/icp-score-all-cron-pattern.constant';
import { IcpScoreAllCronJob } from 'src/modules/icp-analysis/scoring/crons/jobs/icp-score-all.cron.job';

@Command({
  name: 'cron:icp-analysis:score-all',
  description:
    'Starts a nightly cron job that rescores companies and prospect candidates with the active ICP model',
})
export class IcpScoreAllCronCommand extends CommandRunner {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.messageQueueService.addCron<undefined>({
      jobName: IcpScoreAllCronJob.name,
      data: undefined,
      options: {
        repeat: {
          pattern: ICP_SCORE_ALL_CRON_PATTERN,
        },
      },
    });
  }
}
