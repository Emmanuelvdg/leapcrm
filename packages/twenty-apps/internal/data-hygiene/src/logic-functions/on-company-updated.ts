import {
  defineLogicFunction,
  type ObjectRecordUpdateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { COMPANY_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { checkCompanyById } from 'src/utils/company-hygiene';

type CompanyUpdate = { id?: string | null };

const handler = async (
  event: DatabaseEventPayload<ObjectRecordUpdateEvent<CompanyUpdate>>,
): Promise<void> => {
  const companyId = event.properties.after?.id ?? event.recordId;

  if (!companyId) {
    return;
  }

  await checkCompanyById({ client: new CoreApiClient(), companyId });
};

// The data quality fields this app writes are not watched, so flagging a
// company never retriggers this function. Trimming the name does, once, and
// that second run finds nothing left to change.
export default defineLogicFunction({
  universalIdentifier: COMPANY_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-company-updated',
  description:
    'Rechecks a company when its name, domain or "Not a duplicate" flag changes.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'company.updated',
    updatedFields: ['name', 'domainName', 'notDuplicate'],
  },
  handler,
});
