import { CoreApiClient } from 'twenty-client-sdk/core';
import {
  enqueueSnackbar,
  openCommandConfirmationModal,
} from 'twenty-sdk/front-component';

import { type NextBestActionRecord } from 'src/front-components/hooks/use-next-best-action';
import { describeDealUpdate } from 'src/utils/describe-deal-update';

export const applyDealUpdate = async (
  record: NextBestActionRecord,
): Promise<boolean> => {
  const dealUpdate = record.nextBestActionDetails?.dealUpdate;

  if (!dealUpdate) {
    return false;
  }

  const confirmation = await openCommandConfirmationModal({
    title: 'Update this deal?',
    subtitle: describeDealUpdate(dealUpdate, record.currencyCode).join(' · '),
    confirmButtonText: 'Update deal',
    confirmButtonAccent: 'blue',
  });

  if (confirmation !== 'confirm') {
    return false;
  }

  const data: Record<string, unknown> = {};

  if (dealUpdate.stage !== null) {
    data.stage = dealUpdate.stage;
  }

  if (dealUpdate.closeDate !== null) {
    data.closeDate = dealUpdate.closeDate;
  }

  if (dealUpdate.amountMicros !== null) {
    data.amount = {
      amountMicros: dealUpdate.amountMicros,
      currencyCode: record.currencyCode,
    };
  }

  // The applied suggestion is removed so the button does not offer it again.
  data.nextBestActionDetails = {
    ...record.nextBestActionDetails,
    dealUpdate: null,
  };

  try {
    await new CoreApiClient().mutation({
      updateOpportunity: {
        __args: { id: record.id, data },
        id: true,
      },
    });

    await enqueueSnackbar({ message: 'Deal updated.', variant: 'success' });

    return true;
  } catch {
    await enqueueSnackbar({
      message: 'Could not update the deal.',
      variant: 'error',
    });

    return false;
  }
};
