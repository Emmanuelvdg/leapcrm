import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  DEALS_AT_RISK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  DEALS_AT_RISK_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DEALS_AT_RISK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Deals at risk',
  icon: 'IconHeartbeat',
  color: 'red',
  position: 2.5,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: DEALS_AT_RISK_VIEW_UNIVERSAL_IDENTIFIER,
});
