import { type CoreApiClient } from 'twenty-client-sdk/core';

import { checkCompanyById } from 'src/utils/company-hygiene';
import { checkPersonById } from 'src/utils/person-hygiene';

export type DuplicatePair = {
  duplicateId: string;
  duplicateLabel: string;
  survivorId: string;
  survivorLabel: string;
};

export type DuplicateMerger = {
  objectNameSingular: 'company' | 'person';
  objectLabel: string;
  findDuplicatePair: (params: {
    client: CoreApiClient;
    recordId: string;
  }) => Promise<DuplicatePair | null>;
  mergeDuplicatePair: (params: {
    client: CoreApiClient;
    duplicatePair: DuplicatePair;
  }) => Promise<void>;
};

type PersonName = {
  firstName?: string | null;
  lastName?: string | null;
} | null;

const toPersonLabel = (name: PersonName | undefined): string =>
  [name?.firstName, name?.lastName]
    .map((part) => part?.trim())
    .filter((part) => part !== undefined && part.length > 0)
    .join(' ');

// The older record is first so its values win where both records have one,
// keeping the direction of the "Possible duplicate of" link.
const toMergeIds = (duplicatePair: DuplicatePair): string[] => [
  duplicatePair.survivorId,
  duplicatePair.duplicateId,
];

export const COMPANY_DUPLICATE_MERGER: DuplicateMerger = {
  objectNameSingular: 'company',
  objectLabel: 'company',
  findDuplicatePair: async ({ client, recordId }) => {
    const response = await client.query({
      companies: {
        __args: { filter: { id: { eq: recordId } }, first: 1 },
        edges: {
          node: {
            id: true,
            name: true,
            possibleDuplicateOf: { id: true, name: true },
          },
        },
      },
    });
    const company = response.companies?.edges[0]?.node;

    if (!company?.possibleDuplicateOf) {
      return null;
    }

    return {
      duplicateId: company.id,
      duplicateLabel: company.name ?? '',
      survivorId: company.possibleDuplicateOf.id,
      survivorLabel: company.possibleDuplicateOf.name ?? '',
    };
  },
  mergeDuplicatePair: async ({ client, duplicatePair }) => {
    await client.mutation({
      mergeCompanies: {
        __args: { ids: toMergeIds(duplicatePair), conflictPriorityIndex: 0 },
        id: true,
      },
    });

    // The merge can copy the deleted record's flags onto the survivor, and
    // no save trigger watches those fields, so recheck it straight away.
    await checkCompanyById({ client, companyId: duplicatePair.survivorId });
  },
};

export const PERSON_DUPLICATE_MERGER: DuplicateMerger = {
  objectNameSingular: 'person',
  objectLabel: 'person',
  findDuplicatePair: async ({ client, recordId }) => {
    const response = await client.query({
      people: {
        __args: { filter: { id: { eq: recordId } }, first: 1 },
        edges: {
          node: {
            id: true,
            name: { firstName: true, lastName: true },
            possibleDuplicateOf: {
              id: true,
              name: { firstName: true, lastName: true },
            },
          },
        },
      },
    });
    const person = response.people?.edges[0]?.node;

    if (!person?.possibleDuplicateOf) {
      return null;
    }

    return {
      duplicateId: person.id,
      duplicateLabel: toPersonLabel(person.name),
      survivorId: person.possibleDuplicateOf.id,
      survivorLabel: toPersonLabel(person.possibleDuplicateOf.name),
    };
  },
  mergeDuplicatePair: async ({ client, duplicatePair }) => {
    await client.mutation({
      mergePeople: {
        __args: { ids: toMergeIds(duplicatePair), conflictPriorityIndex: 0 },
        id: true,
      },
    });

    // The merge can copy the deleted record's flags onto the survivor, and
    // no save trigger watches those fields, so recheck it straight away.
    await checkPersonById({ client, personId: duplicatePair.survivorId });
  },
};
