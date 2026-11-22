import { t } from '@lingui/core/macro';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { SidePanelPages } from 'twenty-shared/types';
import { useIcons } from 'twenty-ui/icon';
import { v4 } from 'uuid';

import { recordCallRecordingTargetComponentState } from '@/call-recording/states/recordCallRecordingTargetComponentState';
import { type CallRecordingTarget } from '@/call-recording/types/CallRecordingTarget';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';

export const useOpenRecordCallRecordingInSidePanel = () => {
  const store = useStore();
  const { navigateSidePanelMenu } = useSidePanelMenu();
  const { getIcon } = useIcons();

  const openRecordCallRecordingInSidePanel = useCallback(
    (target: CallRecordingTarget) => {
      const pageId = v4();

      store.set(
        recordCallRecordingTargetComponentState.atomFamily({
          instanceId: pageId,
        }),
        target,
      );

      navigateSidePanelMenu({
        page: SidePanelPages.RecordCallRecording,
        pageTitle: t`Record meeting`,
        pageIcon: getIcon('IconMicrophone'),
        pageId,
      });
    },
    [getIcon, navigateSidePanelMenu, store],
  );

  return { openRecordCallRecordingInSidePanel };
};
