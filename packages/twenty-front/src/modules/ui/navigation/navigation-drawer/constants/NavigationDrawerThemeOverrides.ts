import { type ThemeOverrides } from 'twenty-ui/theme-constants';

// The drawer renders with the dark theme scoped to it, on the site's ink
// (#10202E) instead of the dark theme's surface, so the navigation reads as a
// brand panel in both light and dark mode, like the hero on yourjugaad.com.
export const NAVIGATION_DRAWER_THEME_OVERRIDES: ThemeOverrides = {
  '--t-background-primary': 'color(display-p3 0.077 0.124 0.176)',
  '--t-background-secondary': 'color(display-p3 0.077 0.124 0.176)',
  '--t-background-tertiary': 'color(display-p3 0.122 0.167 0.215)',
  '--t-background-quaternary': 'color(display-p3 0.160 0.202 0.250)',
  '--t-background-transparent-primary':
    'color(display-p3 0.077 0.124 0.176 / 0.95)',
  '--t-background-transparent-secondary':
    'color(display-p3 0.077 0.124 0.176 / 0.9)',
  '--t-border-color-light': 'color(display-p3 0.160 0.202 0.250)',
  '--t-border-color-medium': 'color(display-p3 0.203 0.245 0.290)',
  '--t-border-color-strong': 'color(display-p3 0.261 0.300 0.341)',
};
