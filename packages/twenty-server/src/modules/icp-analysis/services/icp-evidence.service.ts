import { Injectable } from '@nestjs/common';

import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';
import { In } from 'typeorm';

import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/api/graphql/workspace-schema-builder/utils/get-flat-fields-for-flat-object-metadata.util';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import {
  ICP_MODEL_DEFAULT_LOST_STAGES,
  ICP_MODEL_DEFAULT_WON_STAGES,
} from 'src/modules/icp-analysis/constants/icp-model-default-stages.constant';
import {
  ICP_EVIDENCE_COMPANY_BATCH_SIZE,
  ICP_EVIDENCE_DEFAULT_WINDOW_MONTHS,
} from 'src/modules/icp-analysis/constants/icp-evidence-limits.constant';
import { type IcpModelWorkspaceEntity } from 'src/modules/icp-analysis/standard-objects/icp-model.workspace-entity';
import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';
import {
  type IcpDealWindow,
  type IcpEvidence,
} from 'src/modules/icp-analysis/types/icp-evidence.type';
import { buildIcpAttributeCatalog } from 'src/modules/icp-analysis/utils/build-icp-attribute-catalog.util';
import { buildIcpEvidenceRows } from 'src/modules/icp-analysis/utils/build-icp-evidence-rows.util';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';

const chunk = <TItem>(items: TItem[], size: number): TItem[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

const buildDealWindow = (
  model: Pick<IcpModelWorkspaceEntity, 'datasetStartDate' | 'datasetEndDate'>,
  now: Date,
): IcpDealWindow => {
  const defaultStart = new Date(now);

  defaultStart.setMonth(
    defaultStart.getMonth() - ICP_EVIDENCE_DEFAULT_WINDOW_MONTHS,
  );

  // No end by default: a deal can be marked won with a close date still ahead.
  return {
    start: new Date(model.datasetStartDate ?? defaultStart).toISOString(),
    end: isDefined(model.datasetEndDate)
      ? new Date(model.datasetEndDate).toISOString()
      : null,
  };
};

// Must run inside a workspace context. Reads use the caller's permissions, so
// the analysis only covers deals and companies the user can see.
@Injectable()
export class IcpEvidenceService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  async getAttributeCatalog(
    workspaceId: string,
  ): Promise<IcpCatalogAttribute[]> {
    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );

    const companyObjectMetadata =
      flatObjectMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.company.universalIdentifier
      ];

    if (!isDefined(companyObjectMetadata)) {
      return [];
    }

    return buildIcpAttributeCatalog(
      getFlatFieldsFromFlatObjectMetadata(
        companyObjectMetadata,
        flatFieldMetadataMaps,
      ),
    );
  }

  async buildEvidence({
    workspaceId,
    model,
    readPermissions,
    now = new Date(),
  }: {
    workspaceId: string;
    model: Pick<
      IcpModelWorkspaceEntity,
      'wonStages' | 'lostStages' | 'datasetStartDate' | 'datasetEndDate'
    >;
    readPermissions: RolePermissionConfig;
    now?: Date;
  }): Promise<IcpEvidence> {
    const wonStages = model.wonStages ?? ICP_MODEL_DEFAULT_WON_STAGES;
    const lostStages = model.lostStages ?? ICP_MODEL_DEFAULT_LOST_STAGES;
    const attributes = await this.getAttributeCatalog(workspaceId);

    const opportunityRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        OpportunityWorkspaceEntity,
        readPermissions,
      );

    const opportunities = await opportunityRepository.find({
      where: { stage: In([...wonStages, ...lostStages]) },
    });

    const companyIds = [
      ...new Set(
        opportunities
          .map(({ companyId }) => companyId)
          .filter((companyId): companyId is string => isDefined(companyId)),
      ),
    ];

    const companyRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        CompanyWorkspaceEntity,
        readPermissions,
      );

    const companiesById = new Map<string, Record<string, unknown>>();

    for (const companyIdBatch of chunk(
      companyIds,
      ICP_EVIDENCE_COMPANY_BATCH_SIZE,
    )) {
      const companies = await companyRepository.find({
        where: { id: In(companyIdBatch) },
      });

      for (const company of companies) {
        companiesById.set(company.id, { ...company });
      }
    }

    return buildIcpEvidenceRows({
      opportunities,
      companiesById,
      attributes,
      wonStages,
      window: buildDealWindow(model, now),
    });
  }
}
