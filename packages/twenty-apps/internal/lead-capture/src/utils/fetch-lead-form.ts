import { type CoreApiClient } from 'twenty-client-sdk/core';

import { type FormField } from 'src/constants/form-field-options';
import { parseFormFields } from 'src/utils/parse-form-fields';
import { parseAllowedDomains } from 'src/utils/spam-guards';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LeadForm = {
  id: string;
  name: string;
  isActive: boolean;
  headline: string;
  intro: string | null;
  submitLabel: string;
  successMessage: string;
  redirectUrl: string | null;
  fields: FormField[];
  allowedDomains: string[];
  createDeal: boolean;
  dealStage: string | null;
  dealOwnerId: string | null;
  leadSource: string;
};

type LeadFormNode = {
  id: string;
  name: string | null;
  status: string | null;
  headline: string | null;
  intro: string | null;
  submitLabel: string | null;
  successMessage: string | null;
  redirectUrl: string | null;
  formFields: unknown;
  allowedDomains: string | null;
  createDeal: boolean | null;
  dealStage: string | null;
  dealOwnerId: string | null;
  leadSource: string | null;
};

// Only web addresses may be used as a redirect: anything else (javascript:,
// data:) would run in the visitor's browser.
const toSafeRedirectUrl = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

export const toLeadForm = (node: LeadFormNode): LeadForm => {
  const name = node.name?.trim() || 'Enquiry form';

  return {
    id: node.id,
    name,
    isActive: node.status !== 'PAUSED',
    headline: node.headline?.trim() || name,
    intro: node.intro?.trim() || null,
    submitLabel: node.submitLabel?.trim() || 'Send',
    successMessage:
      node.successMessage?.trim() ||
      'Thanks for getting in touch. We will get back to you shortly.',
    redirectUrl: toSafeRedirectUrl(node.redirectUrl),
    fields: parseFormFields(node.formFields),
    allowedDomains: parseAllowedDomains(node.allowedDomains),
    createDeal: node.createDeal !== false,
    dealStage: node.dealStage?.trim() || null,
    dealOwnerId: node.dealOwnerId || null,
    leadSource: node.leadSource?.trim() || name,
  };
};

export const fetchLeadForm = async (
  client: CoreApiClient,
  formId: string | undefined,
): Promise<LeadForm | undefined> => {
  if (!formId || !UUID_PATTERN.test(formId)) {
    return undefined;
  }

  // A list query answers an unknown id with no rows, where a single-record
  // query would throw "Record not found".
  const { leadForms } = await client.query({
    leadForms: {
      __args: { filter: { id: { eq: formId } }, first: 1 },
      edges: {
        node: {
          id: true,
          name: true,
          status: true,
          headline: true,
          intro: true,
          submitLabel: true,
          successMessage: true,
          redirectUrl: true,
          formFields: true,
          allowedDomains: true,
          createDeal: true,
          dealStage: true,
          dealOwnerId: true,
          leadSource: true,
        },
      },
    },
  });

  const node = (leadForms?.edges ?? [])[0]?.node as LeadFormNode | undefined;

  return node ? toLeadForm(node) : undefined;
};
