import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import {
  FORWARDED_REQUEST_HEADERS,
  RATE_LIMIT_MAX_SUBMISSIONS,
  RATE_LIMIT_WINDOW_MINUTES,
  SUBMIT_FORM_ROUTE_PATH,
} from 'src/constants/lead-capture-settings';
import { SUBMIT_FORM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { fetchLeadForm, type LeadForm } from 'src/utils/fetch-lead-form';
import { getLeadCaptureSettings } from 'src/utils/get-lead-capture-settings';
import { countRecentSubmissions } from 'src/utils/lead-records';
import { mapAnswers } from 'src/utils/map-answers';
import { parseSubmission } from 'src/utils/parse-submission';
import { processLeadSubmission } from 'src/utils/process-lead-submission';
import { renderMessagePage } from 'src/utils/render-form-page';
import {
  getVisitorIp,
  hashVisitor,
  isRequestFromAllowedSite,
  isSubmittedTooFast,
} from 'src/utils/spam-guards';

type SubmissionResult =
  | { kind: 'accepted'; submissionId: string | null }
  | { kind: 'invalid'; errors: Record<string, string> }
  | { kind: 'refused'; status: number; message: string };

// A plain HTML form post expects a page back; the hosted page and API
// clients send JSON and expect JSON.
const wantsHtml = (headers: Record<string, string | undefined>): boolean => {
  const contentType = headers['content-type'] ?? '';
  const accept = headers['accept'] ?? '';

  return (
    !contentType.includes('application/json') &&
    !accept.includes('application/json') &&
    (accept.includes('text/html') ||
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data'))
  );
};

const toResponse = (
  result: SubmissionResult,
  form: LeadForm | undefined,
  asHtml: boolean,
) => {
  const status =
    result.kind === 'accepted'
      ? 200
      : result.kind === 'invalid'
        ? 400
        : result.status;

  if (!asHtml) {
    return new Response(
      result.kind === 'accepted'
        ? { ok: true, submissionId: result.submissionId }
        : result.kind === 'invalid'
          ? { ok: false, errors: result.errors }
          : { ok: false, message: result.message },
      { status, headers: { 'cache-control': 'no-store' } },
    );
  }

  const page =
    result.kind === 'accepted'
      ? renderMessagePage({
          title: 'Thank you!',
          message: form?.successMessage ?? 'Your details have been sent.',
          redirectUrl: form?.redirectUrl ?? null,
        })
      : result.kind === 'invalid'
        ? renderMessagePage({
            title: 'Please check the form',
            message: 'Some answers need another look:',
            details: Object.values(result.errors),
            backLink: true,
          })
        : renderMessagePage({ title: 'Not sent', message: result.message });

  return new Response(page, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};

const submitLeadForm = async (
  payload: RoutePayload<Record<string, unknown>>,
  form: LeadForm | undefined,
): Promise<SubmissionResult> => {
  if (!form || !form.isActive) {
    return {
      kind: 'refused',
      status: 404,
      message: 'This form is not accepting responses right now.',
    };
  }

  const headers = payload.headers;
  const body =
    typeof payload.body === 'object' && payload.body !== null
      ? payload.body
      : {};
  const nowMs = Date.now();

  if (
    !isRequestFromAllowedSite({
      allowedDomains: form.allowedDomains,
      origin: headers['origin'] ?? null,
      referer: headers['referer'] ?? null,
      formHost: headers['host'] ?? null,
    })
  ) {
    return {
      kind: 'refused',
      status: 403,
      message: 'This form cannot be submitted from this website.',
    };
  }

  const parsed = parseSubmission({
    fields: form.fields,
    body,
    query: payload.queryStringParameters,
    referrerHeader: headers['referer'] ?? null,
  });

  // Bots get the same success answer as people, so they learn nothing, but
  // nothing is saved.
  if (
    parsed.isHoneypotFilled ||
    isSubmittedTooFast({ renderedAtMs: parsed.renderedAtMs, nowMs })
  ) {
    return { kind: 'accepted', submissionId: null };
  }

  if (Object.keys(parsed.errors).length > 0) {
    return { kind: 'invalid', errors: parsed.errors };
  }

  const client = new CoreApiClient();
  const userAgent = headers['user-agent'] ?? null;
  const visitorHash = hashVisitor({
    ip: getVisitorIp(headers),
    userAgent,
    formId: form.id,
  });

  if (visitorHash) {
    const recentCount = await countRecentSubmissions(client, {
      formId: form.id,
      visitorHash,
      since: new Date(
        nowMs - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
      ).toISOString(),
      limit: RATE_LIMIT_MAX_SUBMISSIONS,
    });

    if (recentCount >= RATE_LIMIT_MAX_SUBMISSIONS) {
      return {
        kind: 'refused',
        status: 429,
        message:
          'Too many submissions from this device. Please try again in a few minutes.',
      };
    }
  }

  const { submissionId } = await processLeadSubmission({
    client,
    form,
    mapped: mapAnswers(form.fields, parsed.answers),
    answers: parsed.answers,
    meta: parsed.meta,
    visitorHash,
    userAgent,
    settings: getLeadCaptureSettings(),
  });

  return { kind: 'accepted', submissionId };
};

const handler = async (
  payload: RoutePayload<Record<string, unknown>>,
): Promise<object> => {
  const asHtml = wantsHtml(payload.headers);
  let form: LeadForm | undefined;

  try {
    form = await fetchLeadForm(
      new CoreApiClient(),
      payload.pathParameters.formId,
    );

    return toResponse(await submitLeadForm(payload, form), form, asHtml);
  } catch (error) {
    console.error(
      `Lead capture could not save a submission to form ${payload.pathParameters.formId}: ${error instanceof Error ? error.message : String(error)}`,
    );

    return toResponse(
      {
        kind: 'refused',
        status: 500,
        message: 'Your details could not be saved. Please try again later.',
      },
      form,
      asHtml,
    );
  }
};

export default defineLogicFunction({
  universalIdentifier: SUBMIT_FORM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'submit-lead-form',
  description:
    'Public endpoint that receives a lead form submission (JSON or a plain HTML form post), checks it for spam, creates or updates the contact, company and deal, and logs the submission.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: SUBMIT_FORM_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: FORWARDED_REQUEST_HEADERS,
  },
});
