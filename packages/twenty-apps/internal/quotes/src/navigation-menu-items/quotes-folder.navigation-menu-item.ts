import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  APP_DISPLAY_NAME,
  QUOTES_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: QUOTES_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
  name: APP_DISPLAY_NAME,
  icon: 'IconFileInvoice',
  position: 2.3,
  type: NavigationMenuItemType.FOLDER,
});
