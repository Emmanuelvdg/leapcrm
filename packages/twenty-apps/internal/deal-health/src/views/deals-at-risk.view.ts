import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewSortDirection,
} from 'twenty-sdk/define';

import { HEALTH_STATUS } from 'src/constants/health-status';
import {
  DEALS_AT_RISK_VIEW_AMOUNT_FIELD_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_CLOSE_DATE_FIELD_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_FILTER_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_HEALTH_REASONS_FIELD_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_HEALTH_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_SORT_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_UNIVERSAL_IDENTIFIER,
  HEALTH_REASONS_FIELD_UNIVERSAL_IDENTIFIER,
  HEALTH_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const opportunityFields =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.fields;

export default defineView({
  universalIdentifier: DEALS_AT_RISK_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Deals at risk',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  icon: 'IconHeartbeat',
  position: 1,
  fields: [
    {
      universalIdentifier: DEALS_AT_RISK_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        opportunityFields.name.universalIdentifier,
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier:
        DEALS_AT_RISK_VIEW_HEALTH_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: HEALTH_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier:
        DEALS_AT_RISK_VIEW_HEALTH_REASONS_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        HEALTH_REASONS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 360,
    },
    {
      universalIdentifier: DEALS_AT_RISK_VIEW_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        opportunityFields.stage.universalIdentifier,
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier:
        DEALS_AT_RISK_VIEW_CLOSE_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        opportunityFields.closeDate.universalIdentifier,
      position: 4,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: DEALS_AT_RISK_VIEW_AMOUNT_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        opportunityFields.amount.universalIdentifier,
      position: 5,
      isVisible: true,
      size: 140,
    },
  ],
  filters: [
    {
      universalIdentifier: DEALS_AT_RISK_VIEW_FILTER_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: HEALTH_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: [HEALTH_STATUS.AT_RISK, HEALTH_STATUS.WATCH],
    },
  ],
  sorts: [
    {
      universalIdentifier: DEALS_AT_RISK_VIEW_SORT_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        opportunityFields.closeDate.universalIdentifier,
      direction: ViewSortDirection.ASC,
    },
  ],
});
