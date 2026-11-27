import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  PRODUCTS_NAV_UNIVERSAL_IDENTIFIER,
  PRODUCTS_VIEW_UNIVERSAL_IDENTIFIER,
  QUOTES_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: PRODUCTS_NAV_UNIVERSAL_IDENTIFIER,
  name: 'Products',
  icon: 'IconPackage',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: PRODUCTS_VIEW_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: QUOTES_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
});
