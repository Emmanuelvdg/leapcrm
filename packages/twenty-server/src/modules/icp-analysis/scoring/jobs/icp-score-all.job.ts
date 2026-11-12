import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { IcpScoringService } from 'src/modules/icp-analysis/scoring/services/icp-scoring.service';

export type IcpScoreAllJobData = {
  workspaceId: string;
};

@Injectable()
@Processor(MessageQueue.workspaceQueue)
export class IcpScoreAllJob {
  private readonly logger = new Logger(IcpScoreAllJob.name);

  constructor(private readonly icpScoringService: IcpScoringService) {}

  @Process(IcpScoreAllJob.name)
  async handle({ workspaceId }: IcpScoreAllJobData): Promise<void> {
    const summary = await this.icpScoringService.scoreAll(workspaceId);

    if (!isDefined(summary)) {
      return;
    }

    this.logger.log(
      `Scored ${summary.scoredCompanyCount} companies (${summary.updatedCompanyCount} changed) and ${summary.scoredCandidateCount} candidates (${summary.updatedCandidateCount} changed) for workspace ${workspaceId}`,
    );
  }
}
