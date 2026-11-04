import { CommandMenuContext } from '@/command-menu-item/contexts/CommandMenuContext';
import { useSidePanelWorkflowNavigation } from '@/side-panel/pages/workflow/hooks/useSidePanelWorkflowNavigation';
import { sidePanelNavigationStackState } from '@/side-panel/states/sidePanelNavigationStackState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { useLingui } from '@lingui/react/macro';
import { useContext } from 'react';
import { IconListDetails } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';

export const WorkflowRunTraceButton = () => {
  const { t } = useLingui();
  const workflowRunId = useWorkflowRunIdOrThrow();
  const { openWorkflowRunTraceInSidePanel } = useSidePanelWorkflowNavigation();
  const { commandMenuContextApi } = useContext(CommandMenuContext);
  const setSidePanelNavigationStack = useSetAtomState(
    sidePanelNavigationStackState,
  );

  const handleClick = () => {
    if (!commandMenuContextApi.isInSidePanel) {
      setSidePanelNavigationStack([]);
    }

    openWorkflowRunTraceInSidePanel(workflowRunId);
  };

  return (
    <Button
      Icon={IconListDetails}
      title={t`View trace`}
      size="small"
      variant="secondary"
      onClick={handleClick}
    />
  );
};
