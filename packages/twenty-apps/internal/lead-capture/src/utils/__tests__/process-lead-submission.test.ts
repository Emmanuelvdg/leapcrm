import { describe, expect, it, vi } from 'vitest';
import { type CoreApiClient } from 'twenty-client-sdk/core';

import { DEFAULT_FORM_FIELDS } from 'src/constants/form-field-options';
import { type LeadForm } from 'src/utils/fetch-lead-form';
import { type PersonRecord } from 'src/utils/lead-records';
import { mapAnswers } from 'src/utils/map-answers';
import { type SubmissionMeta } from 'src/utils/parse-submission';
import { processLeadSubmission } from 'src/utils/process-lead-submission';

const FORM: LeadForm = {
  id: 'form-1',
  name: 'Website enquiry',
  isActive: true,
  headline: 'Get in touch',
  intro: null,
  submitLabel: 'Send',
  successMessage: 'Thanks',
  redirectUrl: null,
  fields: DEFAULT_FORM_FIELDS,
  allowedDomains: [],
  createDeal: true,
  dealStage: 'NEW',
  dealOwnerId: 'member-1',
  leadSource: 'Website',
};

const META: SubmissionMeta = {
  utmSource: 'google',
  utmMedium: 'cpc',
  utmCampaign: 'diwali',
  utmTerm: null,
  utmContent: null,
  pageUrl: 'https://acme.example/contact',
  referrer: null,
};

const SETTINGS = {
  defaultPhoneCountry: 'IN',
  closedStages: ['CUSTOMER', 'LOST'],
};

const ANSWERS = {
  full_name: 'Priya Shah',
  email: 'priya@globex.example',
  phone: '98765 43210',
  company: 'Globex',
  message: 'Need office space',
};

type MockOptions = {
  peopleByEmail?: PersonRecord[];
  existingCompanies?: { id: string; name: string }[];
  openDeals?: { id: string; stage: string }[];
  failFirstCreate?: Record<string, string>;
};

const buildClient = ({
  peopleByEmail = [],
  existingCompanies = [],
  openDeals = [],
  failFirstCreate = {},
}: MockOptions = {}) => {
  const failures = { ...failFirstCreate };
  const mutations: Record<string, Record<string, unknown>[]> = {};

  const query = vi.fn(async (request: Record<string, any>) => {
    const [rootField] = Object.keys(request);
    const filter = request[rootField].__args?.filter ?? {};

    if (rootField === 'people') {
      return {
        people: {
          edges: (filter.emails ? peopleByEmail : []).map((node) => ({ node })),
        },
      };
    }

    if (rootField === 'companies') {
      return {
        companies: {
          edges: (filter.name ? existingCompanies : []).map((node) => ({
            node,
          })),
        },
      };
    }

    if (rootField === 'opportunities') {
      return {
        opportunities: { edges: openDeals.map((node) => ({ node })) },
      };
    }

    return { [rootField]: { edges: [] } };
  });

  const mutation = vi.fn(async (request: Record<string, any>) => {
    const [rootField] = Object.keys(request);
    const args = request[rootField].__args;

    if (failures[rootField]) {
      const message = failures[rootField];

      delete failures[rootField];
      throw new Error(message);
    }

    (mutations[rootField] ??= []).push(args.data ?? args);

    return { [rootField]: { id: `${rootField}-id` } };
  });

  return {
    client: { query, mutation } as unknown as CoreApiClient,
    mutations,
  };
};

const run = (client: CoreApiClient, form: LeadForm = FORM) =>
  processLeadSubmission({
    client,
    form,
    mapped: mapAnswers(form.fields, ANSWERS),
    answers: ANSWERS,
    meta: META,
    visitorHash: 'hash-1',
    userAgent: 'Mozilla/5.0',
    settings: SETTINGS,
  });

