import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import { CoreObjectNameSingular } from 'twenty-shared/types';

export const useIsCalendarEventCallRecordingWidgetVisible = (): boolean => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const { targetRecordIdentifier } = useLayoutRenderingContext();

  const hasCallRecordingObjectMetadata = objectMetadataItems.some(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === CoreObjectNameSingular.CallRecording,
  );

  const targetObjectNameSingular =
    targetRecordIdentifier?.targetObjectNameSingular;

  const isSupportedTarget =
    targetObjectNameSingular === CoreObjectNameSingular.CalendarEvent ||
    targetObjectNameSingular === CoreObjectNameSingular.CallRecording;

  return hasCallRecordingObjectMetadata && isSupportedTarget;
};
