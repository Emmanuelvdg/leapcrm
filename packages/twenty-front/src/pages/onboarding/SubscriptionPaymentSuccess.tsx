import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useQuery } from '@apollo/client/react';
import { AppPath } from 'twenty-shared/types';

import { SubTitle } from '@/auth/components/SubTitle';
import { Title } from '@/auth/components/Title';
import { OnboardingVerifyLayout } from '@/onboarding/components/OnboardingVerifyLayout';
import { MY_SUBSCRIPTION_STATUS } from '@/subscription-billing/graphql/queries/mySubscriptionStatus';
import { MainButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { Eyebrow } from 'twenty-ui/typography';
import { MySubscriptionStatusDocument } from '~/generated-metadata/graphql';

const SUBSCRIPTION_CONFIRMATION_POLL_INTERVAL_MS = 2000;

const StyledButtonContainer = styled.div`
  margin-top: ${themeCssVariables.spacing[8]};
  width: 200px;
`;

export const SubscriptionPaymentSuccess = () => {
  const { t } = useLingui();
  const navigate = useNavigate();

  const { data } = useQuery(MySubscriptionStatusDocument, {
    pollInterval: SUBSCRIPTION_CONFIRMATION_POLL_INTERVAL_MS,
  });

  const isLocked = data?.mySubscriptionStatus.isLocked ?? true;

  useEffect(() => {
    if (!isLocked) {
      navigate(AppPath.Index);
    }
  }, [isLocked, navigate]);

  return (
    <OnboardingVerifyLayout>
      <Eyebrow>{t`Subscription`}</Eyebrow>
      <Title>{t`Payment received`}</Title>
      <SubTitle>{t`Confirming your subscription — this only takes a moment.`}</SubTitle>
      <StyledButtonContainer>
        <MainButton
          title={t`Continue to Leap CRM`}
          onClick={() => navigate(AppPath.Index)}
          fullWidth
        />
      </StyledButtonContainer>
    </OnboardingVerifyLayout>
  );
};
