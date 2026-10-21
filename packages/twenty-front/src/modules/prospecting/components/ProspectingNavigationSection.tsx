import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { AnimatedExpandableContainer } from 'twenty-ui/layout';

import { NavigationDrawerItemForObjectMetadataItem } from '@/navigation-menu-item/display/object/components/NavigationDrawerItemForObjectMetadataItem';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { PROSPECTING_OBJECT_NAME_SINGULARS } from '@/prospecting/constants/ProspectingObjectNameSingulars';
import { useIsProspectingAvailable } from '@/prospecting/hooks/useIsProspectingAvailable';
import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { useNavigationSection } from '@/ui/navigation/navigation-drawer/hooks/useNavigationSection';
import { isNavigationSectionOpenFamilyState } from '@/ui/navigation/navigation-drawer/states/isNavigationSectionOpenFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';

const PROSPECTING_NAVIGATION_SECTION_ID = 'Prospecting';

// A fixed section rather than workspace navigation items, which cannot be
// hidden behind a feature flag or permission.
export const ProspectingNavigationSection = () => {
  const { t } = useLingui();
  const isProspectingAvailable = useIsProspectingAvailable();
  const { activeObjectMetadataItems } = useFilteredObjectMetadataItems();

  const { toggleNavigationSection } = useNavigationSection(
    PROSPECTING_NAVIGATION_SECTION_ID,
  );
  const isNavigationSectionOpen = useAtomFamilyStateValue(
    isNavigationSectionOpenFamilyState,
    PROSPECTING_NAVIGATION_SECTION_ID,
  );

  const prospectingObjectMetadataItems = PROSPECTING_OBJECT_NAME_SINGULARS.map(
    (nameSingular) =>
      activeObjectMetadataItems.find(
        (objectMetadataItem) =>
          objectMetadataItem.nameSingular === nameSingular,
      ),
  ).filter(isDefined);

  if (!isProspectingAvailable || prospectingObjectMetadataItems.length === 0) {
    return null;
  }

  return (
    <NavigationDrawerSection>
      <NavigationDrawerAnimatedCollapseWrapper>
        <NavigationDrawerSectionTitle
          label={t`Prospecting`}
          onClick={toggleNavigationSection}
          isOpen={isNavigationSectionOpen}
        />
      </NavigationDrawerAnimatedCollapseWrapper>
      <AnimatedExpandableContainer
        isExpanded={isNavigationSectionOpen}
        dimension="height"
        mode="fit-content"
        containAnimation
        initial={false}
      >
        {prospectingObjectMetadataItems.map((objectMetadataItem) => (
          <NavigationDrawerItemForObjectMetadataItem
            key={objectMetadataItem.id}
            objectMetadataItem={objectMetadataItem}
          />
        ))}
      </AnimatedExpandableContainer>
    </NavigationDrawerSection>
  );
};
