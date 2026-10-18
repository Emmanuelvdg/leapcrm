import { buildProspectingJobIdempotencyKey } from 'src/engine/core-modules/prospecting-job/utils/build-prospecting-job-idempotency-key.util';

describe('buildProspectingJobIdempotencyKey', () => {
  const campaignId = '0b0d6d3e-1b1f-4f55-9a3e-2f1f1d1c1b1a';

  it('joins campaign, operation, target and version', () => {
    expect(
      buildProspectingJobIdempotencyKey({
        campaignId,
        operation: 'DISCOVER_PAGE',
        target: 'gleif:3',
        version: 1,
      }),
    ).toBe(`${campaignId}:DISCOVER_PAGE:gleif:3:1`);
  });

  it('gives a new key when the version changes', () => {
    const firstKey = buildProspectingJobIdempotencyKey({
      campaignId,
      operation: 'DISCOVER_PAGE',
      target: 'gleif:3',
      version: 1,
    });
    const secondKey = buildProspectingJobIdempotencyKey({
      campaignId,
      operation: 'DISCOVER_PAGE',
      target: 'gleif:3',
      version: 2,
    });

    expect(firstKey).not.toBe(secondKey);
  });
});
