import { type CoreApiClient } from 'twenty-client-sdk/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkCompanyById } from 'src/utils/company-hygiene';
import {
  COMPANY_DUPLICATE_MERGER,
  PERSON_DUPLICATE_MERGER,
} from 'src/utils/merge-with-possible-duplicate';
import { checkPersonById } from 'src/utils/person-hygiene';

vi.mock('src/utils/company-hygiene', () => ({ checkCompanyById: vi.fn() }));
vi.mock('src/utils/person-hygiene', () => ({ checkPersonById: vi.fn() }));

const createClient = (queryResponse: unknown) => {
  const query = vi.fn().mockResolvedValue(queryResponse);
  const mutation = vi.fn().mockResolvedValue({});

  return {
    client: { query, mutation } as unknown as CoreApiClient,
    mutation,
  };
};

const companyResponse = (node: unknown) => ({
  companies: { edges: node ? [{ node }] : [] },
});

const peopleResponse = (node: unknown) => ({
  people: { edges: node ? [{ node }] : [] },
});

const COMPANY_PAIR = {
  duplicateId: 'new',
  duplicateLabel: 'ACME',
  survivorId: 'old',
  survivorLabel: 'Acme Pte. Ltd.',
};

describe('COMPANY_DUPLICATE_MERGER', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pairs a flagged company with the older company it duplicates', async () => {
    const { client } = createClient(
      companyResponse({
        id: 'new',
        name: 'ACME',
        possibleDuplicateOf: { id: 'old', name: 'Acme Pte. Ltd.' },
      }),
    );

    await expect(
      COMPANY_DUPLICATE_MERGER.findDuplicatePair({ client, recordId: 'new' }),
    ).resolves.toEqual(COMPANY_PAIR);
  });

  it('finds no pair for a company that is not flagged', async () => {
    const { client } = createClient(
      companyResponse({ id: 'old', name: 'Acme', possibleDuplicateOf: null }),
    );

    await expect(
      COMPANY_DUPLICATE_MERGER.findDuplicatePair({ client, recordId: 'old' }),
    ).resolves.toBeNull();
  });

  it('finds no pair for a company that no longer exists', async () => {
    const { client } = createClient(companyResponse(null));

    await expect(
      COMPANY_DUPLICATE_MERGER.findDuplicatePair({ client, recordId: 'gone' }),
    ).resolves.toBeNull();
  });

  it('merges into the older company, keeping its values, then rechecks it', async () => {
    const { client, mutation } = createClient({});

    await COMPANY_DUPLICATE_MERGER.mergeDuplicatePair({
      client,
      duplicatePair: COMPANY_PAIR,
    });

    expect(mutation).toHaveBeenCalledWith({
      mergeCompanies: {
        __args: { ids: ['old', 'new'], conflictPriorityIndex: 0 },
        id: true,
      },
    });
    expect(checkCompanyById).toHaveBeenCalledWith({
      client,
      companyId: 'old',
    });
  });

  it('does not recheck when the merge fails', async () => {
    const { client, mutation } = createClient({});

    mutation.mockRejectedValue(new Error('Forbidden'));

    await expect(
      COMPANY_DUPLICATE_MERGER.mergeDuplicatePair({
        client,
        duplicatePair: COMPANY_PAIR,
      }),
    ).rejects.toThrow('Forbidden');
    expect(checkCompanyById).not.toHaveBeenCalled();
  });
});

describe('PERSON_DUPLICATE_MERGER', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('labels both people by their full names', async () => {
    const { client } = createClient(
      peopleResponse({
        id: 'new',
        name: { firstName: ' Jane ', lastName: 'Tan' },
        possibleDuplicateOf: {
          id: 'old',
          name: { firstName: 'Jane', lastName: null },
        },
      }),
    );

    await expect(
      PERSON_DUPLICATE_MERGER.findDuplicatePair({ client, recordId: 'new' }),
    ).resolves.toEqual({
      duplicateId: 'new',
      duplicateLabel: 'Jane Tan',
      survivorId: 'old',
      survivorLabel: 'Jane',
    });
  });

  it('merges into the older person, then rechecks them', async () => {
    const { client, mutation } = createClient({});

    await PERSON_DUPLICATE_MERGER.mergeDuplicatePair({
      client,
      duplicatePair: {
        duplicateId: 'new',
        duplicateLabel: 'Jane Tan',
        survivorId: 'old',
        survivorLabel: 'Jane Tan',
      },
    });

    expect(mutation).toHaveBeenCalledWith({
      mergePeople: {
        __args: { ids: ['old', 'new'], conflictPriorityIndex: 0 },
        id: true,
      },
    });
    expect(checkPersonById).toHaveBeenCalledWith({ client, personId: 'old' });
  });
});
