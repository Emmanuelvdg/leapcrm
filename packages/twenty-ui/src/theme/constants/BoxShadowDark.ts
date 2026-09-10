import { RGBA } from '@ui/theme/constants/Rgba';

/* oxlint-disable twenty/no-hardcoded-colors */
// Navy-black (#000B24) rather than pure black, mirroring the light-theme
// shadow retint in GrayScaleLightAlpha — keeps shadows consistent with the
// rest of the navy-tinted palette instead of a neutral gray/black cast.
export const BOX_SHADOW_DARK = {
  color: RGBA('#000B24', 0.6),
  light: `0px 2px 4px 0px ${RGBA(
    '#000B24',
    0.04,
  )}, 0px 0px 4px 0px ${RGBA('#000B24', 0.08)}`,
  strong: `0px 12px 32px -8px ${RGBA(
    '#000B24',
    0.16,
  )}, 0px 2px 4px 0px ${RGBA('#000B24', 0.08)}`,
  underline: `0px 1px 0px 0px ${RGBA('#000B24', 0.32)}`,
  superHeavy: `2px 4px 16px 0px ${RGBA(
    '#000B24',
    0.12,
  )}, 0px 2px 4px 0px ${RGBA('#000B24', 0.04)}`,
};
