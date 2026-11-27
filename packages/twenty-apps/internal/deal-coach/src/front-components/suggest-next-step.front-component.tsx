import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { SUGGEST_NEXT_STEP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { requestDealRefresh } from 'src/front-components/utils/request-deal-refresh';

const SuggestNextStep = () => {
  const opportunityIds = useSelectedRecordIds();

  return (
    <Command
      execute={async () => {
        await requestDealRefresh(opportunityIds);
      }}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: SUGGEST_NEXT_STEP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'suggest-next-step',
  description:
    'Asks the Deal coach agent for a fresh next best action on the selected deals.',
  component: SuggestNextStep,
  isHeadless: true,
});
