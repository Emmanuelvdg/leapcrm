import { msg } from '@lingui/core/macro';
import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';
import { type IcpTier } from 'twenty-shared/icp-analysis';
import { DateDisplayFormat, FieldMetadataType } from 'twenty-shared/types';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import {
  type CreateStandardFieldArgs,
  createStandardFieldFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-field-flat-metadata.util';

type IcpScoreFieldName =
  | 'icpScore'
  | 'icpTier'
  | 'icpScoreReasons'
  | 'icpCoverage'
  | 'icpModelVersion'
  | 'icpScoredAt';

// Scores are written by the scoring job, never by hand, so none of these
// fields are editable in the UI.
export const buildIcpScoreStandardFlatFieldMetadatas = ({
  tierOptionIds,
  ...args
}: Omit<
  CreateStandardFieldArgs<'company' | 'prospectCandidate', FieldMetadataType>,
  'context'
> & {
  tierOptionIds: Record<IcpTier, string>;
}): Record<IcpScoreFieldName, FlatFieldMetadata> => ({
  icpScore: createStandardFieldFlatMetadata({
    ...args,
    context: {
      fieldName: 'icpScore',
      type: FieldMetadataType.NUMBER,
      label: i18nLabel(
        msg({ message: `ICP score`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Fit with the active ideal customer profile model, from 0 to 100`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconTarget',
      isNullable: true,
      isUIEditable: false,
    },
  }),
  icpTier: createStandardFieldFlatMetadata({
    ...args,
    context: {
      fieldName: 'icpTier',
      type: FieldMetadataType.SELECT,
      label: i18nLabel(
        msg({ message: `ICP tier`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Priority, target, nurture or excluded, from the ICP score`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconStack2',
      isNullable: true,
      isUIEditable: false,
      options: [
        {
          id: tierOptionIds.PRIORITY,
          value: 'PRIORITY',
          label: i18nLabel(
            msg({ message: `Priority`, context: 'fieldMetadata.label' }),
          ),
          position: 0,
          color: 'green',
        },
        {
          id: tierOptionIds.TARGET,
          value: 'TARGET',
          label: i18nLabel(
            msg({ message: `Target`, context: 'fieldMetadata.label' }),
          ),
          position: 1,
          color: 'blue',
        },
        {
          id: tierOptionIds.NURTURE,
          value: 'NURTURE',
          label: i18nLabel(
            msg({ message: `Nurture`, context: 'fieldMetadata.label' }),
          ),
          position: 2,
          color: 'yellow',
        },
        {
          id: tierOptionIds.EXCLUDED,
          value: 'EXCLUDED',
          label: i18nLabel(
            msg({ message: `Excluded`, context: 'fieldMetadata.label' }),
          ),
          position: 3,
          color: 'gray',
        },
      ],
    },
  }),
  icpScoreReasons: createStandardFieldFlatMetadata({
    ...args,
    context: {
      fieldName: 'icpScoreReasons',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `ICP reasons`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Which criteria raised or lowered the ICP score`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconListDetails',
      isNullable: true,
      isUIEditable: false,
    },
  }),
  icpCoverage: createStandardFieldFlatMetadata({
    ...args,
    context: {
      fieldName: 'icpCoverage',
      type: FieldMetadataType.NUMBER,
      label: i18nLabel(
        msg({ message: `ICP coverage`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Share of the model's weight the score could use because the data was known, from 0 to 100`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconPercentage',
      isNullable: true,
      isUIEditable: false,
    },
  }),
  icpModelVersion: createStandardFieldFlatMetadata({
    ...args,
    context: {
      fieldName: 'icpModelVersion',
      type: FieldMetadataType.NUMBER,
      label: i18nLabel(
        msg({ message: `ICP model version`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Version of the ICP model that produced the score`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconVersions',
      isNullable: true,
      isUIEditable: false,
    },
  }),
  icpScoredAt: createStandardFieldFlatMetadata({
    ...args,
    context: {
      fieldName: 'icpScoredAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `ICP scored`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `When the ICP score was last computed`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconClock',
      isNullable: true,
      isUIEditable: false,
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
  }),
});
