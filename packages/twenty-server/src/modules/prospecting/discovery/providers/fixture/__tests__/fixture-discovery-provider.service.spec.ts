import { FixtureDiscoveryProvider } from 'src/modules/prospecting/discovery/providers/fixture/fixture-discovery-provider.service';
import { type DiscoveryRequest } from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const buildRequest = (cursor: string | null): DiscoveryRequest => ({
  countryCode: 'GB',
  icp: prospectingIcpSchema.parse({ targetIndustries: ['Payments'] }),
  cursor,
  pageSize: 10,
});

describe('FixtureDiscoveryProvider', () => {
  const provider = new FixtureDiscoveryProvider();

  it('returns the same records for the same request', async () => {
    const firstPage = await provider.search(buildRequest(null));
    const repeatedPage = await provider.search(buildRequest(null));

    expect(repeatedPage).toEqual(firstPage);
    expect(firstPage.records[0]).toMatchObject({
      name: 'Fixture GB Company 1',
      domain: 'fixture-gb-1.example.com',
      industry: 'Payments',
      countryCode: 'GB',
    });
  });

  it('pages through a fixed set of records and then stops', async () => {
    const firstPage = await provider.search(buildRequest(null));
    const secondPage = await provider.search(
      buildRequest(firstPage.nextCursor),
    );
    const lastPage = await provider.search(buildRequest(secondPage.nextCursor));

    expect(firstPage.records).toHaveLength(10);
    expect(secondPage.records[0].name).toBe('Fixture GB Company 11');
    expect(lastPage.records).toHaveLength(5);
    expect(lastPage.nextCursor).toBeNull();
  });
});
