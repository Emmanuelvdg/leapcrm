import { getIcpModelInputError } from 'src/modules/icp-analysis/utils/get-icp-model-input-error.util';

const VALID_CRITERION = {
  id: 'industry:in:FINTECH',
  attributeKey: 'industry',
  attributeLabel: 'Industry',
  label: 'Industry: Fintech',
  category: 'FIRMOGRAPHIC',
  match: { type: 'IN', values: ['FINTECH'] },
  weight: 20,
  isHardExclusion: false,
};

describe('getIcpModelInputError', () => {
  it('accepts a valid model', () => {
    expect(
      getIcpModelInputError({
        name: 'Fintech mid-market',
        criteria: [VALID_CRITERION],
        tierThresholds: { priority: 80, target: 60, nurture: 40 },
        wonStages: ['CUSTOMER'],
        lostStages: ['LOST'],
        datasetStartDate: '2025-01-01T00:00:00.000Z',
        datasetEndDate: '2026-01-01T00:00:00.000Z',
      }),
    ).toBeNull();
  });

  it('accepts a model that only changes its name', () => {
    expect(getIcpModelInputError({ name: 'Renamed' })).toBeNull();
  });

  it('refuses to make a model active outside the Activate action', () => {
    expect(getIcpModelInputError({ status: 'ACTIVE' })).toBe(
      'Use the Activate action to make a model active',
    );
  });

  it('names the criterion and field that are invalid', () => {
    expect(
      getIcpModelInputError({
        criteria: [
          VALID_CRITERION,
          { ...VALID_CRITERION, id: 'b', weight: 90 },
        ],
      }),
    ).toMatch(/^Criteria \(1\.weight\): /);
  });

  it('rejects thresholds that do not decrease', () => {
    expect(
      getIcpModelInputError({
        tierThresholds: { priority: 50, target: 60, nurture: 40 },
      }),
    ).toBe(
      'Tier thresholds: thresholds must decrease from priority to target to nurture',
    );
  });

  it('rejects empty or repeated stage lists', () => {
    expect(getIcpModelInputError({ wonStages: [] })).toMatch(/^Won stages: /);
    expect(getIcpModelInputError({ lostStages: ['LOST', 'LOST'] })).toBe(
      'Lost stages: list each stage only once',
    );
  });

  it('rejects a stage that counts as both won and lost', () => {
    expect(
      getIcpModelInputError({
        wonStages: ['CUSTOMER', 'CLOSED'],
        lostStages: ['CLOSED'],
      }),
    ).toBe('Stage CLOSED cannot count as both won and lost');
  });

  it('rejects a deal window that ends before it starts', () => {
    expect(
      getIcpModelInputError({
        datasetStartDate: '2026-01-01T00:00:00.000Z',
        datasetEndDate: '2025-01-01T00:00:00.000Z',
      }),
    ).toBe('The deal window must start before it ends');
  });
});
