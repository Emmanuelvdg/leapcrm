import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const hasTriggeredWorkspaceActivationState = createAtomState<boolean>({
  key: 'onboarding/hasTriggeredWorkspaceActivationState',
  defaultValue: false,
});
