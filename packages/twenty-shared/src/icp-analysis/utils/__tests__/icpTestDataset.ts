import { type IcpAttributeDefinition } from '@/icp-analysis/types/IcpAttributeDefinition';
import { type IcpDatasetRow } from '@/icp-analysis/types/IcpDatasetRow';
import { type IcpOutcome } from '@/icp-analysis/types/IcpOutcome';

export const ICP_TEST_ATTRIBUTES: IcpAttributeDefinition[] = [
  {
    key: 'industry',
    label: 'Industry',
    category: 'FIRMOGRAPHIC',
    valueType: 'CATEGORY',
    valueLabels: { FINTECH: 'Fintech', RETAIL: 'Retail', HEALTH: 'Health' },
  },
  {
    key: 'employees',
    label: 'Employees',
    category: 'FIRMOGRAPHIC',
    valueType: 'NUMBER',
    bands: [
      { min: null, max: 50 },
      { min: 50, max: 200 },
      { min: 200, max: null },
    ],
  },
  {
    key: 'techStack',
    label: 'Tech stack',
    category: 'TECHNOGRAPHIC',
    valueType: 'CATEGORY_LIST',
  },
  {
    key: 'visitedPricing',
    label: 'Visited pricing',
    category: 'INTENT',
    valueType: 'BOOLEAN',
    valueLabels: { true: 'Yes', false: 'No' },
  },
];

const INDUSTRIES = ['FINTECH', 'RETAIL', 'HEALTH'] as const;

// Per industry, which of its 20 deals were won: Fintech 16, Retail 3, Health 10.
const IS_WON_BY_INDUSTRY: Record<
  (typeof INDUSTRIES)[number],
  (occurrence: number) => boolean
> = {
  FINTECH: (occurrence) => occurrence % 5 !== 4,
  RETAIL: (occurrence) => occurrence % 7 === 0,
  HEALTH: (occurrence) => occurrence % 2 === 0,
};

const LOST_REASON_BY_INDUSTRY: Record<(typeof INDUSTRIES)[number], string> = {
  FINTECH: 'COMPETITOR',
  RETAIL: 'PRICE',
  HEALTH: 'TIMING',
};

const EMPLOYEE_COUNTS = [30, 120, 500];

// 60 deals closed one day apart, industries interleaved so every slice of the
// timeline has all three.
export const buildIcpTestDataset = (): IcpDatasetRow[] =>
  Array.from({ length: 60 }, (_, index) => {
    const industry = INDUSTRIES[index % 3];
    const occurrence = Math.floor(index / 3);
    const outcome: IcpOutcome = IS_WON_BY_INDUSTRY[industry](occurrence)
      ? 'WON'
      : 'LOST';

    return {
      id: `deal-${String(index).padStart(2, '0')}`,
      outcome,
      closedAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
      lostReason: outcome === 'LOST' ? LOST_REASON_BY_INDUSTRY[industry] : null,
      values: {
        industry,
        employees: EMPLOYEE_COUNTS[occurrence % 3],
        techStack: industry === 'FINTECH' ? ['SLACK', 'SALESFORCE'] : ['SLACK'],
        visitedPricing: index % 4 === 3 ? undefined : index % 2 === 0,
      },
    };
  });
