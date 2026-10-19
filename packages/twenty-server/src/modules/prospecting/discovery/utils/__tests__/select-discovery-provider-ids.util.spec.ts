import { FIXTURE_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/fixture/constants/fixture-discovery-capabilities.constant';
import { GLEIF_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/gleif/constants/gleif-discovery-capabilities.constant';
import { WIKIDATA_DISCOVERY_CAPABILITIES } from 'src/modules/prospecting/discovery/providers/wikidata/constants/wikidata-discovery-capabilities.constant';
import { type DiscoveryCapabilities } from 'src/modules/prospecting/discovery/types/discovery-capabilities.type';
import { type DiscoveryProvider } from 'src/modules/prospecting/discovery/types/discovery-provider.type';
import { selectDiscoveryProviderIds } from 'src/modules/prospecting/discovery/utils/select-discovery-provider-ids.util';
import { prospectingIcpSchema } from 'src/modules/prospecting/zod-schemas/prospecting-icp.zod-schema';

const buildProvider = (
  id: string,
  capabilities: DiscoveryCapabilities,
): DiscoveryProvider => ({
  id,
  getCapabilities: () => capabilities,
  search: jest.fn(),
});

const PHASE_ONE_PROVIDERS = [
  buildProvider('wikidata', WIKIDATA_DISCOVERY_CAPABILITIES),
  buildProvider('fixture', FIXTURE_DISCOVERY_CAPABILITIES),
  buildProvider('gleif', GLEIF_DISCOVERY_CAPABILITIES),
];

const selectFor = (
  icp: Record<string, unknown>,
  providers: DiscoveryProvider[] = PHASE_ONE_PROVIDERS,
) =>
  selectDiscoveryProviderIds({
    icp: prospectingIcpSchema.parse(icp),
    providers,
  });

describe('selectDiscoveryProviderIds', () => {
  it('uses the registry source for a country-only campaign', () => {
    expect(selectFor({ targetGeographies: [{ countryCode: 'SG' }] })).toEqual([
      'gleif',
    ]);
  });

  it('skips sources that cannot filter by the campaign industries', () => {
    expect(
      selectFor({
        targetGeographies: [{ countryCode: 'SG' }],
        targetIndustries: ['fintech'],
      }),
    ).toEqual(['wikidata']);
  });

  it('orders eligible sources from the most precise', () => {
    expect(
      selectFor({
        targetGeographies: [{ countryCode: 'GB' }],
        keywords: ['payments'],
      }),
    ).toEqual(['gleif', 'wikidata']);
  });

  it('does not require size support, which most sources lack', () => {
    expect(
      selectFor({
        targetGeographies: [{ countryCode: 'SG' }],
        employeeCountMin: 50,
      }),
    ).toEqual(['gleif']);
  });

  it('selects nothing when no source understands the industry codes', () => {
    expect(
      selectFor({ industryCodes: [{ scheme: 'SSIC', code: '62011' }] }),
    ).toEqual([]);
  });

  it('never picks the fixture source automatically', () => {
    expect(selectFor({ keywords: ['payments'] })).not.toContain('fixture');
  });

  it('only uses a national source for its own market', () => {
    const nationalProvider = buildProvider('uk-registry', {
      ...GLEIF_DISCOVERY_CAPABILITIES,
      markets: ['GB'],
      precisionRank: 5,
    });

    expect(
      selectFor({ targetGeographies: [{ countryCode: 'SG' }] }, [
        nationalProvider,
      ]),
    ).toEqual([]);
    expect(
      selectFor({ targetGeographies: [{ countryCode: 'GB' }] }, [
        ...PHASE_ONE_PROVIDERS,
        nationalProvider,
      ]),
    ).toEqual(['uk-registry', 'gleif']);
  });

  it('prefers free sources over metered ones of the same precision', () => {
    const meteredProvider = buildProvider('aaa-metered', {
      ...GLEIF_DISCOVERY_CAPABILITIES,
      costModel: { kind: 'METERED_PER_REQUEST', unitPriceMicros: 1000 },
    });

    expect(
      selectFor({ targetGeographies: [{ countryCode: 'SG' }] }, [
        meteredProvider,
        ...PHASE_ONE_PROVIDERS,
      ]),
    ).toEqual(['gleif', 'aaa-metered']);
  });
});