describe('processLeadSubmission', () => {
  it('creates the contact, company, deal, note and submission for a new lead', async () => {
    const { client, mutations } = buildClient();

    const result = await run(client);

    expect(result).toEqual({
      submissionId: 'createLeadFormSubmission-id',
      personId: 'createPerson-id',
      opportunityId: 'createOpportunity-id',
      outcome: 'NEW_CONTACT',
      problems: [],
    });
    expect(mutations.createCompany).toEqual([
      {
        name: 'Globex',
        domainName: { primaryLinkUrl: 'https://globex.example' },
      },
    ]);
    expect(mutations.createPerson).toEqual([
      {
        name: { firstName: 'Priya', lastName: 'Shah' },
        emails: { primaryEmail: 'priya@globex.example' },
        phones: {
          primaryPhoneNumber: '9876543210',
          primaryPhoneCountryCode: 'IN',
        },
        companyId: 'createCompany-id',
        leadSource: 'google',
        leadSourceMedium: 'cpc',
        leadSourceCampaign: 'diwali',
      },
    ]);
    expect(mutations.createOpportunity).toEqual([
      {
        name: 'Globex – Website enquiry',
        pointOfContactId: 'createPerson-id',
        companyId: 'createCompany-id',
        ownerId: 'member-1',
        stage: 'NEW',
      },
    ]);
    expect(mutations.createNoteTarget).toEqual([
      { noteId: 'createNote-id', targetPersonId: 'createPerson-id' },
      { noteId: 'createNote-id', targetOpportunityId: 'createOpportunity-id' },
    ]);
    expect(mutations.createLeadFormSubmission?.[0]).toEqual(
      expect.objectContaining({
        name: 'Priya Shah via Website enquiry',
        formId: 'form-1',
        outcome: 'NEW_CONTACT',
        utmSource: 'google',
        visitorHash: 'hash-1',
        problems: null,
      }),
    );
  });

  it('only fills blanks on an existing contact and reuses their open deal', async () => {
    const { client, mutations } = buildClient({
      peopleByEmail: [
        {
          id: 'person-1',
          name: { firstName: 'Priya', lastName: 'S.' },
          emails: {
            primaryEmail: 'priya@globex.example',
            additionalEmails: null,
          },
          phones: {
            primaryPhoneNumber: '',
            primaryPhoneCallingCode: '',
            additionalPhones: null,
          },
          jobTitle: 'COO',
          companyId: 'company-9',
          leadSource: 'Referral',
          leadSourceMedium: null,
          leadSourceCampaign: null,
        },
      ],
      existingCompanies: [{ id: 'company-1', name: 'globex' }],
      openDeals: [
        { id: 'deal-won', stage: 'CUSTOMER' },
        { id: 'deal-open', stage: 'MEETING' },
      ],
    });

    const result = await run(client);

    expect(result.outcome).toBe('EXISTING_CONTACT');
    expect(result.opportunityId).toBe('deal-open');
    // Name, email, job title, company and lead source were already set, so
    // only the missing phone is written.
    expect(mutations.updatePerson).toEqual([
      {
        phones: {
          primaryPhoneNumber: '9876543210',
          primaryPhoneCountryCode: 'IN',
          additionalPhones: null,
        },
      },
    ]);
    expect(mutations.createPerson).toBeUndefined();
    expect(mutations.createCompany).toBeUndefined();
    expect(mutations.createOpportunity).toBeUndefined();
  });

  it('keeps the contact when the phone number is rejected, and says so', async () => {
    const { client, mutations } = buildClient({
      failFirstCreate: {
        createPerson: 'Provided phone number is invalid 98765',
      },
    });

    const result = await run(client);

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain('98765 43210');
    expect(mutations.createPerson?.[0]).not.toHaveProperty('phones');
    expect(
      String(
        mutations.createNote?.[0]?.bodyV2 &&
          JSON.stringify(mutations.createNote[0]),
      ),
    ).toContain('could not be saved');
  });

  it('starts the deal in the first stage when the form stage does not exist', async () => {
    const { client, mutations } = buildClient({
      failFirstCreate: {
        createOpportunity: 'Value "NEW" is not a valid option for stage',
      },
    });

    const result = await run(client);

    expect(result.opportunityId).toBe('createOpportunity-id');
    expect(mutations.createOpportunity?.[0]).not.toHaveProperty('stage');
    expect(result.problems[0]).toContain('deal stage "NEW"');
  });

  it('creates no deal when the form is set not to', async () => {
    const { client, mutations } = buildClient();

    const result = await run(client, { ...FORM, createDeal: false });

    expect(result.opportunityId).toBeNull();
    expect(mutations.createOpportunity).toBeUndefined();
    expect(mutations.createNoteTarget).toHaveLength(1);
  });
});
