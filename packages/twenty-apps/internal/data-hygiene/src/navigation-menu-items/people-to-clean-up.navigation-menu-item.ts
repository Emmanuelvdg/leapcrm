import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  DATA_HYGIENE_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  PEOPLE_TO_CLEAN_UP_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier:
    PEOPLE_TO_CLEAN_UP_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'People to clean up',
  icon: 'IconSparkles',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: PEOPLE_TO_CLEAN_UP_VIEW_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier:
    DATA_HYGIENE_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
