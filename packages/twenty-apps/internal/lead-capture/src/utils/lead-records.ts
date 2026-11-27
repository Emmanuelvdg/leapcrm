import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  getPhoneSearchFragment,
  phonesMatch,
  type StoredPhones,
} from 'src/utils/phone-number';

const MAX_CANDIDATES = 20;

type Edges<TNode> = { edges: { node: TNode }[] } | null | undefined;

const nodesOf = <TNode>(connection: Edges<TNode>): TNode[] =>
  (connection?.edges ?? []).map((edge) => edge.node);

export type PersonRecord = {
  id: string;
  name: { firstName: string | null; lastName: string | null } | null;
  emails: {
    primaryEmail: string | null;
    additionalEmails: string[] | null;
  } | null;
  phones: StoredPhones | null;
  jobTitle: string | null;
  companyId: string | null;
  leadSource: string | null;
  leadSourceMedium: string | null;
  leadSourceCampaign: string | null;
};

const PERSON_SELECTION = {
  id: true,
  name: { firstName: true, lastName: true },
  emails: { primaryEmail: true, additionalEmails: true },
  phones: {
    primaryPhoneNumber: true,
    primaryPhoneCallingCode: true,
    additionalPhones: true,
  },
  jobTitle: true,
  companyId: true,
  leadSource: true,
  leadSourceMedium: true,
  leadSourceCampaign: true,
} as const;

export const findPersonByEmail = async (
  client: CoreApiClient,
  email: string,
): Promise<PersonRecord | undefined> => {
  const { people } = await client.query({
    people: {
      __args: {
        filter: { emails: { primaryEmail: { ilike: email } } },
        first: MAX_CANDIDATES,
      },
      edges: { node: PERSON_SELECTION },
    },
  });

  // ilike treats "_" as a wildcard, so the match is confirmed exactly here.
  return nodesOf(people as Edges<PersonRecord>).find(
    (person) => person.emails?.primaryEmail?.toLowerCase() === email,
  );
};

export const findPersonByPhone = async (
  client: CoreApiClient,
  internationalDigits: string,
): Promise<PersonRecord | undefined> => {
  const { people } = await client.query({
    people: {
      __args: {
        filter: {
          phones: {
            primaryPhoneNumber: {
              like: `%${getPhoneSearchFragment(internationalDigits)}%`,
            },
          },
        },
        first: MAX_CANDIDATES,
      },
      edges: { node: PERSON_SELECTION },
    },
  });

  return nodesOf(people as Edges<PersonRecord>).find(
    (person) =>
      person.phones && phonesMatch(person.phones, internationalDigits),
  );
};

export const createPerson = async (
  client: CoreApiClient,
  data: Record<string, unknown>,
): Promise<string> => {
  const { createPerson: person } = await client.mutation({
    createPerson: { __args: { data }, id: true },
  });

  return (person as { id: string }).id;
};

export const updatePerson = async (
  client: CoreApiClient,
  id: string,
  data: Record<string, unknown>,
): Promise<void> => {
  await client.mutation({
    updatePerson: { __args: { id, data }, id: true },
  });
};

type CompanyNode = {
  id: string;
  name: string | null;
  domainName: { primaryLinkUrl: string | null } | null;
};

const toHostname = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);

    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
};

export const findCompanyByName = async (
  client: CoreApiClient,
  name: string,
): Promise<string | undefined> => {
  const { companies } = await client.query({
    companies: {
      __args: { filter: { name: { ilike: name } }, first: MAX_CANDIDATES },
      edges: { node: { id: true, name: true } },
    },
  });

  return nodesOf(companies as Edges<CompanyNode>).find(
    (company) => company.name?.trim().toLowerCase() === name.toLowerCase(),
  )?.id;
};

export const findCompanyByDomain = async (
  client: CoreApiClient,
  domain: string,
): Promise<string | undefined> => {
  const { companies } = await client.query({
    companies: {
      __args: {
        filter: { domainName: { primaryLinkUrl: { ilike: `%${domain}%` } } },
        first: MAX_CANDIDATES,
      },
      edges: { node: { id: true, domainName: { primaryLinkUrl: true } } },
    },
  });

  return nodesOf(companies as Edges<CompanyNode>).find(
    (company) => toHostname(company.domainName?.primaryLinkUrl) === domain,
  )?.id;
};

export const createCompany = async (
  client: CoreApiClient,
  { name, domain }: { name: string; domain: string | null },
): Promise<string> => {
  const { createCompany: company } = await client.mutation({
    createCompany: {
      __args: {
        data: {
          name,
          ...(domain
            ? { domainName: { primaryLinkUrl: `https://${domain}` } }
            : {}),
        },
      },
      id: true,
    },
  });

  return (company as { id: string }).id;
};

export const findOpenDealId = async (
  client: CoreApiClient,
  personId: string,
  closedStages: string[],
): Promise<string | undefined> => {
  const { opportunities } = await client.query({
    opportunities: {
      __args: {
        filter: { pointOfContactId: { eq: personId } },
        orderBy: [{ createdAt: 'DescNullsLast' }],
        first: MAX_CANDIDATES,
      },
      edges: { node: { id: true, stage: true } },
    },
  });

  return nodesOf(
    opportunities as Edges<{ id: string; stage: string | null }>,
  ).find((deal) => !closedStages.includes(deal.stage ?? ''))?.id;
};

export const createDeal = async (
  client: CoreApiClient,
  data: Record<string, unknown>,
): Promise<string> => {
  const { createOpportunity: deal } = await client.mutation({
    createOpportunity: { __args: { data }, id: true },
  });

  return (deal as { id: string }).id;
};

export const createNote = async (
  client: CoreApiClient,
  {
    title,
    markdown,
    personId,
    opportunityId,
  }: {
    title: string;
    markdown: string;
    personId: string;
    opportunityId: string | null;
  },
): Promise<void> => {
  const { createNote: note } = await client.mutation({
    createNote: {
      __args: { data: { title, bodyV2: { markdown } } },
      id: true,
    },
  });
  const noteId = (note as { id: string }).id;

  await client.mutation({
    createNoteTarget: {
      __args: { data: { noteId, targetPersonId: personId } },
      id: true,
    },
  });

  if (opportunityId) {
    await client.mutation({
      createNoteTarget: {
        __args: { data: { noteId, targetOpportunityId: opportunityId } },
        id: true,
      },
    });
  }
};

export const createSubmission = async (
  client: CoreApiClient,
  data: Record<string, unknown>,
): Promise<string> => {
  const { createLeadFormSubmission: submission } = await client.mutation({
    createLeadFormSubmission: { __args: { data }, id: true },
  });

  return (submission as { id: string }).id;
};

export const countRecentSubmissions = async (
  client: CoreApiClient,
  {
    formId,
    visitorHash,
    since,
    limit,
  }: { formId: string; visitorHash: string; since: string; limit: number },
): Promise<number> => {
  const { leadFormSubmissions } = await client.query({
    leadFormSubmissions: {
      __args: {
        filter: {
          formId: { eq: formId },
          visitorHash: { eq: visitorHash },
          createdAt: { gte: since },
        },
        first: limit,
      },
      edges: { node: { id: true } },
    },
  });

  return nodesOf(leadFormSubmissions as Edges<{ id: string }>).length;
};
