import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  FORM_BUILDER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_BUILDER_TAB_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_BUILDER_WIDGET_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_FIELDS_TAB_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_FIELDS_WIDGET_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_TIMELINE_TAB_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_TIMELINE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: LEAD_FORM_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Lead Form Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: LEAD_FORM_BUILDER_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Build & share',
      position: 0,
      icon: 'IconForms',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: LEAD_FORM_BUILDER_WIDGET_UNIVERSAL_IDENTIFIER,
          title: 'Form builder',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              FORM_BUILDER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
    {
      universalIdentifier: LEAD_FORM_FIELDS_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Settings',
      position: 10,
      icon: 'IconSettings',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: LEAD_FORM_FIELDS_WIDGET_UNIVERSAL_IDENTIFIER,
          title: 'Settings',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
      ],
    },
    {
      universalIdentifier: LEAD_FORM_TIMELINE_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Timeline',
      position: 20,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: LEAD_FORM_TIMELINE_WIDGET_UNIVERSAL_IDENTIFIER,
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
