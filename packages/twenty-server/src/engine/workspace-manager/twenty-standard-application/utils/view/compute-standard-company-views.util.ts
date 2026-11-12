import { msg } from '@lingui/core/macro';
import { ViewType, ViewKey } from 'twenty-shared/types';

import { INDEX_VIEW_NAME } from 'src/engine/metadata-modules/view/constants/index-view-name.constant';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';

import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';
import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';

export const computeStandardCompanyViews = (
  args: Omit<CreateStandardViewArgs<'company'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allCompanies: createStandardViewFlatMetadata({
      ...args,
      objectName: 'company',
      context: {
        viewName: 'allCompanies',
        name: INDEX_VIEW_NAME,
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconList',
      },
    }),
    priorityAccounts: createStandardViewFlatMetadata({
      ...args,
      objectName: 'company',
      context: {
        viewName: 'priorityAccounts',
        name: i18nLabel(
          msg({ message: `Priority accounts`, context: 'view.name' }),
        ),
        type: ViewType.TABLE,
        key: null,
        position: 1,
        icon: 'IconTarget',
      },
    }),
    companyRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'company',
      context: {
        viewName: 'companyRecordPageFields',
        name: 'Company Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
