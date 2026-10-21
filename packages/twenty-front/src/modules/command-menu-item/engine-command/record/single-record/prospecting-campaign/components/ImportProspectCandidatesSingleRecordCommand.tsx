import { isDefined } from 'twenty-shared/utils';

import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { useOpenProspectCandidatesImportDialog } from '@/prospecting/hooks/useOpenProspectCandidatesImportDialog';

export const ImportProspectCandidatesSingleRecordCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();
  const { openProspectCandidatesImportDialog } =
    useOpenProspectCandidatesImportDialog();

  const campaignId = selectedRecords[0]?.id;

  if (!isDefined(campaignId)) {
    throw new Error('Record ID is required to import companies');
  }

  const handleExecute = () => {
    openProspectCandidatesImportDialog({ campaignId });
  };

  return <HeadlessEngineCommandWrapperEffect execute={handleExecute} ready />;
};
