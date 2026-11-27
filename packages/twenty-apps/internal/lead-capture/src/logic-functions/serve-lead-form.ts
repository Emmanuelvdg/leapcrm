import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import {
  FORM_ROUTE_BASE_PATH,
  SERVE_FORM_ROUTE_PATH,
} from 'src/constants/lead-capture-settings';
import { SERVE_FORM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { fetchLeadForm } from 'src/utils/fetch-lead-form';
import { renderFormPage, renderMessagePage } from 'src/utils/render-form-page';

const htmlResponse = (status: number, body: string) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const handler = async (payload: RoutePayload): Promise<object> => {
  const formId = payload.pathParameters.formId;

  try {
    const form = await fetchLeadForm(new CoreApiClient(), formId);

    if (!form || !form.isActive) {
      return htmlResponse(
        404,
        renderMessagePage({
          title: 'Form not available',
          message: 'This form is not accepting responses right now.',
        }),
      );
    }

    return htmlResponse(
      200,
      renderFormPage({
        formId: form.id,
        form,
        fields: form.fields,
        submitUrl: `/s${FORM_ROUTE_BASE_PATH}/${form.id}/submissions`,
        renderedAtMs: Date.now(),
      }),
    );
  } catch (error) {
    console.error(
      `Lead capture could not render form ${formId}: ${error instanceof Error ? error.message : String(error)}`,
    );

    return htmlResponse(
      500,
      renderMessagePage({
        title: 'Something went wrong',
        message: 'The form could not be loaded. Please try again later.',
      }),
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: SERVE_FORM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'serve-lead-form',
  description:
    'Serves the public page of a lead form, which can be shared as a link or embedded on a website.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: SERVE_FORM_ROUTE_PATH,
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
