import {
  defineLogicFunction,
  type ObjectRecordCreateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { PERSON_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { checkPersonById } from 'src/utils/person-hygiene';

type PersonCreate = { id?: string | null };

const handler = async (
  event: DatabaseEventPayload<ObjectRecordCreateEvent<PersonCreate>>,
): Promise<void> => {
  const personId = event.properties.after.id ?? event.recordId;

  if (!personId) {
    return;
  }

  await checkPersonById({ client: new CoreApiClient(), personId });
};

export default defineLogicFunction({
  universalIdentifier: PERSON_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-person-created',
  description:
    'Trims stray whitespace and checks a new person for duplicates and missing details.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'person.created',
  },
  handler,
});
