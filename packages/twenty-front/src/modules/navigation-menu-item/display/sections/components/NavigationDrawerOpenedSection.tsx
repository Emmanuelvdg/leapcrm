import { useIdentifyActiveNavigationMenuItems } from '@/navigation-menu-item/display/hooks/useIdentifyActiveNavigationMenuItems';
import { NavigationDrawerSectionForObjectMetadataItems } from '@/object-metadata/components/NavigationDrawerSectionForObjectMetadataItems';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { PROSPECTING_OBJECT_NAME_SINGULARS } from '@/prospecting/constants/ProspectingObjectNameSingulars';
import { useIsProspectingAvailable } from '@/prospecting/hooks/useIsProspectingAvailable';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { AnimatedExpandableContainer } from 'twenty-ui/layout';

export const NavigationDrawerOpenedSection = () => {
  const { t } = useLingui();

  const { activeObjectMetadataItems } = useFilteredObjectMetadataItems();
  const isProspectingAvailable = useIsProspectingAvailable();

  const { objectMetadataIdForOpenedSection } =
    useIdentifyActiveNavigationMenuItems();

  const objectMetadataItem = activeObjectMetadataItems.find(
    (item) => item.id === objectMetadataIdForOpenedSection,
  );

  // Prospecting objects already have their own section.
  if (
    !isDefined(objectMetadataItem) ||
    (isProspectingAvailable &&
      PROSPECTING_OBJECT_NAME_SINGULARS.includes(
        objectMetadataItem.nameSingular,
      ))
  ) {
    return null;
  }

  return (
    <AnimatedExpandableContainer isExpanded>
      <NavigationDrawerSectionForObjectMetadataItems
        sectionTitle={t`Opened`}
        objectMetadataItems={[objectMetadataItem]}
      />
    </AnimatedExpandableContainer>
  );
};
