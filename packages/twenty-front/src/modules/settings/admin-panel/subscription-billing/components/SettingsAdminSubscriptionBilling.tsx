import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { Button } from 'twenty-ui/input';
import { Tag } from 'twenty-ui/data-display';

import { useApolloAdminClient } from '@/settings/admin-panel/apollo/hooks/useApolloAdminClient';
import { GET_CURRENT_SEAT_PRICE } from '@/settings/admin-panel/subscription-billing/graphql/queries/getCurrentSeatPrice';
import { UPDATE_SEAT_PRICE } from '@/settings/admin-panel/subscription-billing/graphql/mutations/updateSeatPrice';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import {
  GetCurrentSeatPriceDocument,
  UpdateSeatPriceDocument,
} from '~/generated-admin/graphql';

const StyledForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 320px;
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
`;

const StyledStatusRow = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
`;

export const SettingsAdminSubscriptionBilling = () => {
  const { t } = useLingui();
  const apolloAdminClient = useApolloAdminClient();

  const { data, loading, refetch } = useQuery(GetCurrentSeatPriceDocument, {
    client: apolloAdminClient,
    fetchPolicy: 'network-only',
  });

  const [updateSeatPrice, { loading: isSaving }] = useMutation(
    UpdateSeatPriceDocument,
    { client: apolloAdminClient },
  );

  const currentPrice = data?.getCurrentSeatPrice;

  const [amountInput, setAmountInput] = useState('');
  const [currencyInput, setCurrencyInput] = useState('usd');

  const handleSave = async () => {
    const amountCents = Math.round(parseFloat(amountInput) * 100);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return;
    }

    await updateSeatPrice({
      variables: {
        input: { unitAmountCents: amountCents, currency: currencyInput },
      },
    });

    setAmountInput('');
    await refetch();
  };

  return (
    <Section>
      <H2Title
        title={t`Subscription pricing`}
        description={t`Set the price charged per workspace member, per month. Saving here creates a new Stripe price immediately if Stripe is configured.`}
      />
      {!loading && (
        <StyledStatusRow>
          <span>
            {currentPrice
              ? t`Current price: ${(currentPrice.unitAmountCents / 100).toFixed(2)} ${currentPrice.currency.toUpperCase()} / seat / ${currentPrice.interval}`
              : t`No price set yet`}
          </span>
          {currentPrice && (
            <Tag
              color={currentPrice.isSyncedWithStripe ? 'green' : 'yellow'}
              text={
                currentPrice.isSyncedWithStripe
                  ? t`Synced with Stripe`
                  : t`Not synced with Stripe`
              }
            />
          )}
        </StyledStatusRow>
      )}
      <StyledForm>
        <StyledRow>
          <SettingsTextInput
            instanceId="subscription-seat-price-amount"
            label={t`New price (in ${currencyInput.toUpperCase()})`}
            value={amountInput}
            onChange={setAmountInput}
            placeholder="10.00"
            fullWidth
          />
        </StyledRow>
        <SettingsTextInput
          instanceId="subscription-seat-price-currency"
          label={t`Currency`}
          value={currencyInput}
          onChange={(value) => setCurrencyInput(value.toLowerCase())}
          placeholder="usd"
          fullWidth
        />
        <Button
          title={t`Save price`}
          variant="primary"
          accent="blue"
          disabled={isSaving || !amountInput}
          onClick={() => void handleSave()}
        />
      </StyledForm>
    </Section>
  );
};
