import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { COMPANY_NOT_DUPLICATE_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_NOT_DUPLICATE_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.BOOLEAN,
  name: 'notDuplicate',
  label: 'Not a duplicate',
  description:
    'Tick after reviewing a possible duplicate that is really a different company. It will no longer be matched against other records.',
  icon: 'IconCopyOff',
  defaultValue: false,
});
