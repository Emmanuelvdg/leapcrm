import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type CallRecordingTarget } from '@/call-recording/types/CallRecordingTarget';
import { useDirectFileUpload } from '@/file/hooks/useDirectFileUpload';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { FileFolder } from '~/generated-metadata/graphql';

type SaveCallRecordingArgs = {
  file: File;
  title: string;
  target: CallRecordingTarget;
  startedAt: Date | null;
  endedAt: Date | null;
};

export const useSaveCallRecording = () => {
  const { uploadFile } = useDirectFileUpload();
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.CallRecording,
  });
  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.CallRecording,
  });

  const saveCallRecording = async ({
    file,
    title,
    target,
    startedAt,
    endedAt,
  }: SaveCallRecordingArgs) => {
    const audioFieldMetadataItem = objectMetadataItem.fields.find(
      (field) => field.name === 'audio',
    );

    if (!isDefined(audioFieldMetadataItem)) {
      throw new Error('The call recording audio field is missing');
    }

    const uploadedFile = await uploadFile(file, {
      fileFolder: FileFolder.FilesField,
      fieldMetadataId: audioFieldMetadataItem.id,
    });

    // PROCESSING plus a PENDING transcript marker is what the server
    // transcription listener waits for.
    return createOneRecord({
      title,
      status: 'PROCESSING',
      startedAt: startedAt?.toISOString() ?? null,
      endedAt: endedAt?.toISOString() ?? null,
      audio: [{ fileId: uploadedFile.id, label: file.name }],
      transcript: { status: 'PENDING' },
      [`${target.objectNameSingular}Id`]: target.recordId,
    });
  };

  return { saveCallRecording };
};
