import { type ObjectRecordBaseEvent } from 'twenty-shared/database-events';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { type FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { type WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { type TimelineActivityRepository } from 'src/modules/timeline/repositories/timeline-activity.repository';
import { TimelineActivityService } from 'src/modules/timeline/services/timeline-activity.service';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const CUSTOM_FIELD_ID = '6a1f1d0e-5a52-4a83-9a40-5e0a7b7a7a05';

const buildCompanyMetadata = () => {
  const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: new Date().toISOString(),
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: '20202020-0000-0000-0000-0000000000b1',
    }).allFlatEntityMaps;

  const company =
    flatObjectMetadataMaps.byUniversalIdentifier[
      STANDARD_OBJECTS.company.universalIdentifier
    ];

  if (!isDefined(company)) {
    throw new Error('Standard company object missing');
  }

  // A workspace that already had its own icpScore field kept it instead of
  // the standard one, and its changes must still reach the timeline.
  const companyFields = Object.values(
    flatFieldMetadataMaps.byUniversalIdentifier,
  ).filter(
    (field): field is FlatFieldMetadata =>
      isDefined(field) &&
      field.objectMetadataId === company.id &&
      field.universalIdentifier !==
        STANDARD_OBJECTS.company.fields.icpScore.universalIdentifier,
  );

  const nameField = companyFields.find(({ name }) => name === 'name');

  if (!isDefined(nameField)) {
    throw new Error('Standard company name field missing');
  }

  const customField: FlatFieldMetadata = {
    ...nameField,
    id: CUSTOM_FIELD_ID,
    universalIdentifier: CUSTOM_FIELD_ID,
    name: 'icpScore',
  };

  return {
    companyObjectMetadata: {
      ...company,
      fieldIds: [...companyFields.map(({ id }) => id), CUSTOM_FIELD_ID],
    },
    flatFieldMetadataMaps: {
      ...flatFieldMetadataMaps,
      byUniversalIdentifier: {
        ...flatFieldMetadataMaps.byUniversalIdentifier,
        [CUSTOM_FIELD_ID]: customField,
      },
      universalIdentifierById: {
        ...flatFieldMetadataMaps.universalIdentifierById,
        [CUSTOM_FIELD_ID]: CUSTOM_FIELD_ID,
      },
    },
  };
};

describe('TimelineActivityService', () => {
  it('keeps position and standard ICP score changes out of the timeline diff', async () => {
    const { companyObjectMetadata, flatFieldMetadataMaps } =
      buildCompanyMetadata();

    const service = new TimelineActivityService(
      {} as TimelineActivityRepository,
      {} as FeatureFlagService,
      {} as GlobalWorkspaceOrmManager,
      {
        getOrRecomputeManyOrAllFlatEntityMaps: jest
          .fn()
          .mockResolvedValue({ flatFieldMetadataMaps }),
      } as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService,
    );

    const event = {
      recordId: 'company-1',
      properties: {
        diff: {
          name: { before: 'Acme', after: 'Acme Corp' },
          position: { before: 1, after: 2 },
          icpScore: { before: 'B', after: 'A' },
          icpTier: { before: 'NURTURE', after: 'PRIORITY' },
          icpScoredAt: { before: null, after: '2026-11-08T00:00:00.000Z' },
        },
      },
    } as unknown as ObjectRecordBaseEvent;

    const [filteredEvent] = await service[
      'excludeUntrackedFieldsFromEventsDiff'
    ]({
      events: [event],
      objectMetadata: companyObjectMetadata,
      workspaceId: WORKSPACE_ID,
    });

    expect(Object.keys(filteredEvent.properties.diff ?? {})).toEqual([
      'name',
      'icpScore',
    ]);
  });
});
