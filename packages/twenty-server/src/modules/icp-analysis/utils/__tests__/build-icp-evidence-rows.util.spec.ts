import { FieldMetadataType } from 'twenty-shared/types';

import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';
import {
  buildIcpEvidenceRows,
  type IcpEvidenceOpportunity,
} from 'src/modules/icp-analysis/utils/build-icp-evidence-rows.util';

const ATTRIBUTES: IcpCatalogAttribute[] = [
  {
    key: 'industry',
    label: 'Industry',
    category: 'FIRMOGRAPHIC',
    valueType: 'CATEGORY',
    source: { fieldName: 'industry', fieldType: FieldMetadataType.SELECT },
  },
  {
    key: 'employees',
    label: 'Employees',
    category: 'FIRMOGRAPHIC',
    valueType: 'NUMBER',
    source: { fieldName: 'employees', fieldType: FieldMetadataType.NUMBER },
  },
];

const COMPANIES_BY_ID = new Map<string, Record<string, unknown>>([
  ['acme', { industry: 'FINTECH', employees: 120 }],
  ['globex', { industry: 'RETAIL', employees: 40 }],
]);

const buildOpportunity = (
  opportunity: Pick<IcpEvidenceOpportunity, 'id' | 'stage'> &
    Partial<IcpEvidenceOpportunity>,
): IcpEvidenceOpportunity => ({
  companyId: 'acme',
  closeDate: '2026-03-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-03-02T00:00:00.000Z',
  ...opportunity,
});

const WINDOW = { start: '2025-01-01T00:00:00.000Z', end: null };

describe('buildIcpEvidenceRows', () => {
  it('turns won and lost deals into rows with their company attributes', () => {
    const evidence = buildIcpEvidenceRows({
      opportunities: [
        buildOpportunity({ id: 'won', stage: 'CUSTOMER' }),
        buildOpportunity({
          id: 'lost',
          stage: 'LOST',
          companyId: 'globex',
          lostReason: 'PRICE',
          closeDate: '2026-04-01T00:00:00.000Z',
        }),
      ],
      companiesById: COMPANIES_BY_ID,
      attributes: ATTRIBUTES,
      wonStages: ['CUSTOMER'],
      window: WINDOW,
    });

    expect(evidence.rows).toEqual([
      {
        id: 'lost',
        outcome: 'LOST',
        closedAt: '2026-04-01T00:00:00.000Z',
        lostReason: 'PRICE',
        values: { industry: 'RETAIL', employees: 40 },
      },
      {
        id: 'won',
        outcome: 'WON',
        closedAt: '2026-03-01T00:00:00.000Z',
        lostReason: null,
        values: { industry: 'FINTECH', employees: 120 },
      },
    ]);
    expect(evidence.excludedWithoutCompanyCount).toBe(0);
    expect(evidence.isTruncated).toBe(false);
  });

  it('counts deals without a company and leaves them out', () => {
    const evidence = buildIcpEvidenceRows({
      opportunities: [
        buildOpportunity({ id: 'won', stage: 'CUSTOMER' }),
        buildOpportunity({ id: 'orphan', stage: 'LOST', companyId: null }),
        buildOpportunity({ id: 'hidden', stage: 'LOST', companyId: 'unseen' }),
      ],
      companiesById: COMPANIES_BY_ID,
      attributes: ATTRIBUTES,
      wonStages: ['CUSTOMER'],
      window: WINDOW,
    });

    expect(evidence.rows.map(({ id }) => id)).toEqual(['won']);
    expect(evidence.excludedWithoutCompanyCount).toBe(2);
  });

  it('keeps only deals closed inside the window, using the last update when there is no close date', () => {
    const evidence = buildIcpEvidenceRows({
      opportunities: [
        buildOpportunity({
          id: 'too-old',
          stage: 'CUSTOMER',
          closeDate: '2024-06-01T00:00:00.000Z',
        }),
        buildOpportunity({
          id: 'too-new',
          stage: 'CUSTOMER',
          closeDate: '2026-09-01T00:00:00.000Z',
        }),
        buildOpportunity({
          id: 'no-close-date',
          stage: 'LOST',
          closeDate: null,
          updatedAt: '2026-05-05T00:00:00.000Z',
        }),
      ],
      companiesById: COMPANIES_BY_ID,
      attributes: ATTRIBUTES,
      wonStages: ['CUSTOMER'],
      window: {
        start: '2025-01-01T00:00:00.000Z',
        end: '2026-08-01T00:00:00.000Z',
      },
    });

    expect(evidence.rows).toEqual([
      expect.objectContaining({
        id: 'no-close-date',
        closedAt: '2026-05-05T00:00:00.000Z',
      }),
    ]);
  });

  it('cuts numeric attributes into bands from the deals in the dataset', () => {
    const evidence = buildIcpEvidenceRows({
      opportunities: [
        buildOpportunity({ id: 'a', stage: 'CUSTOMER' }),
        buildOpportunity({ id: 'b', stage: 'LOST', companyId: 'globex' }),
      ],
      companiesById: COMPANIES_BY_ID,
      attributes: ATTRIBUTES,
      wonStages: ['CUSTOMER'],
      window: WINDOW,
    });

    expect(evidence.attributes).toEqual([
      {
        key: 'industry',
        label: 'Industry',
        category: 'FIRMOGRAPHIC',
        valueType: 'CATEGORY',
      },
      {
        key: 'employees',
        label: 'Employees',
        category: 'FIRMOGRAPHIC',
        valueType: 'NUMBER',
        bands: [
          { min: null, max: 120 },
          { min: 120, max: null },
        ],
      },
    ]);
  });
});
