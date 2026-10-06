import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewSortDirection,
} from 'twenty-sdk/define';

import { DATA_QUALITY } from 'src/constants/data-quality';
import {
  PEOPLE_TO_CLEAN_UP_VIEW_COMPANY_FIELD_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_EMAILS_FIELD_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_FILTER_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_SORT_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_UNIVERSAL_IDENTIFIER,
  PERSON_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
  PERSON_DATA_QUALITY_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
  PERSON_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const personFields = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields;

// Sorted by name so near-duplicate people sit next to each other.
export default defineView({
  universalIdentifier: PEOPLE_TO_CLEAN_UP_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'People to clean up',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  icon: 'IconSparkles',
  position: 1,
  fields: [
    {
      universalIdentifier: PEOPLE_TO_CLEAN_UP_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: personFields.name.universalIdentifier,
      position: 0,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier:
        PEOPLE_TO_CLEAN_UP_VIEW_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        PERSON_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier:
        PEOPLE_TO_CLEAN_UP_VIEW_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        PERSON_DATA_QUALITY_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 360,
    },
    {
      universalIdentifier:
        PEOPLE_TO_CLEAN_UP_VIEW_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        PERSON_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier:
        PEOPLE_TO_CLEAN_UP_VIEW_EMAILS_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: personFields.emails.universalIdentifier,
      position: 4,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier:
        PEOPLE_TO_CLEAN_UP_VIEW_COMPANY_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        personFields.company.universalIdentifier,
      position: 5,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: PEOPLE_TO_CLEAN_UP_VIEW_FILTER_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        PERSON_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: [DATA_QUALITY.POSSIBLE_DUPLICATE, DATA_QUALITY.INCOMPLETE],
    },
  ],
  sorts: [
    {
      universalIdentifier: PEOPLE_TO_CLEAN_UP_VIEW_SORT_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: personFields.name.universalIdentifier,
      direction: ViewSortDirection.ASC,
    },
  ],
});
