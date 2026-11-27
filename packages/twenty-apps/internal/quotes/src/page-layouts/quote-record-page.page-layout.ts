import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  QUOTE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  QUOTE_EDITOR_TAB_UNIVERSAL_IDENTIFIER,
  QUOTE_EDITOR_WIDGET_UNIVERSAL_IDENTIFIER,
  QUOTE_FIELDS_TAB_UNIVERSAL_IDENTIFIER,
  QUOTE_FIELDS_WIDGET_UNIVERSAL_IDENTIFIER,
  QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
  QUOTE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  QUOTE_TIMELINE_TAB_UNIVERSAL_IDENTIFIER,
  QUOTE_TIMELINE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: QUOTE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Quote Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: QUOTE_EDITOR_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Quote',
      position: 0,
      icon: 'IconFileInvoice',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: QUOTE_EDITOR_WIDGET_UNIVERSAL_IDENTIFIER,
          title: 'Quote editor',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              QUOTE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
    {
      universalIdentifier: QUOTE_FIELDS_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Details',
      position: 10,
      icon: 'IconListDetails',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: QUOTE_FIELDS_WIDGET_UNIVERSAL_IDENTIFIER,
          title: 'Details',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
      ],
    },
    {
      universalIdentifier: QUOTE_TIMELINE_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Timeline',
      position: 20,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: QUOTE_TIMELINE_WIDGET_UNIVERSAL_IDENTIFIER,
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
