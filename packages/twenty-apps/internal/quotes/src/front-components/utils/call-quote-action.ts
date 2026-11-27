import { RestApiClient } from 'twenty-client-sdk/rest';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { QUOTE_ACTIONS_ROUTE_PATH } from 'src/constants/quote-settings';
import {
  type QuoteActionName,
  type QuoteActionResult,
} from 'src/utils/quote-actions';

export const callQuoteAction = async (request: {
  action: QuoteActionName;
  quoteId?: string;
  opportunityId?: string;
  note?: string;
  crmBaseUrl?: string;
}): Promise<QuoteActionResult | null> => {
  try {
    const result = await new RestApiClient().post<QuoteActionResult>(
      `/s${QUOTE_ACTIONS_ROUTE_PATH}`,
      request,
    );

    if (!result?.ok) {
      await enqueueSnackbar({
        message: result?.message ?? 'Something went wrong.',
        variant: 'error',
      });
    }

    return result ?? null;
  } catch {
    await enqueueSnackbar({
      message: 'Could not reach the server. Try again in a minute.',
      variant: 'error',
    });

    return null;
  }
};
