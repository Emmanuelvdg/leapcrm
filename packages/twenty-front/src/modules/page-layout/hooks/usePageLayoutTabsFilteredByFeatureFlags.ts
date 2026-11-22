import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useCurrentPageLayoutOrThrow } from '@/page-layout/hooks/useCurrentPageLayoutOrThrow';
import { filterPageLayoutTabsByFeatureFlags } from '@/page-layout/utils/filterPageLayoutTabsByFeatureFlags';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { FeatureFlagKey } from '~/generated-metadata/graphql';

export const usePageLayoutTabsFilteredByFeatureFlags = () => {
  const { currentPageLayout } = useCurrentPageLayoutOrThrow();

  const { objectMetadataItems } = useObjectMetadataItems();

  const isNativeCallRecordingTabsFlagEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_NATIVE_CALL_RECORDING_TABS_ENABLED,
  );

  // The flag gates the meeting-bot tabs on calendar events; an in-app
  // recording's own page always shows its transcript.
  const isCallRecordingPageLayout =
    isDefined(currentPageLayout.objectMetadataId) &&
    objectMetadataItems.some(
      (objectMetadataItem) =>
        objectMetadataItem.id === currentPageLayout.objectMetadataId &&
        objectMetadataItem.nameSingular ===
          CoreObjectNameSingular.CallRecording,
    );

  const featureFilteredPageLayoutTabs = filterPageLayoutTabsByFeatureFlags({
    tabs: currentPageLayout.tabs,
    isNativeCallRecordingTabsEnabled:
      isNativeCallRecordingTabsFlagEnabled || isCallRecordingPageLayout,
  });

  return { featureFilteredPageLayoutTabs };
};
