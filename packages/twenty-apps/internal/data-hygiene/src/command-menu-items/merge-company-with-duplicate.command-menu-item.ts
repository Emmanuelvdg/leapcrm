import {
  defineCommandMenuItem,
  everyDefined,
  numberOfSelectedRecords,
  selectedRecords,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  MERGE_COMPANY_WITH_DUPLICATE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  MERGE_COMPANY_WITH_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier:
    MERGE_COMPANY_WITH_DUPLICATE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Merge with duplicate',
  shortLabel: 'Merge',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  frontComponentUniversalIdentifier:
    MERGE_COMPANY_WITH_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    everyDefined(selectedRecords, 'possibleDuplicateOfId'),
});
