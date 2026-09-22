import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const whatsappEmbeddedSignupConfigIdState = createAtomState<
  string | null
>({
  key: 'whatsappEmbeddedSignupConfigIdState',
  defaultValue: null,
});
