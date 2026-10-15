import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { getImageAbsoluteURI, isDefined } from 'twenty-shared/utils';
import { Avatar } from 'twenty-ui/data-display';
import { UndecoratedLink } from 'twenty-ui/navigation';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { useRedirectToDefaultDomain } from '~/modules/domain-manager/hooks/useRedirectToDefaultDomain';

type LogoProps = {
  primaryLogo?: string | null;
  secondaryLogo?: string | null;
  placeholder?: string | null;
  onClick?: () => void;
  to?: AppPath;
};

const StyledContainer = styled.div`
  height: 40px;
  margin-bottom: ${themeCssVariables.spacing[4]};
  margin-top: ${themeCssVariables.spacing[4]};

  position: relative;
  width: 181px;
`;

const StyledSecondaryLogo = styled.img`
  border-radius: ${themeCssVariables.border.radius.xs};
  height: ${themeCssVariables.spacing[6]};
  width: ${themeCssVariables.spacing[6]};
`;

const StyledSecondaryLogoContainer = styled.div<{ isOnLogoPlate: boolean }>`
  align-items: center;
  background-color: ${themeCssVariables.background.primary};
  border-radius: ${themeCssVariables.border.radius.sm};
  bottom: ${({ isOnLogoPlate }) =>
    isOnLogoPlate
      ? `calc(-1 * (${themeCssVariables.spacing[4]} + ${themeCssVariables.spacing[3]}))`
      : `calc(-1 * ${themeCssVariables.spacing[3]})`};
  display: flex;
  height: ${themeCssVariables.spacing[7]};
  justify-content: center;

  position: absolute;
  right: ${({ isOnLogoPlate }) =>
    isOnLogoPlate
      ? `calc(-1 * (${themeCssVariables.spacing[4]} + ${themeCssVariables.spacing[3]}))`
      : `calc(-1 * ${themeCssVariables.spacing[3]})`};
  width: ${themeCssVariables.spacing[7]};
`;

const StyledPrimaryLogo = styled.div`
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  height: 100%;
  width: 100%;
`;

// The default wordmark is a PNG on a white ground, so it gets a white plate
// with clear space rather than a visible white box on tinted or dark pages.
const StyledLogoPlate = styled.div`
  background-color: ${themeCssVariables.brand.logoPlate};
  border-radius: ${themeCssVariables.border.radius.md};
  box-sizing: content-box;
  height: 100%;
  margin: calc(-1 * ${themeCssVariables.spacing[4]});
  padding: ${themeCssVariables.spacing[4]};
  width: 100%;
`;

export const Logo = ({
  primaryLogo,
  secondaryLogo,
  placeholder,
  onClick,
  to = AppPath.SignInUp,
}: LogoProps) => {
  const { redirectToDefaultDomain } = useRedirectToDefaultDomain();
  const defaultPrimaryLogoUrl = `${window.location.origin}/images/branding/leap-wordmark.png`;

  const primaryLogoUrl = getImageAbsoluteURI({
    imageUrl: primaryLogo ?? defaultPrimaryLogoUrl,
    baseUrl: REACT_APP_SERVER_BASE_URL,
  });

  const secondaryLogoUrl = isNonEmptyString(secondaryLogo)
    ? getImageAbsoluteURI({
        imageUrl: secondaryLogo,
        baseUrl: REACT_APP_SERVER_BASE_URL,
      })
    : null;

  const isUsingDefaultLogo = !isDefined(primaryLogo);

  return (
    <StyledContainer onClick={() => onClick?.()}>
      {isUsingDefaultLogo ? (
        <UndecoratedLink to={to} onClick={() => redirectToDefaultDomain()}>
          <StyledLogoPlate>
            <StyledPrimaryLogo
              style={{ backgroundImage: `url(${primaryLogoUrl})` }}
            />
          </StyledLogoPlate>
        </UndecoratedLink>
      ) : (
        <StyledPrimaryLogo
          style={{ backgroundImage: `url(${primaryLogoUrl})` }}
        />
      )}
      {isDefined(secondaryLogoUrl) ? (
        <StyledSecondaryLogoContainer isOnLogoPlate={isUsingDefaultLogo}>
          <StyledSecondaryLogo src={secondaryLogoUrl} />
        </StyledSecondaryLogoContainer>
      ) : (
        isDefined(placeholder) && (
          <StyledSecondaryLogoContainer isOnLogoPlate={isUsingDefaultLogo}>
            <Avatar
              size="lg"
              placeholder={placeholder}
              type="squared"
              placeholderColorSeed={placeholder}
            />
          </StyledSecondaryLogoContainer>
        )
      )}
    </StyledContainer>
  );
};
