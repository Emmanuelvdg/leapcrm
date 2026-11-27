import {
  defineCommandMenuItem,
  isSelectAll,
  numberOfSelectedRecords,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CREATE_QUOTE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CREATE_QUOTE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier: CREATE_QUOTE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  availabilityObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  frontComponentUniversalIdentifier:
    CREATE_QUOTE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  label: 'Create quote',
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression:
    !isSelectAll && numberOfSelectedRecords === 1,
});
