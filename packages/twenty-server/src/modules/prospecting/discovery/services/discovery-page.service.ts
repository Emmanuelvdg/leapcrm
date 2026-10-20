import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { GlobalCompanyDirectoryService } from 'src/engine/core-modules/global-company-directory/services/global-company-directory.service';
import { type ClaimedProspectingJob } from 'src/engine/core-modules/prospecting-job/services/prospecting-job-ledger.service';
import { type CreateProspectingJobInput } from 'src/engine/core-modules/prospecting-job/types/create-prospecting-job-input.type';
import { type ProspectingJobPayload } from 'src/engine/core-modules/prospecting-job/types/prospecting-job-payload.type';
import { ProspectCampaignCandidateCounterService } from 'src/modules/prospecting/candidate/services/prospect-campaign-candidate-counter.service';
import { ProspectCandidateWriterService } from 'src/modules/prospecting/candidate/services/prospect-candidate-writer.service';
import { type DiscoveredCompany } from 'src/modules/prospecting/candidate/types/discovered-company.type';
import { buildCandidateSource } from 'src/modules/prospecting/candidate/utils/build-candidate-source.util';
import { DISCOVERY_PAGE_SIZE } from 'src/modules/prospecting/discovery/constants/discovery-page-size.constant';
import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';
import { DiscoveryProviderRegistryService } from 'src/modules/prospecting/discovery/services/discovery-provider-registry.service';
import {
  buildDiscoveryStages,
  DIRECTORY_DISCOVERY_STAGE_ID,
  type DiscoveryStage,
  isSameDiscoveryStage,
} from 'src/modules/prospecting/discovery/utils/build-discovery-stages.util';
import {
  buildPublicCompanyObservation,
  mapDirectoryCompanyToDiscoveredCompany,
} from 'src/modules/prospecting/discovery/utils/directory-discovery-record.util';
import {
  buildDiscoverPageJob,
  parseDiscoverPageJobInput,
} from 'src/modules/prospecting/discovery/utils/discover-page-job.util';
import { filterDiscoveryRecords } from 'src/modules/prospecting/discovery/utils/filter-discovery-records.util';
import { getDiscoverySearchTerms } from 'src/modules/prospecting/discovery/utils/get-discovery-search-terms.util';
import { isRetryableDiscoveryProviderExceptionCode } from 'src/modules/prospecting/discovery/utils/is-retryable-discovery-provider-exception-code.util';
import { ProspectingException } from 'src/modules/prospecting/exceptions/prospecting.exception';
import { ProspectingCampaignWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospecting-campaign.workspace-entity';
import { type ProspectingIcp } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';
import { startableProspectingCampaignSchema } from 'src/modules/prospecting/zod-schemas/startable-prospecting-campaign.zod-schema';

type FetchedPage = {
  discoveredCompanies: {
    discoveredCompany: DiscoveredCompany;
    globalCompanyId: string | null;
  }[];
  nextCursor: string | null;
  errorCode: string | null;
};

export type DiscoveryPageOutcome = {
  result: ProspectingJobPayload;
  followUpJobs: CreateProspectingJobInput[];
  isCampaignFinished: boolean;
};

// Must run inside a workspace context with the system auth context.
@Injectable()
export class DiscoveryPageService {
  private readonly logger = new Logger(DiscoveryPageService.name);

  constructor(
    private readonly discoveryProviderRegistryService: DiscoveryProviderRegistryService,
    private readonly globalCompanyDirectoryService: GlobalCompanyDirectoryService,
    private readonly prospectCandidateWriterService: ProspectCandidateWriterService,
    private readonly prospectCampaignCandidateCounterService: ProspectCampaignCandidateCounterService,
  ) {}

  async processPage({
    workspaceId,
    campaign,
    claimedJob,
  }: {
    workspaceId: string;
    campaign: ProspectingCampaignWorkspaceEntity;
    claimedJob: ClaimedProspectingJob;
  }): Promise<DiscoveryPageOutcome> {
    const startableCampaign =
      startableProspectingCampaignSchema.safeParse(campaign);
    const jobInput = parseDiscoverPageJobInput(claimedJob.job.input);

    if (!startableCampaign.success || !isDefined(jobInput)) {
      throw new ProspectingException(
        `Discovery job ${claimedJob.job.id} has an invalid campaign or input`,
        'CAMPAIGN_NOT_STARTABLE',
      );
    }

    const { icp, discoverySources, targetCandidateCount } =
      startableCampaign.data;
    const stages = buildDiscoveryStages({
      countryCodes: icp.targetGeographies.map(({ countryCode }) => countryCode),
      providerIds: discoverySources,
    });
    const stage: DiscoveryStage = {
      providerId: jobInput.providerId,
      countryCode: jobInput.countryCode,
    };
    const stageIndex = stages.findIndex((candidateStage) =>
      isSameDiscoveryStage(candidateStage, stage),
    );
    const remainingCandidateCount =
      targetCandidateCount - campaign.candidatesFound;

    // The sources changed while the campaign was paused and this stage no
    // longer exists, or the target was already reached.
    if (stageIndex === -1 || remainingCandidateCount <= 0) {
      return {
        result: { providerId: stage.providerId, isSkipped: true },
        followUpJobs: [],
        isCampaignFinished: true,
      };
    }

    const fetchedPage = await this.fetchPage({
      workspaceId,
      campaignId: campaign.id,
      icp,
      stage,
      cursor: jobInput.cursor,
      pageSize: Math.min(DISCOVERY_PAGE_SIZE, remainingCandidateCount),
      isLastAttempt: claimedJob.job.attempts >= claimedJob.job.maxAttempts,
    });

    const keptCompanies = this.filterCompanies(fetchedPage, icp);

    const writtenCandidates =
      await this.prospectCandidateWriterService.writeDiscoveredCompanies({
        workspaceId,
        campaignId: campaign.id,
        discoveredCompanies: keptCompanies.map(
          ({ discoveredCompany }) => discoveredCompany,
        ),
        writePermissions: { shouldBypassPermissionChecks: true },
      });

    await this.shareWithDirectory({
      workspaceId,
      stage,
      companies: keptCompanies.map((company, index) => ({
        ...company,
        candidateId: writtenCandidates[index].candidateId,
      })),
    });

    const candidatesFound =
      await this.prospectCampaignCandidateCounterService.refreshCandidatesFound(
        {
          workspaceId,
          campaignId: campaign.id,
        },
      );

    const nextJob = this.buildNextJob({
      workspaceId,
      campaign,
      stages,
      stageIndex,
      jobInput,
      nextCursor: fetchedPage.nextCursor,
      isTargetReached: candidatesFound >= targetCandidateCount,
    });

    return {
      result: {
        providerId: stage.providerId,
        countryCode: stage.countryCode,
        recordCount: fetchedPage.discoveredCompanies.length,
        createdCount: writtenCandidates.filter(
          ({ outcome }) => outcome === 'CREATED',
        ).length,
        mergedCount: writtenCandidates.filter(
          ({ outcome }) => outcome === 'MERGED',
        ).length,
        candidatesFound,
        errorCode: fetchedPage.errorCode,
      },
      followUpJobs: isDefined(nextJob) ? [nextJob] : [],
      isCampaignFinished: !isDefined(nextJob),
    };
  }

  private async fetchPage({
    workspaceId,
    campaignId,
    icp,
    stage,
    cursor,
    pageSize,
    isLastAttempt,
  }: {
    workspaceId: string;
    campaignId: string;
    icp: ProspectingIcp;
    stage: DiscoveryStage;
    cursor: string | null;
    pageSize: number;
    isLastAttempt: boolean;
  }): Promise<FetchedPage> {
    if (stage.providerId === DIRECTORY_DISCOVERY_STAGE_ID) {
      const directoryCompanies =
        await this.globalCompanyDirectoryService.findPublicCompanies({
          countryCode: stage.countryCode,
          searchTerms: getDiscoverySearchTerms([
            ...icp.targetIndustries,
            ...icp.keywords,
          ]),
          afterGlobalCompanyId: cursor,
          limit: pageSize,
        });

      return {
        discoveredCompanies: directoryCompanies.flatMap((directoryCompany) => {
          const discoveredCompany =
            mapDirectoryCompanyToDiscoveredCompany(directoryCompany);

          return isDefined(discoveredCompany)
            ? [
                {
                  discoveredCompany,
                  globalCompanyId: directoryCompany.globalCompany.id,
                },
              ]
            : [];
        }),
        nextCursor:
          directoryCompanies.length === pageSize
            ? (directoryCompanies[directoryCompanies.length - 1]?.globalCompany
                .id ?? null)
            : null,
        errorCode: null,
      };
    }

    const provider = this.discoveryProviderRegistryService.getProviderOrThrow(
      stage.providerId,
    );

    try {
      const page = await provider.search(
        { countryCode: stage.countryCode, icp, cursor, pageSize },
        { workspaceId, campaignId },
      );

      return {
        discoveredCompanies: page.records.map((record) => ({
          discoveredCompany: {
            record,
            sources: [buildCandidateSource(record)],
          },
          globalCompanyId: null,
        })),
        nextCursor: page.nextCursor,
        errorCode: null,
      };
    } catch (error) {
      // A source that cannot serve this campaign, or keeps failing, is skipped
      // so the remaining sources still run.
      if (
        error instanceof DiscoveryProviderException &&
        (!isRetryableDiscoveryProviderExceptionCode(error.code) ||
          isLastAttempt)
      ) {
        this.logger.warn(
          `Skipping ${stage.providerId} for campaign ${campaignId}: ${error.message}`,
        );

        return {
          discoveredCompanies: [],
          nextCursor: null,
          errorCode: error.code,
        };
      }

      throw error;
    }
  }

  private filterCompanies(fetchedPage: FetchedPage, icp: ProspectingIcp) {
    const keptRecords = new Set(
      filterDiscoveryRecords({
        records: fetchedPage.discoveredCompanies.map(
          ({ discoveredCompany }) => discoveredCompany.record,
        ),
        icp,
      }),
    );

    return fetchedPage.discoveredCompanies.filter(({ discoveredCompany }) =>
      keptRecords.has(discoveredCompany.record),
    );
  }

  // Directory upkeep never blocks discovery: a failed write is logged and the
  // candidate stays as it is.
  private async shareWithDirectory({
    workspaceId,
    stage,
    companies,
  }: {
    workspaceId: string;
    stage: DiscoveryStage;
    companies: {
      discoveredCompany: DiscoveredCompany;
      globalCompanyId: string | null;
      candidateId: string;
    }[];
  }): Promise<void> {
    const providerCapabilities =
      stage.providerId === DIRECTORY_DISCOVERY_STAGE_ID
        ? null
        : this.discoveryProviderRegistryService
            .getProviderOrThrow(stage.providerId)
            .getCapabilities();

    for (const {
      discoveredCompany,
      globalCompanyId,
      candidateId,
    } of companies) {
      try {
        const directoryEntryId =
          globalCompanyId ??
          (providerCapabilities?.isDirectoryShareable
            ? await this.globalCompanyDirectoryService.recordPublicCompany(
                buildPublicCompanyObservation({
                  record: discoveredCompany.record,
                  sourceRank: providerCapabilities.precisionRank,
                }),
              )
            : null);

        if (isDefined(directoryEntryId)) {
          await this.globalCompanyDirectoryService.linkCandidate({
            workspaceId,
            candidateId,
            globalCompanyId: directoryEntryId,
          });
        }
      } catch (error) {
        this.logger.warn(
          `Could not update the directory for candidate ${candidateId}: ${error}`,
        );
      }
    }
  }

  private buildNextJob({
    workspaceId,
    campaign,
    stages,
    stageIndex,
    jobInput,
    nextCursor,
    isTargetReached,
  }: {
    workspaceId: string;
    campaign: ProspectingCampaignWorkspaceEntity;
    stages: DiscoveryStage[];
    stageIndex: number;
    jobInput: { pageIndex: number };
    nextCursor: string | null;
    isTargetReached: boolean;
  }): CreateProspectingJobInput | null {
    if (isTargetReached) {
      return null;
    }

    if (isDefined(nextCursor)) {
      return buildDiscoverPageJob({
        workspaceId,
        campaignId: campaign.id,
        icpVersion: campaign.icpVersion,
        stage: stages[stageIndex],
        cursor: nextCursor,
        pageIndex: jobInput.pageIndex + 1,
      });
    }

    const nextStage = stages[stageIndex + 1];

    return isDefined(nextStage)
      ? buildDiscoverPageJob({
          workspaceId,
          campaignId: campaign.id,
          icpVersion: campaign.icpVersion,
          stage: nextStage,
          cursor: null,
          pageIndex: 0,
        })
      : null;
  }
}
