import { type CoreApiClient } from 'twenty-client-sdk/core';

import { executeWithRetry } from 'src/utils/execute-with-retry';
import { type MatchKey } from 'src/utils/find-duplicate-groups';
import {
  collapseWhitespace,
  toEmailKey,
  toLinkedinKey,
  toPersonNameKey,
} from 'src/utils/match-keys';
import {
  type HygieneRecord,
  type HygieneUpdate,
  planHygieneUpdates,
} from 'src/utils/plan-hygiene-updates';

const QUERY_MAX_RECORDS = 100;

export type PersonNode = {
  id: string;
  createdAt: string;
  name: { firstName: string | null; lastName: string | null } | null;
  emails: {
    primaryEmail: string | null;
    additionalEmails: string[] | null;
  } | null;
  phones: { primaryPhoneNumber: string | null } | null;
  linkedinLink: { primaryLinkUrl: string | null } | null;
  jobTitle: string | null;
  companyId: string | null;
  company: { possibleDuplicateOfId: string | null } | null;
  notDuplicate: boolean | null;
  dataQuality: string | null;
  dataQualityIssues: string | null;
  possibleDuplicateOfId: string | null;
};

const PERSON_NODE_SELECTION = {
  id: true,
  createdAt: true,
  name: { firstName: true, lastName: true },
  emails: { primaryEmail: true, additionalEmails: true },
  phones: { primaryPhoneNumber: true },
  linkedinLink: { primaryLinkUrl: true },
  jobTitle: true,
  companyId: true,
  company: { possibleDuplicateOfId: true },
  notDuplicate: true,
  dataQuality: true,
  dataQualityIssues: true,
  possibleDuplicateOfId: true,
} as const;

const collapseOrKeep = (value: string | null | undefined): string | null =>
  value === null || value === undefined ? null : collapseWhitespace(value);

const getNormalizedFields = (person: PersonNode): Record<string, unknown> => {
  const firstName = collapseOrKeep(person.name?.firstName);
  const lastName = collapseOrKeep(person.name?.lastName);
  const jobTitle = collapseOrKeep(person.jobTitle);

  const hasNameChanged =
    firstName !== (person.name?.firstName ?? null) ||
    lastName !== (person.name?.lastName ?? null);

  return {
    ...(hasNameChanged ? { name: { firstName, lastName } } : {}),
    ...(jobTitle !== person.jobTitle ? { jobTitle } : {}),
  };
};

const getEmailKeys = (person: PersonNode): string[] => [
  ...new Set(
    [
      person.emails?.primaryEmail,
      ...(Array.isArray(person.emails?.additionalEmails)
        ? person.emails.additionalEmails
        : []),
    ]
      .map(toEmailKey)
      .filter((key): key is string => key !== null),
  ),
];

// People at two companies already flagged as duplicates of each other count as
// being at the same company.
const getCompanyGroupId = (person: PersonNode): string | null =>
  person.company?.possibleDuplicateOfId ?? person.companyId;

const getLabel = (person: PersonNode): string =>
  collapseWhitespace(
    `${person.name?.firstName ?? ''} ${person.name?.lastName ?? ''}`,
  );

