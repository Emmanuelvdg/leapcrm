import { DpaRegion } from 'src/engine/core-modules/dpa/enums/dpa-region.enum';
import { type DpaRegionConfig } from 'src/engine/core-modules/dpa/types/dpa.types';

export const DEFAULT_DPA_REGION: DpaRegion = DpaRegion.EU;

// TODO: placeholder pending legal review. PROCESSOR_ENTITY/DPO_NAME_AND_CONTACT
// use the established LeapCRM brand/support address; the bracketed fields have
// no factual basis yet (we don't know LeapCRM's actual entity type, registered
// address, governing law, or EU affiliate status) and must not be treated as
// real until legal confirms and replaces them.
const DPA_COMMON_VALUES = {
  PROCESSOR_ENTITY: 'LeapCRM',
  PROCESSOR_LEGAL_FORM:
    '[TO BE CONFIRMED BY LEGAL — entity type and jurisdiction of incorporation]',
  PROCESSOR_ADDRESS: '[TO BE CONFIRMED BY LEGAL — registered address]',
  EU_AFFILIATE_ENTITY: 'LeapCRM',
  EU_AFFILIATE_LEGAL_FORM:
    '[TO BE CONFIRMED BY LEGAL — EU affiliate legal form, if applicable]',
  EU_AFFILIATE_ADDRESS:
    '[TO BE CONFIRMED BY LEGAL — EU affiliate address, if applicable]',
  GOVERNING_LAW: '[TO BE CONFIRMED BY LEGAL — governing law]',
  DPO_NAME_AND_CONTACT: 'support@theleapcrm.com',
};

export const DPA_REGION_CONFIGS: Record<DpaRegion, DpaRegionConfig> = {
  [DpaRegion.EU]: {
    region: DpaRegion.EU,
    sccSectionActive: true,
    values: {
      ...DPA_COMMON_VALUES,
      HOSTING_REGION: 'EU (Frankfurt, Germany)',
    },
  },
  [DpaRegion.US]: {
    region: DpaRegion.US,
    sccSectionActive: true,
    values: {
      ...DPA_COMMON_VALUES,
      HOSTING_REGION: 'United States',
    },
  },
};

// TODO: placeholder pending legal review — do not generate a signed DPA
// attributing a signature to this name until it's replaced with the actual
// authorized signatory.
export const TWENTY_PRESIGNED_SIGNATORY = {
  name: '[TO BE CONFIRMED BY LEGAL]',
  title: '[TO BE CONFIRMED BY LEGAL]',
};

export const getDpaRegionConfig = (region: DpaRegion): DpaRegionConfig =>
  DPA_REGION_CONFIGS[region] ?? DPA_REGION_CONFIGS[DEFAULT_DPA_REGION];
