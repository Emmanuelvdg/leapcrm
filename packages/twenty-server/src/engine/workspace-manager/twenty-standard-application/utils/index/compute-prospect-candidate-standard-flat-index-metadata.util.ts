import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { IndexType } from 'src/engine/metadata-modules/index-metadata/types/indexType.types';
import { type AllStandardObjectIndexName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-index-name.type';
import {
  type CreateStandardIndexArgs,
  createStandardIndexFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/index/create-standard-index-flat-metadata.util';

export const buildProspectCandidateStandardFlatIndexMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<CreateStandardIndexArgs<'prospectCandidate'>, 'context'>): Record<
  AllStandardObjectIndexName<'prospectCandidate'>,
  FlatIndexMetadata
> => ({
  campaignIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'campaignIdIndex',
      relatedFieldNames: ['campaign'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  matchedCompanyIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'matchedCompanyIdIndex',
      relatedFieldNames: ['matchedCompany'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  // Discovery is retried and may run the same page twice; the database has
  // the final say on one candidate per company per campaign.
  campaignIdentityKeyUniqueIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'campaignIdentityKeyUniqueIndex',
      relatedFieldNames: ['campaign', 'identityKey'],
      isUnique: true,
      indexWhereClause: '"deletedAt" IS NULL',
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  searchVectorGinIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'searchVectorGinIndex',
      relatedFieldNames: ['searchVector'],
      indexType: IndexType.GIN,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
});
