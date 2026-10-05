import {
  defineLogicFunction,
  type ObjectRecordCreateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { OPPORTUNITY_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getDealHealthSettings } from 'src/utils/get-deal-health-settings';
import { scoreOpportunityById } from 'src/utils/score-opportunities';

type OpportunityCreate = { id?: string | null };

const handler = async (
  event: DatabaseEventPayload<ObjectRecordCreateEvent<OpportunityCreate>>,
): Promise<void> => {
  const opportunityId = event.properties.after.id ?? event.recordId;

  if (!opportunityId) {
    return;
  }

  const now = new Date();

  await scoreOpportunityById({
    client: new CoreApiClient(),
    opportunityId,
    settings: getDealHealthSettings(),
    now,
    stageChangedAtOverride: now.toISOString(),
  });
};

export default defineLogicFunction({
  universalIdentifier: OPPORTUNITY_CREATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-opportunity-created',
  description:
    'Starts the stage clock and scores the health of a new opportunity.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.created',
  },
  handler,
});
