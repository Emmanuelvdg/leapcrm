import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  APP_DISPLAY_NAME,
  DATA_HYGIENE_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

// Sits right below People (position 1), next to the objects it cleans up.
export default defineNavigationMenuItem({
  universalIdentifier:
    DATA_HYGIENE_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: APP_DISPLAY_NAME,
  icon: 'IconSparkles',
  position: 1.5,
  type: NavigationMenuItemType.FOLDER,
});
