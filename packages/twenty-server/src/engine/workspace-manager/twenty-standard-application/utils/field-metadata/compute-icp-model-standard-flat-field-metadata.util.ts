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
export const buildIcpModelStandardFlatFieldMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<
  CreateStandardFieldArgs<'icpModel', FieldMetadataType>,
  'context'
>): Record<AllStandardObjectFieldName<'icpModel'>, FlatFieldMetadata> => {
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
            message: `ICP model record position`,
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
            message: `The model name`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconAbc',
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
            message: `Only the active model scores companies and candidates`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconProgressCheck',
        isNullable: false,
        isUIEditable: false,
        defaultValue: "'DRAFT'",
        options: [
          {
            id: 'c6755990-516e-4404-9643-7592333dfc78',
            value: 'DRAFT',
            label: i18nLabel(
              msg({ message: `Draft`, context: 'fieldMetadata.label' }),
            ),
            position: 0,
            color: 'gray',
          },
          {
            id: '873d18f4-b461-4565-90bc-263e613a80fc',
            value: 'ACTIVE',
            label: i18nLabel(
              msg({ message: `Active`, context: 'fieldMetadata.label' }),
            ),
            position: 1,
            color: 'green',
          },
          {
            id: 'aeabff90-fe25-4d81-87c1-42b596786fda',
            value: 'ARCHIVED',
            label: i18nLabel(
              msg({ message: `Archived`, context: 'fieldMetadata.label' }),
            ),
            position: 2,
            color: 'gray',
          },
        ],
      },
    }),
    version: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'version',
        type: FieldMetadataType.NUMBER,
        label: i18nLabel(
          msg({ message: `Version`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Increases each time the model is duplicated to retrain it`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconVersions',
        isNullable: false,
        isUIEditable: false,
        defaultValue: 1,
      },
    }),
    wonStages: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'wonStages',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Won stages`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Opportunity stages that count as won`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconFlag',
        isNullable: true,
      },
    }),
    lostStages: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'lostStages',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Lost stages`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Opportunity stages that count as lost`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconCircleX',
        isNullable: true,
      },
    }),
    datasetStartDate: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'datasetStartDate',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({ message: `Deals closed from`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Start of the window of closed deals the model learns from`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconCalendarEvent',
        isNullable: true,
      },
    }),
    datasetEndDate: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'datasetEndDate',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({
            message: `Deals closed until`,
            context: 'fieldMetadata.label',
          }),
        ),
        description: i18nLabel(
          msg({
            message: `End of the window of closed deals the model learns from`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconCalendarEvent',
        isNullable: true,
      },
    }),
    criteria: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'criteria',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Criteria`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Weighted criteria the model scores against`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconListCheck',
        isNullable: true,
      },
    }),
    tierThresholds: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'tierThresholds',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Tier thresholds`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Minimum scores for the priority, target and nurture tiers`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconStack2',
        isNullable: true,
      },
    }),
    analysis: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'analysis',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Analysis`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Deal counts, coverage and win rate patterns from the last analysis`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconChartBar',
        isNullable: true,
        isUIEditable: false,
      },
    }),
    backtest: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'backtest',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Back-test`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `How the criteria scored past won and lost deals`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconChartLine',
        isNullable: true,
        isUIEditable: false,
      },
    }),
    insights: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'insights',
        type: FieldMetadataType.RICH_TEXT,
        label: i18nLabel(
          msg({ message: `Insights`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `What customers said was happening before they reached out`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconNotes',
        isNullable: true,
      },
    }),
    analyzedAt: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'analyzedAt',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({ message: `Analyzed`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `When the closed deals were last analyzed`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconClock',
        isNullable: true,
        isUIEditable: false,
        settings: { displayFormat: DateDisplayFormat.RELATIVE },
      },
    }),
    activatedAt: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'activatedAt',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({ message: `Activated`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `When the model started scoring records`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconTarget',
        isNullable: true,
        isUIEditable: false,
        settings: { displayFormat: DateDisplayFormat.RELATIVE },
      },
    }),
    timelineActivities: createStandardRelationFieldFlatMetadata({
      ...base,
      context: {
        type: FieldMetadataType.RELATION,
        morphId: null,
        fieldName: 'timelineActivities',
        isSystemSideEffect: true,
        label: i18nLabel(
          msg({ message: `Events`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Events linked to the ICP model`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconTimelineEvent',
        isNullable: true,
        targetObjectName: 'timelineActivity',
        targetFieldName: 'targetIcpModel',
        settings: {
          relationType: RelationType.ONE_TO_MANY,
        },
      },
    }),
  };
};
