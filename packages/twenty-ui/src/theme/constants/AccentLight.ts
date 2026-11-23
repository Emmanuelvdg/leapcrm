import * as RadixColors from '@radix-ui/colors';

// Your Jugaad orange (#F16205) is forced at step 9 and its hover (#D9560A) at
// step 10, the steps used for primary buttons and active states. Step 11 is a
// darker orange (#C03D00) so orange text keeps 4.5:1 on white and sunk
// surfaces. The other steps are Radix's orange ramp, which shares the hue.
const BRAND_ORANGE_LIGHT = {
  ...RadixColors.orangeP3,
  orange9: 'color(display-p3 0.878 0.420 0.173)',
  orange10: 'color(display-p3 0.790 0.370 0.157)',
  orange11: 'color(display-p3 0.696 0.278 0.114)',
};

export const ACCENT_LIGHT = {
  primary: BRAND_ORANGE_LIGHT.orange5,
  secondary: BRAND_ORANGE_LIGHT.orange5,
  tertiary: BRAND_ORANGE_LIGHT.orange3,
  // Brand orange tint (#FEEFE6): selected rows stay readable as selected.
  quaternary: 'color(display-p3 0.986 0.939 0.906)',
  accent3570: BRAND_ORANGE_LIGHT.orange8,
  accent4060: BRAND_ORANGE_LIGHT.orange8,
  accent1: BRAND_ORANGE_LIGHT.orange1,
  accent2: BRAND_ORANGE_LIGHT.orange2,
  accent3: BRAND_ORANGE_LIGHT.orange3,
  accent4: BRAND_ORANGE_LIGHT.orange4,
  accent5: BRAND_ORANGE_LIGHT.orange5,
  accent6: BRAND_ORANGE_LIGHT.orange6,
  accent7: BRAND_ORANGE_LIGHT.orange7,
  accent8: BRAND_ORANGE_LIGHT.orange8,
  accent9: BRAND_ORANGE_LIGHT.orange9,
  accent10: BRAND_ORANGE_LIGHT.orange10,
  accent11: BRAND_ORANGE_LIGHT.orange11,
  accent12: BRAND_ORANGE_LIGHT.orange12,
};
