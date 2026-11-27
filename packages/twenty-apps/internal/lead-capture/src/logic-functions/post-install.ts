import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { DEFAULT_FORM_FIELDS } from 'src/constants/form-field-options';
import { POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { toStoredFormFields } from 'src/utils/parse-form-fields';

const STARTER_FORM_NAME = 'Website enquiry';

// A ready-made form so the workspace can share a link the minute the app is
// installed; it is only created once.
const handler = async (): Promise<object> => {
  const client = new CoreApiClient();

  const { leadForms } = await client.query({
    leadForms: {
      __args: { first: 1 },
      edges: { node: { id: true } },
    },
  });

  if ((leadForms?.edges ?? []).length > 0) {
    return { outcome: 'already-has-forms' };
  }

  await client.mutation({
    createLeadForm: {
      __args: {
        data: {
          name: STARTER_FORM_NAME,
          status: 'ACTIVE',
          headline: 'Get in touch',
          intro:
            'Tell us a little about what you need and we will get back to you, usually within a working day.',
          submitLabel: 'Send enquiry',
          successMessage:
            'Thanks for getting in touch. Someone from our team will contact you shortly.',
          formFields: toStoredFormFields(DEFAULT_FORM_FIELDS),
          createDeal: true,
          leadSource: 'Website',
        },
      },
      id: true,
    },
  });

  return { outcome: 'created-starter-form' };
};

export default definePostInstallLogicFunction({
  universalIdentifier: POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'post-install',
  description: 'Creates a starter "Website enquiry" form on first install.',
  timeoutSeconds: 60,
  shouldRunSynchronously: true,
  handler,
});
