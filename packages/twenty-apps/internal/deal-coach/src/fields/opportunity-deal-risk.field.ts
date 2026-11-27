import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { DEAL_RISK_LABELS } from 'src/constants/next-best-action-options';
import {
  DEAL_RISK_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_RISK_HIGH_OPTION_ID,
  DEAL_RISK_LOW_OPTION_ID,
  DEAL_RISK_MEDIUM_OPTION_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_RISK_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'dealRisk',
  type: FieldType.SELECT,
  label: 'Deal risk',
  description:
    'How likely the Deal coach agent thinks this deal is to slip or be lost, judged from the conversation so far.',
  icon: 'IconAlertTriangle',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: DEAL_RISK_LOW_OPTION_ID,
      value: 'LOW',
      label: DEAL_RISK_LABELS.LOW,
      color: 'green',
      position: 0,
    },
    {
      id: DEAL_RISK_MEDIUM_OPTION_ID,
      value: 'MEDIUM',
      label: DEAL_RISK_LABELS.MEDIUM,
      color: 'orange',
      position: 1,
    },
    {
      id: DEAL_RISK_HIGH_OPTION_ID,
      value: 'HIGH',
      label: DEAL_RISK_LABELS.HIGH,
      color: 'red',
      position: 2,
    },
  ],
});
