import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  LEAD_CAPTURE_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
  LEAD_FORMS_NAV_UNIVERSAL_IDENTIFIER,
  LEAD_FORMS_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: LEAD_FORMS_NAV_UNIVERSAL_IDENTIFIER,
  name: 'Lead forms',
  icon: 'IconForms',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: LEAD_FORMS_VIEW_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: LEAD_CAPTURE_FOLDER_NAV_UNIVERSAL_IDENTIFIER,
});
