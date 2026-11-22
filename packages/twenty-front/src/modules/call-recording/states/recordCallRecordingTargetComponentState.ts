import { type CallRecordingTarget } from '@/call-recording/types/CallRecordingTarget';
import { SidePanelPageComponentInstanceContext } from '@/side-panel/states/contexts/SidePanelPageComponentInstanceContext';
import { createAtomComponentState } from '@/ui/utilities/state/jotai/utils/createAtomComponentState';

export const recordCallRecordingTargetComponentState =
  createAtomComponentState<CallRecordingTarget | null>({
    key: 'side-panel/record-call-recording-target',
    defaultValue: null,
    componentInstanceContext: SidePanelPageComponentInstanceContext,
  });
