import { describe, expect, it } from 'vitest';

import {
  type CompanyNode,
  toCompanyHygieneRecord,
} from 'src/utils/company-hygiene';
import { type PersonNode, toPersonHygieneRecord } from 'src/utils/person-hygiene';
import { planHygieneUpdates } from 'src/utils/plan-hygiene-updates';

const company = (overrides: Partial<CompanyNode>): CompanyNode => ({
  id: 'company-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  name: 'Acme',
  domainName: { primaryLinkUrl: 'https://acme.com' },
  notDuplicate: false,
  dataQuality: null,
  dataQualityIssues: null,
  possibleDuplicateOfId: null,
  ...overrides,
});

const person = (overrides: Partial<PersonNode>): PersonNode => ({
  id: 'person-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  name: { firstName: 'Jane', lastName: 'Tan' },
  emails: { primaryEmail: 'jane@acme.com', additionalEmails: null },
  phones: { primaryPhoneNumber: null },
  linkedinLink: { primaryLinkUrl: null },
  jobTitle: null,
  companyId: 'company-1',
  company: { possibleDuplicateOfId: null },
  notDuplicate: false,
  dataQuality: null,
  dataQualityIssues: null,
  possibleDuplicateOfId: null,
  ...overrides,
});

describe('planHygieneUpdates for companies', () => {
  it('links a near-duplicate to the older company and flags both', () => {
    const updates = planHygieneUpdates({
      records: [
        company({ id: 'old', name: 'Acme Pte. Ltd.' }),
        company({
          id: 'new',
          createdAt: '2026-02-01T00:00:00.000Z',
          name: 'ACME',
          domainName: { primaryLinkUrl: 'www.acme.com' },
        }),
      ].map(toCompanyHygieneRecord),
    });

    expect(updates).toEqual([
      {
        id: 'old',
        data: {
          dataQuality: 'POSSIBLE_DUPLICATE',
          dataQualityIssues:
            'Possible duplicate: "ACME" (same domain, similar name)',
          possibleDuplicateOfId: null,
        },
      },
      {
        id: 'new',
        data: {
          dataQuality: 'POSSIBLE_DUPLICATE',
          dataQualityIssues:
            'Possible duplicate of "Acme Pte. Ltd." (same domain, similar name)',
          possibleDuplicateOfId: 'old',
        },
      },
    ]);
  });

  it('flags a company without a domain and trims its name', () => {
    const [update] = planHygieneUpdates({
      records: [
        company({ name: '  Globex   Corp ', domainName: null }),
      ].map(toCompanyHygieneRecord),
    });

    expect(update.data).toEqual({
      name: 'Globex Corp',
      dataQuality: 'INCOMPLETE',
      dataQualityIssues: 'No domain',
      possibleDuplicateOfId: null,
    });
  });

  it('skips companies whose stored assessment is already correct', () => {
    expect(
      planHygieneUpdates({
        records: [company({ dataQuality: 'CLEAN' })].map(
          toCompanyHygieneRecord,
        ),
      }),
    ).toEqual([]);
  });

  it('treats the empty string the API returns for no issues as unchanged', () => {
    expect(
      planHygieneUpdates({
        records: [company({ dataQuality: 'CLEAN', dataQualityIssues: '' })].map(
          toCompanyHygieneRecord,
        ),
      }),
    ).toEqual([]);
  });

  it('stops matching a company ticked as not a duplicate', () => {
    const updates = planHygieneUpdates({
      records: [
        company({ id: 'old', dataQuality: 'CLEAN' }),
        company({
          id: 'new',
          createdAt: '2026-02-01T00:00:00.000Z',
          notDuplicate: true,
          dataQuality: 'POSSIBLE_DUPLICATE',
          dataQualityIssues: 'Possible duplicate of "Acme"',
          possibleDuplicateOfId: 'old',
        }),
      ].map(toCompanyHygieneRecord),
    });

    expect(updates).toEqual([
      {
        id: 'new',
        data: {
          dataQuality: 'CLEAN',
          dataQualityIssues: null,
          possibleDuplicateOfId: null,
        },
      },
    ]);
  });
});

