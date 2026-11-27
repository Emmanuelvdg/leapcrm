import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  Command,
  navigate,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { CREATE_QUOTE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { callQuoteAction } from 'src/front-components/utils/call-quote-action';

const CreateQuote = () => {
  const [opportunityId] = useSelectedRecordIds();

  return (
    <Command
      execute={async () => {
        if (!opportunityId) {
          return;
        }

        const result = await callQuoteAction({
          action: 'create',
          opportunityId,
        });

        if (result?.ok) {
          await navigate(AppPath.RecordShowPage, {
            objectNameSingular: 'quote',
            objectRecordId: result.quoteId,
          });
        }
      }}
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: CREATE_QUOTE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'create-quote',
  description:
    'Starts a quote for the selected deal, with its company and contact, and opens it.',
  component: CreateQuote,
  isHeadless: true,
});
