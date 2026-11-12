import { Injectable } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { FeatureFlagKey } from 'twenty-shared/types';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { type CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { ICP_CANDIDATE_SCORING_FIELD_NAMES } from 'src/modules/icp-analysis/scoring/constants/icp-candidate-scoring-field-names.constant';
import { ICP_COMPANY_BOOKKEEPING_FIELD_NAMES } from 'src/modules/icp-analysis/scoring/constants/icp-company-bookkeeping-field-names.constant';
import {
  IcpScoreRecordsJob,
  type IcpScoreRecordsJobData,
} from 'src/modules/icp-analysis/scoring/jobs/icp-score-records.job';
import { type ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

// Registered in the API server and the worker: discovery writes candidates
// from the worker, and database events are only seen by the process that
// made the write.
@Injectable()
export class IcpScoringListener {
  constructor(
    @InjectMessageQueue(MessageQueue.workspaceQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  @OnDatabaseBatchEvent('company', DatabaseEventAction.CREATED)
  async handleCompanyCreated(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<CompanyWorkspaceEntity>
    >,
  ): Promise<void> {
    await this.enqueue({
      workspaceId: payload.workspaceId,
      companyIds: payload.events.map(({ recordId }) => recordId),
      candidateIds: [],
      changedCompanyFieldNames: null,
    });
  }

  @OnDatabaseBatchEvent('company', DatabaseEventAction.UPDATED)
  async handleCompanyUpdated(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<CompanyWorkspaceEntity>
    >,
  ): Promise<void> {
    const changedCompanies = payload.events
      .map((event) => ({
        recordId: event.recordId,
        changedFieldNames: (event.properties.updatedFields ?? []).filter(
          (fieldName) => !ICP_COMPANY_BOOKKEEPING_FIELD_NAMES.has(fieldName),
        ),
      }))
      .filter(({ changedFieldNames }) => changedFieldNames.length > 0);

    await this.enqueue({
      workspaceId: payload.workspaceId,
      companyIds: changedCompanies.map(({ recordId }) => recordId),
      candidateIds: [],
      changedCompanyFieldNames: [
        ...new Set(
          changedCompanies.flatMap(
            ({ changedFieldNames }) => changedFieldNames,
          ),
        ),
      ],
    });
  }

  @OnDatabaseBatchEvent('prospectCandidate', DatabaseEventAction.CREATED)
  async handleCandidateCreated(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<ProspectCandidateWorkspaceEntity>
    >,
  ): Promise<void> {
    await this.enqueue({
      workspaceId: payload.workspaceId,
      companyIds: [],
      candidateIds: payload.events.map(({ recordId }) => recordId),
      changedCompanyFieldNames: null,
    });
  }

  @OnDatabaseBatchEvent('prospectCandidate', DatabaseEventAction.UPDATED)
  async handleCandidateUpdated(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<ProspectCandidateWorkspaceEntity>
    >,
  ): Promise<void> {
    await this.enqueue({
      workspaceId: payload.workspaceId,
      companyIds: [],
      candidateIds: payload.events
        .filter((event) =>
          (event.properties.updatedFields ?? []).some((fieldName) =>
            ICP_CANDIDATE_SCORING_FIELD_NAMES.has(fieldName),
          ),
        )
        .map(({ recordId }) => recordId),
      changedCompanyFieldNames: null,
    });
  }

  private async enqueue(data: IcpScoreRecordsJobData): Promise<void> {
    if (data.companyIds.length === 0 && data.candidateIds.length === 0) {
      return;
    }

    const isIcpAnalysisEnabled = await this.featureFlagService.isFeatureEnabled(
      FeatureFlagKey.IS_ICP_ANALYSIS_ENABLED,
      data.workspaceId,
    );

    if (!isIcpAnalysisEnabled) {
      return;
    }

    await this.messageQueueService.add<IcpScoreRecordsJobData>(
      IcpScoreRecordsJob.name,
      data,
    );
  }
}