describe('planHygieneUpdates on a single save', () => {
  it('leaves neighbours already flagged elsewhere for the nightly scan', () => {
    const updates = planHygieneUpdates({
      focusRecordId: 'saved',
      records: [
        company({
          id: 'saved',
          createdAt: '2026-03-01T00:00:00.000Z',
          name: ' Acme ',
        }),
        company({
          id: 'flagged-elsewhere',
          dataQuality: 'POSSIBLE_DUPLICATE',
          dataQualityIssues: 'Possible duplicate of "Acme Holdings"',
          possibleDuplicateOfId: 'outside-slice',
        }),
      ].map(toCompanyHygieneRecord),
    });

    expect(updates.map((update) => update.id)).toEqual(['saved']);
    expect(updates[0].data).toMatchObject({
      name: 'Acme',
      possibleDuplicateOfId: 'flagged-elsewhere',
    });
  });

  it('clears a neighbour that pointed at the saved record but no longer matches', () => {
    const updates = planHygieneUpdates({
      focusRecordId: 'saved',
      records: [
        company({
          id: 'saved',
          name: 'Renamed Co',
          domainName: { primaryLinkUrl: 'renamed.com' },
          dataQuality: 'POSSIBLE_DUPLICATE',
          dataQualityIssues: 'Possible duplicate: "Acme"',
        }),
        company({
          id: 'former-duplicate',
          createdAt: '2026-02-01T00:00:00.000Z',
          dataQuality: 'POSSIBLE_DUPLICATE',
          dataQualityIssues: 'Possible duplicate of "Acme"',
          possibleDuplicateOfId: 'saved',
        }),
      ].map(toCompanyHygieneRecord),
    });

    expect(updates).toEqual([
      {
        id: 'saved',
        data: {
          dataQuality: 'CLEAN',
          dataQualityIssues: null,
          possibleDuplicateOfId: null,
        },
      },
      {
        id: 'former-duplicate',
        data: {
          dataQuality: 'CLEAN',
          dataQualityIssues: null,
          possibleDuplicateOfId: null,
        },
      },
    ]);
  });
});

describe('planHygieneUpdates for people', () => {
  it('matches people by email regardless of case', () => {
    const updates = planHygieneUpdates({
      records: [
        person({ id: 'old', companyId: null }),
        person({
          id: 'new',
          createdAt: '2026-02-01T00:00:00.000Z',
          name: { firstName: 'J.', lastName: 'Tan' },
          emails: { primaryEmail: 'JANE@acme.com', additionalEmails: null },
          companyId: null,
        }),
      ].map(toPersonHygieneRecord),
    });

    expect(updates.find((update) => update.id === 'new')?.data).toEqual({
      dataQuality: 'POSSIBLE_DUPLICATE',
      dataQualityIssues:
        'Possible duplicate of "Jane Tan" (same email) · No company',
      possibleDuplicateOfId: 'old',
    });
  });

  it('matches the same name at the same company despite case and spacing', () => {
    const updates = planHygieneUpdates({
      records: [
        person({ id: 'old', emails: null }),
        person({
          id: 'new',
          createdAt: '2026-02-01T00:00:00.000Z',
          name: { firstName: ' jane ', lastName: 'TAN' },
          emails: { primaryEmail: 'jane.tan@gmail.com', additionalEmails: null },
        }),
      ].map(toPersonHygieneRecord),
    });

    expect(updates.find((update) => update.id === 'new')?.data).toEqual({
      name: { firstName: 'jane', lastName: 'TAN' },
      dataQuality: 'POSSIBLE_DUPLICATE',
      dataQualityIssues:
        'Possible duplicate of "Jane Tan" (same name and company)',
      possibleDuplicateOfId: 'old',
    });
  });

  it('treats companies flagged as duplicates of each other as one company', () => {
    const updates = planHygieneUpdates({
      records: [
        person({ id: 'old', companyId: 'acme-pte-ltd' }),
        person({
          id: 'new',
          createdAt: '2026-02-01T00:00:00.000Z',
          emails: { primaryEmail: 'jane.tan@gmail.com', additionalEmails: null },
          companyId: 'acme',
          company: { possibleDuplicateOfId: 'acme-pte-ltd' },
        }),
      ].map(toPersonHygieneRecord),
    });

    expect(
      updates.find((update) => update.id === 'new')?.data
        .possibleDuplicateOfId,
    ).toBe('old');
  });

  it('only treats a shared name as a duplicate within the same company', () => {
    const records = [
      person({ id: 'a', emails: null, companyId: 'company-1' }),
      person({
        id: 'b',
        createdAt: '2026-02-01T00:00:00.000Z',
        emails: null,
        companyId: 'company-2',
      }),
    ].map(toPersonHygieneRecord);

    expect(
      planHygieneUpdates({ records }).map((update) => update.data.dataQuality),
    ).toEqual(['INCOMPLETE', 'INCOMPLETE']);
  });

  it('flags people with no way to contact them and no company', () => {
    const [update] = planHygieneUpdates({
      records: [
        person({
          emails: { primaryEmail: '', additionalEmails: [] },
          companyId: null,
          jobTitle: ' Head  of Sales ',
        }),
      ].map(toPersonHygieneRecord),
    });

    expect(update.data).toEqual({
      jobTitle: 'Head of Sales',
      dataQuality: 'INCOMPLETE',
      dataQualityIssues: 'No email or phone · No company',
      possibleDuplicateOfId: null,
    });
  });
});
