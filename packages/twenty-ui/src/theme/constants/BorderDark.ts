import { COLOR_DARK } from '@ui/theme/constants/ColorsDark';
import { BORDER_COMMON } from './BorderCommon';
import { GRAY_SCALE_DARK } from './GrayScaleDark';
import { TRANSPARENT_COLORS_DARK } from './TransparentColorsDark';

export const BORDER_DARK = {
  color: {
    strong: GRAY_SCALE_DARK.gray6,
    medium: GRAY_SCALE_DARK.gray5,
    light: GRAY_SCALE_DARK.gray4,
    secondaryInverted: GRAY_SCALE_DARK.gray11,
    inverted: GRAY_SCALE_DARK.gray12,
    danger: COLOR_DARK.red5,
    blue: COLOR_DARK.blue7,
    transparentStrong: TRANSPARENT_COLORS_DARK.gray4,
    control: 'color(display-p3 0.373 0.407 0.567)',
    focus: 'color(display-p3 0.575 0.648 0.974)',
  },
  ...BORDER_COMMON,
};
