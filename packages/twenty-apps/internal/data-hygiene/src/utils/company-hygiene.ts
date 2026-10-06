import { type CoreApiClient } from 'twenty-client-sdk/core';

import { executeWithRetry } from 'src/utils/execute-with-retry';
import { type MatchKey } from 'src/utils/find-duplicate-groups';
import { getLongestWord } from 'src/utils/get-longest-word';
import {
  collapseWhitespace,
  toCompanyNameKey,
  toDomainKey,
} from 'src/utils/match-keys';
import {
  type HygieneRecord,
  type HygieneUpdate,
  planHygieneUpdates,
} from 'src/utils/plan-hygiene-updates';

const QUERY_MAX_RECORDS = 100;

export type CompanyNode = {
  id: string;
  createdAt: string;
  name: string | null;
  domainName: { primaryLinkUrl: string | null } | null;
  notDuplicate: boolean | null;
  dataQuality: string | null;
  dataQualityIssues: string | null;
  possibleDuplicateOfId: string | null;
};

const COMPANY_NODE_SELECTION = {
  id: true,
  createdAt: true,
  name: true,
  domainName: { primaryLinkUrl: true },
  notDuplicate: true,
  dataQuality: true,
  dataQualityIssues: true,
  possibleDuplicateOfId: true,
} as const;

export const toCompanyHygieneRecord = (company: CompanyNode): HygieneRecord => {
  const name =
    company.name === null ? null : collapseWhitespace(company.name);
  const domainUrl = company.domainName?.primaryLinkUrl?.trim() ?? '';
  const nameKey = toCompanyNameKey(name);
  const domainKey = toDomainKey(domainUrl);

  const keys: MatchKey[] = [
    ...(nameKey ? [{ kind: 'NAME' as const, value: nameKey }] : []),
    ...(domainKey ? [{ kind: 'DOMAIN' as const, value: domainKey }] : []),
  ];

  return {
    id: company.id,
    createdAt: company.createdAt,
    label: name ?? '',
    keys: company.notDuplicate === true ? [] : keys,
    missingFieldIssues: domainUrl.length > 0 ? [] : ['No domain'],
    normalizedFields: name !== company.name ? { name } : {},
    current: {
      dataQuality: company.dataQuality,
      dataQualityIssues: company.dataQualityIssues,
      possibleDuplicateOfId: company.possibleDuplicateOfId,
    },
  };
};

const applyCompanyUpdates = async (
  client: CoreApiClient,
  updates: HygieneUpdate[],
): Promise<number> => {
  for (const { id, data } of updates) {
    await executeWithRetry(() =>
      client.mutation({
        updateCompany: { __args: { id, data }, id: true },
      }),
    );
  }

  return updates.length;
};

const fetchCompanies = async (
  client: CoreApiClient,
  filter?: object,
): Promise<CompanyNode[]> => {
  const companies: CompanyNode[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await executeWithRetry(() =>
      client.query({
        companies: {
          __args: { filter, first: QUERY_MAX_RECORDS, after: cursor },
          edges: { node: COMPANY_NODE_SELECTION },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      }),
    );
    const connection = response.companies;

    companies.push(
      ...((connection?.edges ?? []) as { node: CompanyNode }[]).map(
        (edge) => edge.node,
      ),
    );

    // A candidate lookup only needs one page; the nightly scan catches the rest.
    hasNextPage = filter ? false : (connection?.pageInfo.hasNextPage ?? false);
    cursor = connection?.pageInfo.endCursor ?? undefined;
  }

  return companies;
};

const buildCandidateFilter = (
  company: CompanyNode,
  record: HygieneRecord,
): object => {
  const nameKey = record.keys.find((key) => key.kind === 'NAME')?.value;
  const domainKey = record.keys.find((key) => key.kind === 'DOMAIN')?.value;

  const candidateConditions = [
    ...(domainKey
      ? [{ domainName: { primaryLinkUrl: { ilike: `%${domainKey}%` } } }]
      : []),
    ...(nameKey ? [{ name: { ilike: `%${getLongestWord(nameKey)}%` } }] : []),
    { possibleDuplicateOfId: { eq: company.id } },
    ...(company.possibleDuplicateOfId
      ? [{ id: { eq: company.possibleDuplicateOfId } }]
      : []),
  ];

  return { and: [{ id: { neq: company.id } }, { or: candidateConditions }] };
};

export const checkCompanyById = async ({
  client,
  companyId,
}: {
  client: CoreApiClient;
  companyId: string;
}): Promise<number> => {
  const [company] = await fetchCompanies(client, { id: { eq: companyId } });

  if (!company) {
    return 0;
  }

  const record = toCompanyHygieneRecord(company);
  const candidates = await fetchCompanies(
    client,
    buildCandidateFilter(company, record),
  );

  return applyCompanyUpdates(
    client,
    planHygieneUpdates({
      records: [record, ...candidates.map(toCompanyHygieneRecord)],
      focusRecordId: company.id,
    }),
  );
};

export const scanAllCompanies = async (
  client: CoreApiClient,
): Promise<{ scannedCount: number; updatedCount: number }> => {
  const companies = await fetchCompanies(client);
  const updatedCount = await applyCompanyUpdates(
    client,
    planHygieneUpdates({ records: companies.map(toCompanyHygieneRecord) }),
  );

  return { scannedCount: companies.length, updatedCount };
};
