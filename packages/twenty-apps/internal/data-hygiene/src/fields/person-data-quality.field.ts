import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { buildDataQualityOptions } from 'src/constants/data-quality-options';
import {
  PERSON_DATA_QUALITY_CLEAN_OPTION_ID,
  PERSON_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
  PERSON_DATA_QUALITY_INCOMPLETE_OPTION_ID,
  PERSON_DATA_QUALITY_POSSIBLE_DUPLICATE_OPTION_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'dataQuality',
  type: FieldType.SELECT,
  label: 'Data quality',
  description:
    'Whether this person looks clean, is missing key details, or may be a duplicate of another person.',
  icon: 'IconSparkles',
  isNullable: true,
  isUIEditable: false,
  options: buildDataQualityOptions({
    cleanOptionId: PERSON_DATA_QUALITY_CLEAN_OPTION_ID,
    incompleteOptionId: PERSON_DATA_QUALITY_INCOMPLETE_OPTION_ID,
    possibleDuplicateOptionId: PERSON_DATA_QUALITY_POSSIBLE_DUPLICATE_OPTION_ID,
  }),
});
