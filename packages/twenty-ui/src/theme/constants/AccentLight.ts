// Leap CRM brand blue (#0037F6), forced exactly at step 9/10 (the solid/hover
// steps used for primary buttons and active states); the surrounding steps
// are Radix's blue ramp with hue rotated and chroma scaled to match, so the
// whole scale reads as one coherent family instead of a single mismatched hex.
const LEAP_BLUE_LIGHT = {
  blue1: 'color(display-p3 0.985 0.992 1.000)',
  blue2: 'color(display-p3 0.957 0.978 1.000)',
  blue3: 'color(display-p3 0.904 0.955 1.000)',
  blue4: 'color(display-p3 0.840 0.928 1.000)',
  blue5: 'color(display-p3 0.774 0.887 1.000)',
  blue6: 'color(display-p3 0.691 0.832 1.000)',
  blue7: 'color(display-p3 0.583 0.761 1.000)',
  blue8: 'color(display-p3 0.419 0.660 1.000)',
  blue9: 'color(display-p3 0.077 0.212 0.927)',
  blue10: 'color(display-p3 0.022 0.115 0.831)',
  blue11: 'color(display-p3 0.194 0.337 1.000)',
  blue12: 'color(display-p3 0.122 0.150 0.457)',
};

export const ACCENT_LIGHT = {
  primary: LEAP_BLUE_LIGHT.blue5,
  secondary: LEAP_BLUE_LIGHT.blue5,
  tertiary: LEAP_BLUE_LIGHT.blue3,
  quaternary: LEAP_BLUE_LIGHT.blue2,
  accent3570: LEAP_BLUE_LIGHT.blue8,
  accent4060: LEAP_BLUE_LIGHT.blue8,
  accent1: LEAP_BLUE_LIGHT.blue1,
  accent2: LEAP_BLUE_LIGHT.blue2,
  accent3: LEAP_BLUE_LIGHT.blue3,
  accent4: LEAP_BLUE_LIGHT.blue4,
  accent5: LEAP_BLUE_LIGHT.blue5,
  accent6: LEAP_BLUE_LIGHT.blue6,
  accent7: LEAP_BLUE_LIGHT.blue7,
  accent8: LEAP_BLUE_LIGHT.blue8,
  accent9: LEAP_BLUE_LIGHT.blue9,
  accent10: LEAP_BLUE_LIGHT.blue10,
  accent11: LEAP_BLUE_LIGHT.blue11,
  accent12: LEAP_BLUE_LIGHT.blue12,
};
