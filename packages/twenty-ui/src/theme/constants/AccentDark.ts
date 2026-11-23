import * as RadixColors from '@radix-ui/colors';

// See AccentLight.ts. Step 9 stays the exact brand orange, which reads at
// 5.4:1 on the dark surface; the other steps are Radix's dark orange ramp.
const BRAND_ORANGE_DARK = {
  ...RadixColors.orangeDarkP3,
  orange9: 'color(display-p3 0.878 0.420 0.173)',
};

export const ACCENT_DARK = {
  primary: BRAND_ORANGE_DARK.orange5,
  secondary: BRAND_ORANGE_DARK.orange5,
  tertiary: BRAND_ORANGE_DARK.orange3,
  quaternary: 'color(display-p3 0.189 0.151 0.132)',
  accent3570: BRAND_ORANGE_DARK.orange8,
  accent4060: BRAND_ORANGE_DARK.orange8,
  accent1: BRAND_ORANGE_DARK.orange1,
  accent2: BRAND_ORANGE_DARK.orange2,
  accent3: BRAND_ORANGE_DARK.orange3,
  accent4: BRAND_ORANGE_DARK.orange4,
  accent5: BRAND_ORANGE_DARK.orange5,
  accent6: BRAND_ORANGE_DARK.orange6,
  accent7: BRAND_ORANGE_DARK.orange7,
  accent8: BRAND_ORANGE_DARK.orange8,
  accent9: BRAND_ORANGE_DARK.orange9,
  accent10: BRAND_ORANGE_DARK.orange10,
  accent11: BRAND_ORANGE_DARK.orange11,
  accent12: BRAND_ORANGE_DARK.orange12,
};
