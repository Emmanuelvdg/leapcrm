import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { HEALTH_STATUS } from 'src/constants/health-status';
import {
  HEALTH_STATUS_AT_RISK_OPTION_ID,
  HEALTH_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  HEALTH_STATUS_HEALTHY_OPTION_ID,
  HEALTH_STATUS_WATCH_OPTION_ID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: HEALTH_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'healthStatus',
  type: FieldType.SELECT,
  label: 'Health',
  description:
    'Whether this deal needs attention, based on its close date, time in stage and open tasks. Empty for closed deals.',
  icon: 'IconHeartbeat',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: HEALTH_STATUS_HEALTHY_OPTION_ID,
      value: HEALTH_STATUS.HEALTHY,
      label: 'Healthy',
      color: 'green',
      position: 0,
    },
    {
      id: HEALTH_STATUS_WATCH_OPTION_ID,
      value: HEALTH_STATUS.WATCH,
      label: 'Watch',
      color: 'orange',
      position: 1,
    },
    {
      id: HEALTH_STATUS_AT_RISK_OPTION_ID,
      value: HEALTH_STATUS.AT_RISK,
      label: 'At risk',
      color: 'red',
      position: 2,
    },
  ],
});
