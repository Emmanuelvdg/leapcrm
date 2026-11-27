import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  LEAD_CAPTURE_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
  SUBMISSIONS_NAV_UNIVERSAL_IDENTIFIER,
  SUBMISSIONS_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: SUBMISSIONS_NAV_UNIVERSAL_IDENTIFIER,
  name: 'Form submissions',
  icon: 'IconInbox',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: SUBMISSIONS_VIEW_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: LEAD_CAPTURE_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
});
