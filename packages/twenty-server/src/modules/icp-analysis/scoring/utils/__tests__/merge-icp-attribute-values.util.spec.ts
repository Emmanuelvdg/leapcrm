import { mergeIcpAttributeValues } from 'src/modules/icp-analysis/scoring/utils/merge-icp-attribute-values.util';

describe('mergeIcpAttributeValues', () => {
  it('prefers known company values and fills gaps from the candidate', () => {
    expect(
      mergeIcpAttributeValues({
        preferred: {
          'address.addressCountry': 'United States',
          employees: null,
          tags: [],
        },
        fallback: {
          'address.addressCountry': 'Canada',
          employees: 40,
          tags: ['saas'],
        },
      }),
    ).toEqual({
      'address.addressCountry': 'United States',
      employees: 40,
      tags: ['saas'],
    });
  });
});
