import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledLogo = styled.img`
  animation: onboardingPulsingLogo 0.8s ease-in-out infinite alternate;
  background-color: ${themeCssVariables.brand.logoPlate};
  border-radius: ${themeCssVariables.border.radius.md};
  box-sizing: content-box;
  height: 40px;
  margin-bottom: ${themeCssVariables.spacing[8]};
  object-fit: contain;
  padding: ${themeCssVariables.spacing[4]};
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
