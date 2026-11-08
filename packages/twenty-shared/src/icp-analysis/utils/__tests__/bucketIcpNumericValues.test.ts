import { bucketIcpNumericValues } from '@/icp-analysis/utils/bucketIcpNumericValues';
import { formatIcpNumericBandLabel } from '@/icp-analysis/utils/formatIcpNumericBandLabel';

describe('bucketIcpNumericValues', () => {
  it('returns no band without values', () => {
    expect(bucketIcpNumericValues({ values: [] })).toEqual([]);
  });

  it('returns one open band when every value is the same', () => {
    expect(bucketIcpNumericValues({ values: [10, 10, 10] })).toEqual([
      { min: null, max: null },
    ]);
  });

  it('splits on quantiles into half-open bands', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);

    expect(bucketIcpNumericValues({ values })).toEqual([
      { min: null, max: 21 },
      { min: 21, max: 41 },
      { min: 41, max: 61 },
      { min: 61, max: 81 },
      { min: 81, max: null },
    ]);
  });

  it('rounds edges to two significant digits', () => {
    expect(
      bucketIcpNumericValues({ values: [1234, 12, 980, 47, 153] }),
    ).toEqual([
      { min: null, max: 47 },
      { min: 47, max: 150 },
      { min: 150, max: 980 },
      { min: 980, max: 1200 },
      { min: 1200, max: null },
    ]);
  });

  it('drops an edge that rounding pushes above every value', () => {
    expect(
      bucketIcpNumericValues({ values: [994, 996, 998], maxBandCount: 3 }),
    ).toEqual([{ min: null, max: null }]);
  });

  it('ignores values that are not finite numbers', () => {
    expect(
      bucketIcpNumericValues({
        values: [Number.NaN, Number.POSITIVE_INFINITY, 5, 5],
      }),
    ).toEqual([{ min: null, max: null }]);
  });
});

describe('formatIcpNumericBandLabel', () => {
  it.each([
    [{ min: null, max: 50 }, '< 50'],
    [{ min: 50, max: 200 }, '50-200'],
    [{ min: 200, max: null }, '200+'],
    [{ min: 1200, max: null }, '1.2K+'],
    [{ min: null, max: null }, 'Any'],
  ])('labels %o as %s', (band, expectedLabel) => {
    expect(formatIcpNumericBandLabel(band)).toBe(expectedLabel);
  });
});
