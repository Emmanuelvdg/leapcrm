import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const whatsappAppIdState = createAtomState<string | null>({
  key: 'whatsappAppIdState',
  defaultValue: null,
});
