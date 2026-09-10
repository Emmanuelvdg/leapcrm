import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';

import {
  type UserGuideEntry,
  useUserGuideSections,
} from '~/pages/user-guide/useUserGuideSections';

const StyledPage = styled.div`
  box-sizing: border-box;
  display: flex;
  height: 100%;
  width: 100%;
`;

const StyledNav = styled.nav`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  flex-shrink: 0;
  padding: ${themeCssVariables.spacing[4]};
  width: 260px;
`;

const StyledNavTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0 0 ${themeCssVariables.spacing[4]} 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledNavList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledNavGroupLabel = styled.li`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: ${themeCssVariables.spacing[3]} 0 ${themeCssVariables.spacing[1]} 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  text-transform: uppercase;

  &:first-child {
    margin-top: 0;
  }
`;

const StyledNavItem = styled.li<{ isActive: boolean }>`
  background: ${({ isActive }) =>
    isActive
      ? themeCssVariables.background.transparent.light
      : 'transparent'};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  padding: ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

const StyledContent = styled.div`
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
`;

const StyledContentInner = styled.div`
  box-sizing: border-box;
  margin: 0 auto;
  max-width: 720px;
  padding: ${themeCssVariables.spacing[8]};
`;

export const UserGuidePage = () => {
  const { t } = useLingui();
  const sections = useUserGuideSections();
  const contentSections = sections.filter(
    (section): section is UserGuideEntry => !section.isGroupLabel,
  );
  const [activeSectionId, setActiveSectionId] = useState(
    contentSections[0].id,
  );

  const activeSection =
    contentSections.find((section) => section.id === activeSectionId) ??
    contentSections[0];

  return (
    <>
      <PageTitle title={t`User Guide | Leap CRM`} />
      <StyledPage>
        <StyledNav>
          <StyledNavTitle>{t`User guide`}</StyledNavTitle>
          <StyledNavList>
            {sections.map((section) =>
              section.isGroupLabel ? (
                <StyledNavGroupLabel key={section.id}>
                  {section.navLabel}
                </StyledNavGroupLabel>
              ) : (
                <StyledNavItem
                  key={section.id}
                  isActive={section.id === activeSection.id}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  {section.navLabel}
                </StyledNavItem>
              ),
            )}
          </StyledNavList>
        </StyledNav>
        <StyledContent>
          <ScrollWrapper
            componentInstanceId={`scroll-wrapper-user-guide-${activeSection.id}`}
          >
            <StyledContentInner>{activeSection.content}</StyledContentInner>
          </ScrollWrapper>
        </StyledContent>
      </StyledPage>
    </>
  );
};
