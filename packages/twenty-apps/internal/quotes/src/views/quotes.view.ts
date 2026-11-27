import {
  defineView,
  getFieldUniversalIdentifier,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  QUOTE_COMPANY_RELATION_UNIVERSAL_IDENTIFIER,
  QUOTE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  QUOTE_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
  QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
  QUOTE_OPPORTUNITY_RELATION_UNIVERSAL_IDENTIFIER,
  QUOTE_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  QUOTE_TOTAL_FIELD_UNIVERSAL_IDENTIFIER,
  QUOTE_VALID_UNTIL_FIELD_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_COMPANY_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_NAME_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_NUMBER_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_OPPORTUNITY_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_SORT_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_STATUS_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_TOTAL_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_VALID_UNTIL_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const column = (
  universalIdentifier: string,
  fieldMetadataUniversalIdentifier: string,
  position: number,
  size: number,
) => ({
  universalIdentifier,
  fieldMetadataUniversalIdentifier,
  position,
  isVisible: true,
  size,
});

export default defineView({
  universalIdentifier: QUOTES_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All quotes',
  objectUniversalIdentifier: QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconFileInvoice',
  position: 0,
  fields: [
    column(
      QUOTES_VIEW_NAME_UNIVERSAL_IDENTIFIER,
      QUOTE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      0,
      220,
    ),
    column(
      QUOTES_VIEW_NUMBER_UNIVERSAL_IDENTIFIER,
      QUOTE_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
      1,
      130,
    ),
    column(
      QUOTES_VIEW_STATUS_UNIVERSAL_IDENTIFIER,
      QUOTE_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      2,
      140,
    ),
    column(
      QUOTES_VIEW_TOTAL_UNIVERSAL_IDENTIFIER,
      QUOTE_TOTAL_FIELD_UNIVERSAL_IDENTIFIER,
      3,
      140,
    ),
    column(
      QUOTES_VIEW_OPPORTUNITY_UNIVERSAL_IDENTIFIER,
      QUOTE_OPPORTUNITY_RELATION_UNIVERSAL_IDENTIFIER,
      4,
      190,
    ),
    column(
      QUOTES_VIEW_COMPANY_UNIVERSAL_IDENTIFIER,
      QUOTE_COMPANY_RELATION_UNIVERSAL_IDENTIFIER,
      5,
      170,
    ),
    column(
      QUOTES_VIEW_VALID_UNTIL_UNIVERSAL_IDENTIFIER,
      QUOTE_VALID_UNTIL_FIELD_UNIVERSAL_IDENTIFIER,
      6,
      130,
    ),
  ],
  sorts: [
    {
      universalIdentifier: QUOTES_VIEW_SORT_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: getFieldUniversalIdentifier({
        applicationUniversalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
        objectUniversalIdentifier: QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
        name: 'createdAt',
      }),
      direction: ViewSortDirection.DESC,
    },
  ],
});
