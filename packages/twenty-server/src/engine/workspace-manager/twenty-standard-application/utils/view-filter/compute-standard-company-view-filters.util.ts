import { ViewFilterOperand } from 'twenty-shared/types';

import { type FlatViewFilter } from 'src/engine/metadata-modules/flat-view-filter/types/flat-view-filter.type';
import {
  createStandardViewFilterFlatMetadata,
  type CreateStandardViewFilterArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-filter/create-standard-view-filter-flat-metadata.util';

export const computeStandardCompanyViewFilters = (
  args: Omit<CreateStandardViewFilterArgs<'company'>, 'context'>,
): Record<string, FlatViewFilter> => {
  return {
    priorityAccountsIcpTierIsPriority: createStandardViewFilterFlatMetadata({
      ...args,
      objectName: 'company',
      context: {
        viewName: 'priorityAccounts',
        viewFilterName: 'icpTierIsPriority',
        fieldName: 'icpTier',
        operand: ViewFilterOperand.IS,
        value: JSON.stringify(['PRIORITY']),
      },
    }),
  };
};
