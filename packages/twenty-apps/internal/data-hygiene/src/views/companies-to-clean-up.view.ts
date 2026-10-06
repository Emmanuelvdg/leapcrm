import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewSortDirection,
} from 'twenty-sdk/define';

import { DATA_QUALITY } from 'src/constants/data-quality';
import {
  COMPANIES_TO_CLEAN_UP_VIEW_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
  COMPANIES_TO_CLEAN_UP_VIEW_DOMAIN_FIELD_UNIVERSAL_IDENTIFIER,
  COMPANIES_TO_CLEAN_UP_VIEW_FILTER_UNIVERSAL_IDENTIFIER,
  COMPANIES_TO_CLEAN_UP_VIEW_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
  COMPANIES_TO_CLEAN_UP_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  COMPANIES_TO_CLEAN_UP_VIEW_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
  COMPANIES_TO_CLEAN_UP_VIEW_SORT_UNIVERSAL_IDENTIFIER,
  COMPANIES_TO_CLEAN_UP_VIEW_UNIVERSAL_IDENTIFIER,
  COMPANY_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
  COMPANY_DATA_QUALITY_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
  COMPANY_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const companyFields = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.fields;

// Sorted by name so near-duplicate names sit next to each other.
export default defineView({
  universalIdentifier: COMPANIES_TO_CLEAN_UP_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Companies to clean up',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  icon: 'IconSparkles',
  position: 1,
  fields: [
    {
      universalIdentifier:
        COMPANIES_TO_CLEAN_UP_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: companyFields.name.universalIdentifier,
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier:
        COMPANIES_TO_CLEAN_UP_VIEW_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        COMPANY_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier:
        COMPANIES_TO_CLEAN_UP_VIEW_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        COMPANY_DATA_QUALITY_ISSUES_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 360,
    },
    {
      universalIdentifier:
        COMPANIES_TO_CLEAN_UP_VIEW_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        COMPANY_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier:
        COMPANIES_TO_CLEAN_UP_VIEW_DOMAIN_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        companyFields.domainName.universalIdentifier,
      position: 4,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: COMPANIES_TO_CLEAN_UP_VIEW_FILTER_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        COMPANY_DATA_QUALITY_FIELD_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: [DATA_QUALITY.POSSIBLE_DUPLICATE, DATA_QUALITY.INCOMPLETE],
    },
  ],
  sorts: [
    {
      universalIdentifier: COMPANIES_TO_CLEAN_UP_VIEW_SORT_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: companyFields.name.universalIdentifier,
      direction: ViewSortDirection.ASC,
    },
  ],
});
