import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  QUOTES_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
  QUOTES_NAV_UNIVERSAL_IDENTIFIER,
  QUOTES_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: QUOTES_NAV_UNIVERSAL_IDENTIFIER,
  name: 'Quotes',
  icon: 'IconFileInvoice',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: QUOTES_VIEW_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: QUOTES_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
});
