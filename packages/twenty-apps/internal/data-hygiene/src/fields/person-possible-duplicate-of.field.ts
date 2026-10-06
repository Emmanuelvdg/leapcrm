import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  PERSON_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
  PERSON_POSSIBLE_DUPLICATES_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_POSSIBLE_DUPLICATE_OF_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'possibleDuplicateOf',
  label: 'Possible duplicate of',
  description:
    'The older person this one probably duplicates. Review both and merge them, or tick "Not a duplicate".',
  icon: 'IconCopy',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    PERSON_POSSIBLE_DUPLICATES_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'possibleDuplicateOfId',
  },
  isUIEditable: false,
});
