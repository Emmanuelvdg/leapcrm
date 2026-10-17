import { type ThemeOverrides } from 'twenty-ui/theme-constants';

// The drawer renders with the dark theme scoped to it, on Leap navy instead of
// the dark theme's navy-black, so the navigation reads as a brand panel in both
// light and dark mode.
export const NAVIGATION_DRAWER_THEME_OVERRIDES: ThemeOverrides = {
  '--t-background-primary': 'color(display-p3 0.010 0.053 0.266)',
  '--t-background-secondary': 'color(display-p3 0.010 0.053 0.266)',
  '--t-background-tertiary': 'color(display-p3 0.045 0.089 0.338)',
  '--t-background-quaternary': 'color(display-p3 0.073 0.120 0.384)',
  '--t-background-transparent-primary':
    'color(display-p3 0.010 0.053 0.266 / 0.95)',
  '--t-background-transparent-secondary':
    'color(display-p3 0.010 0.053 0.266 / 0.9)',
  '--t-border-color-light': 'color(display-p3 0.073 0.120 0.384)',
  '--t-border-color-medium': 'color(display-p3 0.116 0.163 0.434)',
  '--t-border-color-strong': 'color(display-p3 0.166 0.214 0.522)',
};
