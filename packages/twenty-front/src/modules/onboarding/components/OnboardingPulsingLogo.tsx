import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledLogo = styled.img`
  animation: onboardingPulsingLogo 0.8s ease-in-out infinite alternate;
  height: 40px;
  margin-bottom: ${themeCssVariables.spacing[8]};
  object-fit: contain;
  width: 181px;

  @keyframes onboardingPulsingLogo {
    from {
      opacity: 1;
    }
    to {
      opacity: 0.4;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

export const OnboardingPulsingLogo = () => (
  <StyledLogo src="/images/branding/leap-wordmark.png" alt="" />
);
