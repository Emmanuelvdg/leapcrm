import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMutation, useQuery } from '@apollo/client/react';
import { AppPath, SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/layout';
import { H2Title } from 'twenty-ui/typography';
import { MainButton } from 'twenty-ui/input';
import { IconMinus, IconPlus } from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { MY_SUBSCRIPTION_STATUS } from '@/subscription-billing/graphql/queries/mySubscriptionStatus';
import { CURRENT_SEAT_PRICE } from '@/subscription-billing/graphql/queries/currentSeatPrice';
import { CREATE_SUBSCRIPTION_BILLING_PORTAL_SESSION } from '@/subscription-billing/graphql/mutations/createSubscriptionBillingPortalSession';
import { UPDATE_SUBSCRIPTION_SEATS } from '@/subscription-billing/graphql/mutations/updateSubscriptionSeats';
import {
  CreateSubscriptionBillingPortalSessionDocument,
  CurrentSeatPriceDocument,
  MySubscriptionStatusDocument,
  UpdateSubscriptionSeatsDocument,
  WorkspaceSubscriptionStatus,
} from '~/generated-metadata/graphql';

const StyledSeatStepper = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  margin-top: ${themeCssVariables.spacing[4]};
`;

const StyledSeatCount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  min-width: 32px;
  text-align: center;
`;

const StyledSeatTotalPrice = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin-top: ${themeCssVariables.spacing[1]};
`;

const STATUS_LABELS: Partial<Record<WorkspaceSubscriptionStatus, string>> = {
  [WorkspaceSubscriptionStatus.TRIALING]: 'Trialing',
  [WorkspaceSubscriptionStatus.ACTIVE]: 'Active',
  [WorkspaceSubscriptionStatus.PAST_DUE]: 'Past due',
  [WorkspaceSubscriptionStatus.CANCELED]: 'Canceled',
  [WorkspaceSubscriptionStatus.INCOMPLETE]: 'Not subscribed',
};

export const SettingsSubscriptionBilling = () => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const { data, loading, refetch } = useQuery(MySubscriptionStatusDocument);
  const { data: priceData } = useQuery(CurrentSeatPriceDocument);
  const [createBillingPortalSession, { loading: isOpeningPortal }] =
    useMutation(CreateSubscriptionBillingPortalSessionDocument);
  const [updateSubscriptionSeats, { loading: isSavingSeats }] = useMutation(
    UpdateSubscriptionSeatsDocument,
  );

  const status = data?.mySubscriptionStatus;
  const hasBillableSubscription =
    status?.status === WorkspaceSubscriptionStatus.ACTIVE ||
    status?.status === WorkspaceSubscriptionStatus.TRIALING;

  const [seats, setSeats] = useState(1);

  useEffect(() => {
    if (status) {
      setSeats(status.seats);
    }
  }, [status?.seats]);

  const minSeats = Math.max(status?.activeMembers ?? 1, 1);

  const handleManageBilling = async () => {
    try {
      const result = await createBillingPortalSession();
      const url = result.data?.createSubscriptionBillingPortalSession.url;

      if (url) {
        window.location.href = url;
      }
    } catch {
      enqueueErrorSnackBar({
        message: t`Couldn't open the billing portal — please try again.`,
      });
    }
  };

  const handleSaveSeats = async () => {
    try {
      await updateSubscriptionSeats({
        variables: { input: { seats } },
      });
      await refetch();
      enqueueSuccessSnackBar({ message: t`Seat count updated.` });
    } catch {
      enqueueErrorSnackBar({
        message: t`Couldn't update your seat count — please try again.`,
      });
    }
  };

  const statusLabel = status ? (STATUS_LABELS[status.status] ?? status.status) : '';
  const price = priceData?.currentSeatPrice;

  return (
    <SettingsPageLayout
      title={t`Billing`}
      links={[
        {
          children: <Trans>Workspace</Trans>,
          href: getSettingsPath(SettingsPath.General),
        },
        { children: <Trans>Billing</Trans> },
      ]}
    >
      <SettingsPageContainer>
        <Section>
          <H2Title
            title={t`Subscription`}
            description={
              loading
                ? t`Loading...`
                : t`Status: ${statusLabel} — ${status?.activeMembers ?? 0} of ${status?.seats ?? 0} seats used.`
            }
          />
          {hasBillableSubscription ? (
            <MainButton
              title={t`Manage billing`}
              onClick={() => void handleManageBilling()}
              disabled={isOpeningPortal}
            />
          ) : (
            <MainButton
              title={t`Subscribe`}
              onClick={() => navigate(AppPath.SubscriptionRequired)}
            />
          )}
        </Section>

        {hasBillableSubscription && (
          <Section>
            <H2Title
              title={t`Seats`}
              description={t`Change how many seats you're paying for. You can't go below your current number of members.`}
            />
            <StyledSeatStepper>
              <LightIconButton
                Icon={IconMinus}
                accent="tertiary"
                onClick={() => setSeats((current) => Math.max(current - 1, minSeats))}
                disabled={seats <= minSeats}
                aria-label={t`Remove a seat`}
              />
              <StyledSeatCount>{seats}</StyledSeatCount>
              <LightIconButton
                Icon={IconPlus}
                accent="tertiary"
                onClick={() => setSeats((current) => current + 1)}
                aria-label={t`Add a seat`}
              />
              <MainButton
                title={t`Save`}
                onClick={() => void handleSaveSeats()}
                disabled={isSavingSeats || seats === status?.seats}
              />
            </StyledSeatStepper>
            {price && (
              <StyledSeatTotalPrice>
                {t`${((price.unitAmountCents * seats) / 100).toFixed(2)} ${price.currency.toUpperCase()} / ${price.interval}`}
              </StyledSeatTotalPrice>
            )}
          </Section>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
