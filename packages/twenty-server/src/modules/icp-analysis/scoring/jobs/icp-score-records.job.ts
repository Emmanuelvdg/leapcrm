import { Injectable } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { IcpScoringService } from 'src/modules/icp-analysis/scoring/services/icp-scoring.service';

export type IcpScoreRecordsJobData = {
  workspaceId: string;
  companyIds: string[];
  candidateIds: string[];
  changedCompanyFieldNames: string[] | null;
};

@Injectable()
@Processor(MessageQueue.workspaceQueue)
export class IcpScoreRecordsJob {
  constructor(private readonly icpScoringService: IcpScoringService) {}

  @Process(IcpScoreRecordsJob.name)
  async handle(data: IcpScoreRecordsJobData): Promise<void> {
    await this.icpScoringService.scoreRecords(data);
  }
}
