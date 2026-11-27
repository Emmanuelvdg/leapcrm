import { SidePanelPageComponentInstanceContext } from '@/side-panel/states/contexts/SidePanelPageComponentInstanceContext';
import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';

export const composeEmailDefaultBodyComponentState =
  createAtomComponentState<string>({
    key: 'side-panel/compose-email-default-body',
    defaultValue: '',
    componentInstanceContext: SidePanelPageComponentInstanceContext,
  });
