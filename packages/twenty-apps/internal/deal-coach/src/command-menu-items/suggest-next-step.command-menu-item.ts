import {
  defineCommandMenuItem,
  isSelectAll,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  SUGGEST_NEXT_STEP_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  SUGGEST_NEXT_STEP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier: SUGGEST_NEXT_STEP_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  availabilityObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  frontComponentUniversalIdentifier:
    SUGGEST_NEXT_STEP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  label: 'Suggest next step',
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression: !isSelectAll,
});
