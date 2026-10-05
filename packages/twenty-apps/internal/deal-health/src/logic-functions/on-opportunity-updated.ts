import {
  defineLogicFunction,
  type ObjectRecordUpdateEvent,
} from 'twenty-sdk/define';
import { type DatabaseEventPayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { OPPORTUNITY_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getDealHealthSettings } from 'src/utils/get-deal-health-settings';
import { scoreOpportunityById } from 'src/utils/score-opportunities';

type OpportunityUpdate = { id?: string | null; stage?: string | null };

const handler = async (
  event: DatabaseEventPayload<ObjectRecordUpdateEvent<OpportunityUpdate>>,
): Promise<void> => {
  const opportunityId = event.properties.after?.id ?? event.recordId;

  if (!opportunityId) {
    return;
  }

  const now = new Date();
  const hasStageChanged =
    event.properties.before?.stage !== event.properties.after?.stage;

  await scoreOpportunityById({
    client: new CoreApiClient(),
    opportunityId,
    settings: getDealHealthSettings(),
    now,
    stageChangedAtOverride: hasStageChanged ? now.toISOString() : undefined,
  });
};

// Only stage and close date are watched: the fields this app writes back are
// not in the list, so its own updates never retrigger it.
export default defineLogicFunction({
  universalIdentifier: OPPORTUNITY_UPDATED_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'on-opportunity-updated',
  description:
    'Restarts the stage clock when the stage changes and rescores the opportunity when its stage or close date changes.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'opportunity.updated',
    updatedFields: ['stage', 'closeDate'],
  },
  handler,
});
