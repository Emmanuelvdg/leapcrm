import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PERSON_LEAD_SOURCE_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_LEAD_SOURCE_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  name: 'leadSourceCampaign',
  type: FieldType.TEXT,
  label: 'Lead source campaign',
  description: 'utm_campaign when this contact first came in.',
  icon: 'IconSpeakerphone',
  isNullable: true,
});
