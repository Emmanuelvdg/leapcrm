import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FeatureFlagKey } from 'twenty-shared/types';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { ICP_SCORE_ALL_CRON_PATTERN } from 'src/modules/icp-analysis/scoring/constants/icp-score-all-cron-pattern.constant';
import {
  IcpScoreAllJob,
  type IcpScoreAllJobData,
} from 'src/modules/icp-analysis/scoring/jobs/icp-score-all.job';

@Injectable()
@Processor(MessageQueue.cronQueue)
export class IcpScoreAllCronJob {
  private readonly logger = new Logger(IcpScoreAllCronJob.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectMessageQueue(MessageQueue.workspaceQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly exceptionHandlerService: ExceptionHandlerService,
  ) {}

  @Process(IcpScoreAllCronJob.name)
  @SentryCronMonitor(IcpScoreAllCronJob.name, ICP_SCORE_ALL_CRON_PATTERN)
  async handle(): Promise<void> {
    const workspaces = await this.workspaceRepository.find({
      where: { activationStatus: WorkspaceActivationStatus.ACTIVE },
      select: ['id'],
      order: { id: 'ASC' },
    });

    let enqueuedCount = 0;

    for (const workspace of workspaces) {
      try {
        const isIcpAnalysisEnabled =
          await this.featureFlagService.isFeatureEnabled(
            FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
            workspace.id,
          );

        if (!isIcpAnalysisEnabled) {
          continue;
        }

        await this.messageQueueService.add<IcpScoreAllJobData>(
          IcpScoreAllJob.name,
          { workspaceId: workspace.id },
        );
        enqueuedCount += 1;
      } catch (error) {
        this.exceptionHandlerService.captureExceptions([error], {
          workspace: { id: workspace.id },
        });
      }
    }

    this.logger.log(`Enqueued ICP scoring for ${enqueuedCount} workspace(s)`);
  }
}