export const toPersonHygieneRecord = (person: PersonNode): HygieneRecord => {
  const emailKeys = getEmailKeys(person);
  const linkedinKey = toLinkedinKey(person.linkedinLink?.primaryLinkUrl);
  const nameKey = toPersonNameKey(
    person.name?.firstName,
    person.name?.lastName,
  );
  const hasPhone = (person.phones?.primaryPhoneNumber ?? '').trim().length > 0;
  const companyGroupId = getCompanyGroupId(person);

  const keys: MatchKey[] = [
    ...emailKeys.map((value) => ({ kind: 'EMAIL' as const, value })),
    ...(linkedinKey ? [{ kind: 'LINKEDIN' as const, value: linkedinKey }] : []),
    // A name alone is too common to call a duplicate; the same name at the
    // same company is not.
    ...(nameKey && companyGroupId
      ? [
          {
            kind: 'NAME_AT_COMPANY' as const,
            value: `${nameKey}|${companyGroupId}`,
          },
        ]
      : []),
  ];

  const missingFieldIssues = [
    ...(emailKeys.length === 0 && !hasPhone ? ['No email or phone'] : []),
    ...(person.companyId ? [] : ['No company']),
  ];

  return {
    id: person.id,
    createdAt: person.createdAt,
    label: getLabel(person),
    keys: person.notDuplicate === true ? [] : keys,
    missingFieldIssues,
    normalizedFields: getNormalizedFields(person),
    current: {
      dataQuality: person.dataQuality,
      dataQualityIssues: person.dataQualityIssues,
      possibleDuplicateOfId: person.possibleDuplicateOfId,
    },
  };
};

const applyPersonUpdates = async (
  client: CoreApiClient,
  updates: HygieneUpdate[],
): Promise<number> => {
  for (const { id, data } of updates) {
    await executeWithRetry(() =>
      client.mutation({
        updatePerson: { __args: { id, data }, id: true },
      }),
    );
  }

  return updates.length;
};

const fetchPeople = async (
  client: CoreApiClient,
  filter?: object,
): Promise<PersonNode[]> => {
  const people: PersonNode[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await executeWithRetry(() =>
      client.query({
        people: {
          __args: { filter, first: QUERY_MAX_RECORDS, after: cursor },
          edges: { node: PERSON_NODE_SELECTION },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      }),
    );
    const connection = response.people;

    // additionalEmails is typed as raw JSON by the generated client.
    people.push(
      ...((connection?.edges ?? []) as unknown as { node: PersonNode }[]).map(
        (edge) => edge.node,
      ),
    );

    // A candidate lookup only needs one page; the nightly scan catches the rest.
    hasNextPage = filter ? false : (connection?.pageInfo.hasNextPage ?? false);
    cursor = connection?.pageInfo.endCursor ?? undefined;
  }

  return people;
};

const buildCandidateFilter = (person: PersonNode): object => {
  const linkedinKey = toLinkedinKey(person.linkedinLink?.primaryLinkUrl);

  const candidateConditions = [
    ...getEmailKeys(person).map((emailKey) => ({
      emails: { primaryEmail: { ilike: emailKey } },
    })),
    ...(linkedinKey
      ? [{ linkedinLink: { primaryLinkUrl: { ilike: `%${linkedinKey}%` } } }]
      : []),
    ...(person.companyId
      ? [
          {
            companyId: {
              in: [...new Set([person.companyId, getCompanyGroupId(person)])],
            },
          },
        ]
      : []),
    { possibleDuplicateOfId: { eq: person.id } },
    ...(person.possibleDuplicateOfId
      ? [{ id: { eq: person.possibleDuplicateOfId } }]
      : []),
  ];

  return { and: [{ id: { neq: person.id } }, { or: candidateConditions }] };
};

export const checkPersonById = async ({
  client,
  personId,
}: {
  client: CoreApiClient;
  personId: string;
}): Promise<number> => {
  const [person] = await fetchPeople(client, { id: { eq: personId } });

  if (!person) {
    return 0;
  }

  const candidates = await fetchPeople(client, buildCandidateFilter(person));

  return applyPersonUpdates(
    client,
    planHygieneUpdates({
      records: [person, ...candidates].map(toPersonHygieneRecord),
      focusRecordId: person.id,
    }),
  );
};

export const scanAllPeople = async (
  client: CoreApiClient,
): Promise<{ scannedCount: number; updatedCount: number }> => {
  const people = await fetchPeople(client);
  const updatedCount = await applyPersonUpdates(
    client,
    planHygieneUpdates({ records: people.map(toPersonHygieneRecord) }),
  );

  return { scannedCount: people.length, updatedCount };
};
