import {
  defineLogicFunction,
  type ObjectRecordUpdateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { PERSON_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { checkPersonById } from 'src/utils/person-hygiene';

type PersonUpdate = { id?: string | null };

const handler = async (
  event: DatabaseEventPayload<ObjectRecordUpdateEvent<PersonUpdate>>,
): Promise<void> => {
  const personId = event.properties.after?.id ?? event.recordId;

  if (!personId) {
    return;
  }

  await checkPersonById({ client: new CoreApiClient(), personId });
};

// The data quality fields this app writes are not watched, so flagging a
// person never retriggers this function. Trimming the name or job title does,
// once, and that second run finds nothing left to change.
export default defineLogicFunction({
  universalIdentifier: PERSON_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-person-updated',
  description:
    'Rechecks a person when their name, contact details, company or "Not a duplicate" flag changes.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'person.updated',
    updatedFields: [
      'name',
      'emails',
      'phones',
      'linkedinLink',
      'jobTitle',
      'companyId',
      'notDuplicate',
    ],
  },
  handler,
});
