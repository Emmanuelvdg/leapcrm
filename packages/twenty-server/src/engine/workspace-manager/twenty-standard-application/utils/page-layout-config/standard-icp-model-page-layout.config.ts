import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { PageLayoutTabLayoutMode } from 'twenty-shared/types';

import { WidgetType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-type.enum';
import { PageLayoutType } from 'src/engine/metadata-modules/page-layout/enums/page-layout-type.enum';
import {
  GRID_POSITIONS,
  TAB_PROPS,
  VERTICAL_LIST_LAYOUT_POSITIONS,
  WIDGET_PROPS,
} from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout-tabs.template';
import {
  type StandardPageLayoutConfig,
  type StandardPageLayoutTabConfig,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-page-layout-config.type';

const { icpModelRecordPage } = STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS;

// The analysis gets its own tab: on a full record page the Home tab is the
// narrow left column, too small for the pattern and back-test tables.
const ICP_MODEL_PAGE_TABS = {
  home: {
    universalIdentifier: icpModelRecordPage.tabs.home.universalIdentifier,
    ...TAB_PROPS.home,
    widgets: {
      fields: {
        universalIdentifier:
          icpModelRecordPage.tabs.home.widgets.fields.universalIdentifier,
        ...WIDGET_PROPS.fields,
      },
    },
  },
  analysis: {
    universalIdentifier: icpModelRecordPage.tabs.analysis.universalIdentifier,
    title: 'Analysis',
    position: 15,
    icon: 'IconTarget',
    layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
    widgets: {
      analysis: {
        universalIdentifier:
          icpModelRecordPage.tabs.analysis.widgets.analysis.universalIdentifier,
        ...WIDGET_PROPS.icpAnalysis,
      },
    },
  },
  insights: {
    universalIdentifier: icpModelRecordPage.tabs.insights.universalIdentifier,
    title: 'Insights',
    position: 25,
    icon: 'IconNotes',
    layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
    widgets: {
      insights: {
        universalIdentifier:
          icpModelRecordPage.tabs.insights.widgets.insights.universalIdentifier,
        title: 'Insights',
        type: WidgetType.FIELD,
        gridPosition: GRID_POSITIONS.FULL_WIDTH,
        position: VERTICAL_LIST_LAYOUT_POSITIONS.FIRST,
        fieldUniversalIdentifier:
          STANDARD_OBJECTS.icpModel.fields.insights.universalIdentifier,
      },
    },
  },
} as const satisfies Record<string, StandardPageLayoutTabConfig>;

export const STANDARD_ICP_MODEL_PAGE_LAYOUT_CONFIG = {
  name: 'Default ICP Model Layout',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: STANDARD_OBJECTS.icpModel.universalIdentifier,
  universalIdentifier: icpModelRecordPage.universalIdentifier,
  defaultTabUniversalIdentifier: null,
  tabs: ICP_MODEL_PAGE_TABS,
} as const satisfies StandardPageLayoutConfig;
