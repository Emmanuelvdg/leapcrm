import { useState } from 'react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useQuery, useMutation } from '@apollo/client/react';

import { CURRENT_SEAT_PRICE } from '@/subscription-billing/graphql/queries/currentSeatPrice';
import { MY_SUBSCRIPTION_STATUS } from '@/subscription-billing/graphql/queries/mySubscriptionStatus';
import { CREATE_SUBSCRIPTION_CHECKOUT_SESSION } from '@/subscription-billing/graphql/mutations/createSubscriptionCheckoutSession';
import { StyledOnboardingStepHeading } from '@/onboarding/components/StyledOnboardingStepHeading';
import { StyledOnboardingStepPage } from '@/onboarding/components/StyledOnboardingStepPage';
import { StyledOnboardingStepSubtitle } from '@/onboarding/components/StyledOnboardingStepSubtitle';
import { StyledOnboardingStepTitle } from '@/onboarding/components/StyledOnboardingStepTitle';
import { OnboardingStepAnimatedItem } from '@/onboarding/components/OnboardingStepAnimatedItem';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { IconMinus, IconPlus } from 'twenty-ui/icon';
import { LightIconButton, MainButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { Eyebrow } from 'twenty-ui/typography';
import {
  CreateSubscriptionCheckoutSessionDocument,
  CurrentSeatPriceDocument,
  MySubscriptionStatusDocument,
} from '~/generated-metadata/graphql';

const StyledPage = styled(StyledOnboardingStepPage)`
  gap: ${themeCssVariables.spacing[6]};
`;

const StyledPriceContainer = styled(OnboardingStepAnimatedItem)`
  align-items: baseline;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: center;
`;

const StyledAmount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledSeatStepper = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  justify-content: center;
`;

const StyledSeatCount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  min-width: 32px;
  text-align: center;
`;

const StyledSeatLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  text-align: center;
`;

const StyledTotalPrice = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  text-align: center;
`;

const StyledButtonContainer = styled.div`
  width: 240px;
`;

export const ChooseSubscriptionPlan = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();

  const { data: priceData } = useQuery(CurrentSeatPriceDocument);
  const { data: statusData } = useQuery(MySubscriptionStatusDocument);
  const [createCheckoutSession, { loading: isRedirecting }] = useMutation(
    CreateSubscriptionCheckoutSessionDocument,
  );

  const price = priceData?.currentSeatPrice;
  const hasFirstPeriodDiscount =
    price?.firstPeriodUnitAmountCents != null &&
    price.firstPeriodUnitAmountCents < price.unitAmountCents;
  const minSeats = Math.max(statusData?.mySubscriptionStatus.activeMembers ?? 1, 1);

  const [seats, setSeats] = useState(minSeats);
  const effectiveSeats = Math.max(seats, minSeats);

  const handleSubscribe = async () => {
    try {
      const result = await createCheckoutSession({
        variables: { input: { seats: effectiveSeats } },
      });
      const url = result.data?.createSubscriptionCheckoutSession.url;

      if (url) {
        window.location.href = url;
      }
    } catch {
      enqueueErrorSnackBar({
        message: t`Couldn't start checkout — please try again.`,
      });
    }
  };

  return (
    <StyledPage>
      <StyledOnboardingStepHeading>
        <OnboardingStepAnimatedItem index={0}>
          <Eyebrow>{t`Pricing`}</Eyebrow>
          <StyledOnboardingStepTitle>{t`Choose your plan`}</StyledOnboardingStepTitle>
        </OnboardingStepAnimatedItem>
        <OnboardingStepAnimatedItem index={1}>
          <StyledOnboardingStepSubtitle>
            {hasFirstPeriodDiscount && price
              ? t`Your first month is just ${(price.firstPeriodUnitAmountCents! / 100).toFixed(2)} ${price.currency.toUpperCase()} per seat — the regular price applies from your second month.`
              : t`Billed per seat, every month.`}
          </StyledOnboardingStepSubtitle>
        </OnboardingStepAnimatedItem>
      </StyledOnboardingStepHeading>

      {price && (
        <StyledPriceContainer index={2}>
          <StyledAmount>
            {(price.unitAmountCents / 100).toFixed(2)} {price.currency.toUpperCase()}
          </StyledAmount>
          <span>{t`per seat / ${price.interval}`}</span>
        </StyledPriceContainer>
      )}

      <OnboardingStepAnimatedItem index={3}>
        <StyledSeatStepper>
          <LightIconButton
            Icon={IconMinus}
            accent="tertiary"
            onClick={() => setSeats((current) => Math.max(current - 1, minSeats))}
            disabled={effectiveSeats <= minSeats}
            aria-label={t`Remove a seat`}
          />
          <StyledSeatCount>{effectiveSeats}</StyledSeatCount>
          <LightIconButton
            Icon={IconPlus}
            accent="tertiary"
            onClick={() => setSeats((current) => current + 1)}
            aria-label={t`Add a seat`}
          />
        </StyledSeatStepper>
        <StyledSeatLabel>
          {effectiveSeats === 1 ? t`seat` : t`seats`}
        </StyledSeatLabel>
      </OnboardingStepAnimatedItem>

      {price && hasFirstPeriodDiscount && (
        <OnboardingStepAnimatedItem index={4}>
          <StyledTotalPrice>
            {t`${((price.firstPeriodUnitAmountCents! * effectiveSeats) / 100).toFixed(2)} ${price.currency.toUpperCase()} due today, then ${((price.unitAmountCents * effectiveSeats) / 100).toFixed(2)} ${price.currency.toUpperCase()} / ${price.interval} from month two`}
          </StyledTotalPrice>
        </OnboardingStepAnimatedItem>
      )}

      {price && !hasFirstPeriodDiscount && (
        <OnboardingStepAnimatedItem index={4}>
          <StyledTotalPrice>
            {t`${((price.unitAmountCents * effectiveSeats) / 100).toFixed(2)} ${price.currency.toUpperCase()} / ${price.interval}, due today`}
          </StyledTotalPrice>
        </OnboardingStepAnimatedItem>
      )}

      <OnboardingStepAnimatedItem index={5}>
        <StyledButtonContainer>
          <MainButton
            title={hasFirstPeriodDiscount ? t`Continue to payment` : t`Subscribe`}
            onClick={() => void handleSubscribe()}
            disabled={isRedirecting}
            fullWidth
          />
        </StyledButtonContainer>
      </OnboardingStepAnimatedItem>
    </StyledPage>
  );
};
