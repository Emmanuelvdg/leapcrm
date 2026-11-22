import { isDefined } from 'twenty-shared/utils';

import { useOpenRecordCallRecordingInSidePanel } from '@/call-recording/hooks/useOpenRecordCallRecordingInSidePanel';
import { type CallRecordingTargetObjectNameSingular } from '@/call-recording/types/CallRecordingTarget';
import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { getObjectRecordIdentifier } from '@/object-metadata/utils/getObjectRecordIdentifier';

const CALL_RECORDING_TARGET_OBJECT_NAMES: string[] = [
  'person',
  'company',
  'opportunity',
] satisfies CallRecordingTargetObjectNameSingular[];

const isCallRecordingTargetObjectName = (
  objectNameSingular: string,
): objectNameSingular is CallRecordingTargetObjectNameSingular =>
  CALL_RECORDING_TARGET_OBJECT_NAMES.includes(objectNameSingular);

export const RecordMeetingSingleRecordCommand = () => {
  const { selectedRecords, objectMetadataItem } =
    useHeadlessCommandContextApi();
  const { openRecordCallRecordingInSidePanel } =
    useOpenRecordCallRecordingInSidePanel();

  const record = selectedRecords[0];
  const objectNameSingular = objectMetadataItem?.nameSingular;

  if (
    !isDefined(record) ||
    !isDefined(objectMetadataItem) ||
    !isDefined(objectNameSingular) ||
    !isCallRecordingTargetObjectName(objectNameSingular)
  ) {
    throw new Error(
      'A person, company or opportunity is required to record a meeting',
    );
  }

  const handleExecute = () =>
    openRecordCallRecordingInSidePanel({
      objectNameSingular,
      recordId: record.id,
      recordName: getObjectRecordIdentifier({
        objectMetadataItem,
        record,
        allowRequestsToTwentyIcons: false,
      }).name,
    });

  return <HeadlessEngineCommandWrapperEffect execute={handleExecute} ready />;
};
