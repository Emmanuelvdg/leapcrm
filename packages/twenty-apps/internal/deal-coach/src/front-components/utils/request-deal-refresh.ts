import { RestApiClient } from 'twenty-client-sdk/rest';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import {
  MAX_DEALS_PER_MANUAL_REFRESH,
  REFRESH_DEALS_ROUTE_PATH,
} from 'src/constants/refresh-deals-route-path';

type RefreshDealsResponse = {
  outcome?: string;
  refreshedIds?: string[];
  clearedIds?: string[];
  failedIds?: string[];
  skippedIds?: string[];
};

const buildSnackbar = (
  response: RefreshDealsResponse,
): { message: string; variant: 'success' | 'error' | 'info' } => {
  const refreshedCount = response.refreshedIds?.length ?? 0;
  const failedCount = response.failedIds?.length ?? 0;

  if (response.outcome === 'too-many-selected') {
    return {
      message: `Select at most ${MAX_DEALS_PER_MANUAL_REFRESH} deals at a time.`,
      variant: 'info',
    };
  }

  if (refreshedCount > 0 && failedCount > 0) {
    return {
      message: `Next step suggested for ${refreshedCount} deals; ${failedCount} failed.`,
      variant: 'error',
    };
  }

  if (refreshedCount > 0) {
    return {
      message:
        refreshedCount === 1
          ? 'Next step suggested.'
          : `Next step suggested for ${refreshedCount} deals.`,
      variant: 'success',
    };
  }

  if (failedCount > 0) {
    return {
      message:
        'Could not suggest a next step. Check that an AI model is enabled and the workspace has AI credits.',
      variant: 'error',
    };
  }

  return {
    message: 'Closed deals get no next step.',
    variant: 'info',
  };
};

export const requestDealRefresh = async (
  opportunityIds: string[],
): Promise<boolean> => {
  if (opportunityIds.length === 0) {
    return false;
  }

  try {
    const response = await new RestApiClient().post<RefreshDealsResponse>(
      `/s${REFRESH_DEALS_ROUTE_PATH}`,
      { opportunityIds },
    );

    await enqueueSnackbar(buildSnackbar(response ?? {}));

    return (response?.refreshedIds?.length ?? 0) > 0;
  } catch {
    await enqueueSnackbar({
      message: 'Could not suggest a next step. Try again in a minute.',
      variant: 'error',
    });

    return false;
  }
};
