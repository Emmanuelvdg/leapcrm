import {
  icpCriteriaSchema,
  icpCriterionSchema,
} from '@/icp-analysis/schemas/icp-criterion-schema';
import { icpTierThresholdsSchema } from '@/icp-analysis/schemas/icp-tier-thresholds-schema';

const VALID_CRITERION = {
  id: 'industry:in:FINTECH',
  attributeKey: 'industry',
  attributeLabel: 'Industry',
  label: 'Industry: Fintech',
  category: 'FIRMOGRAPHIC',
  match: { type: 'IN', values: ['FINTECH'] },
  weight: 20,
};

describe('icpCriterionSchema', () => {
  it('accepts a criterion and defaults it to not being a hard exclusion', () => {
    expect(icpCriterionSchema.parse(VALID_CRITERION)).toEqual({
      ...VALID_CRITERION,
      isHardExclusion: false,
    });
  });

  it.each([
    ['above the maximum', 40],
    ['below the minimum', -35],
    ['not a whole number', 7.5],
  ])('rejects a weight %s', (_, weight) => {
    expect(
      icpCriterionSchema.safeParse({ ...VALID_CRITERION, weight }).success,
    ).toBe(false);
  });

  it('rejects a hard exclusion that adds points', () => {
    expect(
      icpCriterionSchema.safeParse({
        ...VALID_CRITERION,
        isHardExclusion: true,
      }).success,
    ).toBe(false);

    expect(
      icpCriterionSchema.safeParse({
        ...VALID_CRITERION,
        isHardExclusion: true,
        weight: -10,
      }).success,
    ).toBe(true);
  });

  it.each([
    ['without any bound', { min: null, max: null }, false],
    ['with an inverted range', { min: 200, max: 50 }, false],
    ['open at the top', { min: 200, max: null }, true],
    ['closed on both sides', { min: 50, max: 200 }, true],
  ])('checks a numeric band %s', (_, band, isValid) => {
    expect(
      icpCriterionSchema.safeParse({
        ...VALID_CRITERION,
        attributeKey: 'employees',
        match: { type: 'BETWEEN', ...band },
      }).success,
    ).toBe(isValid);
  });
});

describe('icpCriteriaSchema', () => {
  it('rejects duplicate criterion ids', () => {
    expect(
      icpCriteriaSchema.safeParse([VALID_CRITERION, VALID_CRITERION]).success,
    ).toBe(false);
  });
});

describe('icpTierThresholdsSchema', () => {
  it('accepts decreasing thresholds', () => {
    expect(
      icpTierThresholdsSchema.safeParse({
        priority: 80,
        target: 60,
        nurture: 40,
      }).success,
    ).toBe(true);
  });

  it('rejects thresholds that do not decrease', () => {
    expect(
      icpTierThresholdsSchema.safeParse({
        priority: 60,
        target: 60,
        nurture: 40,
      }).success,
    ).toBe(false);
  });
});
