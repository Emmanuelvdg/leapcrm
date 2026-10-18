import { msg } from '@lingui/core/macro';
import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';
import {
  DateDisplayFormat,
  FieldMetadataType,
  RelationType,
} from 'twenty-shared/types';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type AllStandardObjectFieldName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-field-name.type';
import {
  type CreateStandardFieldArgs,
  createStandardFieldFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-field-flat-metadata.util';
import { createStandardRelationFieldFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-relation-field-flat-metadata.util';
export const buildProspectingCampaignStandardFlatFieldMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<
  CreateStandardFieldArgs<'prospectingCampaign', FieldMetadataType>,
  'context'
>): Record<
  AllStandardObjectFieldName<'prospectingCampaign'>,
  FlatFieldMetadata
> => {
  const base = {
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
    objectName,
    workspaceId,
  };

  return {
    id: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'id',
        type: FieldMetadataType.UUID,
        label: i18nLabel(
          msg({ message: `Id`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({ message: `Id`, context: 'fieldMetadata.description' }),
        ),
        icon: 'Icon123',
        isSystem: true,
        isNullable: false,
        isUIEditable: false,
        defaultValue: 'uuid',
      },
    }),
    createdAt: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'createdAt',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({ message: `Creation date`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Creation date`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconCalendar',
        isSystem: true,
        isNullable: false,
        isUIEditable: false,
        defaultValue: 'now',
        settings: { displayFormat: DateDisplayFormat.RELATIVE },
      },
    }),
    updatedAt: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'updatedAt',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({ message: `Last update`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Last time the record was changed`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconCalendarClock',
        isSystem: true,
        isNullable: false,
        isUIEditable: false,
        defaultValue: 'now',
        settings: { displayFormat: DateDisplayFormat.RELATIVE },
      },
    }),
    deletedAt: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'deletedAt',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({ message: `Deleted at`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Date when the record was deleted`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconCalendarMinus',
        isSystem: true,
        isNullable: true,
        isUIEditable: false,
        settings: { displayFormat: DateDisplayFormat.RELATIVE },
      },
    }),
    position: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'position',
        type: FieldMetadataType.POSITION,
        label: i18nLabel(
          msg({ message: `Position`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Prospecting campaign record position`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconHierarchy2',
        isSystem: true,
        isNullable: false,
        defaultValue: 0,
      },
    }),
    createdBy: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'createdBy',
        type: FieldMetadataType.ACTOR,
        label: i18nLabel(
          msg({ message: `Created by`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `The creator of the record`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconCreativeCommonsSa',
        isSystem: true,
        isUIEditable: false,
        isNullable: false,
        defaultValue: {
          source: "'MANUAL'",
          name: "'System'",
          workspaceMemberId: null,
        },
      },
    }),
    updatedBy: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'updatedBy',
        type: FieldMetadataType.ACTOR,
        label: i18nLabel(
          msg({ message: `Updated by`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `The workspace member who last updated the record`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconUserCircle',
        isSystem: true,
        isUIEditable: false,
        isNullable: false,
        defaultValue: {
          source: "'MANUAL'",
          name: "'System'",
          workspaceMemberId: null,
        },
      },
    }),
    searchVector: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'searchVector',
        type: FieldMetadataType.TS_VECTOR,
        label: i18nLabel(
          msg({ message: `Search vector`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Field used for full-text search`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconUser',
        isSystem: true,
        isNullable: true,
      },
    }),
    name: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'name',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Name`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `The campaign name`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconAbc',
        isNullable: true,
      },
    }),
    objective: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'objective',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Objective`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `What the campaign should find, in plain words`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconTarget',
        isNullable: true,
      },
    }),
    status: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'status',
        type: FieldMetadataType.SELECT,
        label: i18nLabel(
          msg({ message: `Status`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Where the campaign is in its run`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconProgressCheck',
        isNullable: false,
        isUIEditable: false,
        defaultValue: "'DRAFT'",
        options: [
          {
            id: '8cd8b392-b940-4265-a902-99586ce23043',
            value: 'DRAFT',
            label: i18nLabel(
              msg({ message: `Draft`, context: 'fieldMetadata.label' }),
            ),
            position: 0,
            color: 'gray',
          },
          {
            id: '76132b3b-d22e-49b2-b8e5-ce5c4fb2183a',
            value: 'RUNNING',
            label: i18nLabel(
              msg({ message: `Running`, context: 'fieldMetadata.label' }),
            ),
            position: 1,
            color: 'blue',
          },
          {
            id: 'db54ed48-e758-414c-903d-7a83d8afc071',
            value: 'PAUSED',
            label: i18nLabel(
              msg({ message: `Paused`, context: 'fieldMetadata.label' }),
            ),
            position: 2,
            color: 'yellow',
          },
          {
            id: '90395ded-8b37-407d-b51b-291b88191c02',
            value: 'COMPLETED',
            label: i18nLabel(
              msg({ message: `Completed`, context: 'fieldMetadata.label' }),
            ),
            position: 3,
            color: 'green',
          },
          {
            id: '6f3d3aad-3cda-42d1-bba0-62d31d27504a',
            value: 'CANCELLED',
            label: i18nLabel(
              msg({ message: `Cancelled`, context: 'fieldMetadata.label' }),
            ),
            position: 4,
            color: 'gray',
          },
          {
            id: 'f8642380-efd5-446d-90b4-9b41fb7806c3',
            value: 'FAILED',
            label: i18nLabel(
              msg({ message: `Failed`, context: 'fieldMetadata.label' }),
            ),
            position: 5,
            color: 'red',
          },
        ],
      },
    }),
    icp: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'icp',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({
            message: `Ideal customer profile`,
            context: 'fieldMetadata.label',
          }),
        ),
        description: i18nLabel(
          msg({
            message: `Markets, industries, size and exclusions the campaign targets`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconListDetails',
        isNullable: true,
      },
    }),
    icpVersion: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'icpVersion',
        type: FieldMetadataType.NUMBER,
        label: i18nLabel(
          msg({ message: `Profile version`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Increases every time the ideal customer profile changes`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconVersions',
        isNullable: false,
        isUIEditable: false,
        defaultValue: 1,
      },
    }),
    discoverySources: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'discoverySources',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Sources`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Discovery sources used by the campaign`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconDatabase',
        isNullable: true,
      },
    }),
    targetCandidateCount: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'targetCandidateCount',
        type: FieldMetadataType.NUMBER,
        label: i18nLabel(
          msg({ message: `Target count`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `How many companies the campaign should find before it stops`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconTargetArrow',
        isNullable: true,
      },
    }),
    candidatesFound: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'candidatesFound',
        type: FieldMetadataType.NUMBER,
        label: i18nLabel(
          msg({ message: `Companies found`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Number of companies the campaign has found so far`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconBuildingSkyscraper',
        isNullable: false,
        isUIEditable: false,
        defaultValue: 0,
      },
    }),
    lastRunAt: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'lastRunAt',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({ message: `Last run`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `When the campaign last ran discovery`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconClock',
        isNullable: true,
        isUIEditable: false,
        settings: { displayFormat: DateDisplayFormat.RELATIVE },
      },
    }),
    candidates: createStandardRelationFieldFlatMetadata({
      ...base,
      context: {
        type: FieldMetadataType.RELATION,
        morphId: null,
        fieldName: 'candidates',
        label: i18nLabel(
          msg({ message: `Candidates`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Companies found by the campaign`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconBuildingStore',
        isNullable: true,
        isUIEditable: false,
        targetObjectName: 'prospectCandidate',
        targetFieldName: 'campaign',
        settings: {
          relationType: RelationType.ONE_TO_MANY,
        },
      },
    }),
  };
};
