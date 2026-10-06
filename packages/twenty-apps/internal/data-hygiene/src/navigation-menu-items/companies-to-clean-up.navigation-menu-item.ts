import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  COMPANIES_TO_CLEAN_UP_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  COMPANIES_TO_CLEAN_UP_VIEW_UNIVERSAL_IDENTIFIER,
  DATA_HYGIENE_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier:
    COMPANIES_TO_CLEAN_UP_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Companies to clean up',
  icon: 'IconSparkles',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: COMPANIES_TO_CLEAN_UP_VIEW_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier:
    DATA_HYGIENE_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
});
