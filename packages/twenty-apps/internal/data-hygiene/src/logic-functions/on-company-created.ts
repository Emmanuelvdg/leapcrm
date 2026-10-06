import {
  defineLogicFunction,
  type ObjectRecordCreateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { COMPANY_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { checkCompanyById } from 'src/utils/company-hygiene';

type CompanyCreate = { id?: string | null };

const handler = async (
  event: DatabaseEventPayload<ObjectRecordCreateEvent<CompanyCreate>>,
): Promise<void> => {
  const companyId = event.properties.after.id ?? event.recordId;

  if (!companyId) {
    return;
  }

  await checkCompanyById({ client: new CoreApiClient(), companyId });
};

export default defineLogicFunction({
  universalIdentifier: COMPANY_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-company-created',
  description:
    'Trims stray whitespace and checks a new company for duplicates and missing details.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'company.created',
  },
  handler,
});
