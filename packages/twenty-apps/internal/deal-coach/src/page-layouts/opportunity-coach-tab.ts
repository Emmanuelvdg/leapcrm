import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  NEXT_BEST_ACTION_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_COACH_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_COACH_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayoutTab({
  universalIdentifier: OPPORTUNITY_COACH_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
  title: 'Next step',
  position: 15,
  icon: 'IconBulb',
  layoutMode: PageLayoutTabLayoutMode.CANVAS,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.opportunityRecordPage
      .universalIdentifier,
  widgets: [
    {
      universalIdentifier:
        OPPORTUNITY_COACH_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'Next best action',
      type: 'FRONT_COMPONENT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier:
          NEXT_BEST_ACTION_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});
