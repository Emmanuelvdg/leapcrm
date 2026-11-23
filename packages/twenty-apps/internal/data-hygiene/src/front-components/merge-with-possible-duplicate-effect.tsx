import { useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import {
  AppPath,
  enqueueSnackbar,
  navigate,
  openCommandConfirmationModal,
  unmountFrontComponent,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { type DuplicateMerger } from 'src/utils/merge-with-possible-duplicate';

type MergeWithPossibleDuplicateEffectProps = {
  duplicateMerger: DuplicateMerger;
};

export const MergeWithPossibleDuplicateEffect = ({
  duplicateMerger,
}: MergeWithPossibleDuplicateEffectProps) => {
  const selectedRecordIds = useSelectedRecordIds();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (hasStarted) {
      return;
    }

    setHasStarted(true);

    const run = async () => {
      const { objectNameSingular, objectLabel } = duplicateMerger;

      try {
        if (selectedRecordIds.length !== 1) {
          await enqueueSnackbar({
            message: `Select one ${objectLabel} to merge.`,
            variant: 'info',
          });

          return;
        }

        const client = new CoreApiClient();
        const duplicatePair = await duplicateMerger.findDuplicatePair({
          client,
          recordId: selectedRecordIds[0],
        });

        if (!duplicatePair) {
          await enqueueSnackbar({
            message: `This ${objectLabel} is not flagged as a possible duplicate.`,
            variant: 'info',
          });

          return;
        }

        const { duplicateLabel, survivorId, survivorLabel } = duplicatePair;

        const confirmationResult = await openCommandConfirmationModal({
          title: `Merge into "${survivorLabel}"?`,
          subtitle: `"${duplicateLabel}" will be merged into "${survivorLabel}" and deleted. Notes, tasks and other linked records move across, and "${survivorLabel}" keeps its own values where both have one. This cannot be undone.`,
          confirmButtonText: 'Merge',
          confirmButtonAccent: 'danger',
        });

        if (confirmationResult !== 'confirm') {
          return;
        }

        await duplicateMerger.mergeDuplicatePair({ client, duplicatePair });

        await enqueueSnackbar({
          message: `Merged into "${survivorLabel}".`,
          variant: 'success',
        });

        await navigate(AppPath.RecordShowPage, {
          objectNameSingular,
          objectRecordId: survivorId,
        });
      } catch (error) {
        await enqueueSnackbar({
          message:
            error instanceof Error
              ? error.message
              : `Could not merge this ${objectLabel}.`,
          variant: 'error',
        });
      } finally {
        await unmountFrontComponent();
      }
    };

    run();
  }, [duplicateMerger, hasStarted, selectedRecordIds]);

  return null;
};
