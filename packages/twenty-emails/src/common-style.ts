/* oxlint-disable twenty/no-hardcoded-colors */

const grayScale = {
  gray100: '#000000',
  gray90: '#141414',
  gray85: '#171717',
  gray80: '#1b1b1b',
  gray75: '#1d1d1d',
  gray70: '#222222',
  gray65: '#292929',
  gray60: '#333333',
  gray55: '#4c4c4c',
  gray50: '#666666',
  gray45: '#818181',
  gray40: '#999999',
  gray35: '#b3b3b3',
  gray30: '#cccccc',
  gray25: '#d6d6d6',
  gray20: '#ebebeb',
  gray15: '#f1f1f1',
  gray10: '#fcfcfc',
  gray0: '#ffffff',
};

// Your Jugaad palette from yourjugaad.com.
const brandColors = {
  orange: '#F16205',
  navy: '#1B2A3A',
  mutedInk: '#4A5664',
  lightInk: '#7A8794',
  warmGround: '#F7F5F1',
  line: '#E3E2E0',
};

export const canvasTheme = {
  font: {
    colors: {
      highlighted: brandColors.navy,
      primary: brandColors.mutedInk,
      tertiary: brandColors.lightInk,
      inverted: grayScale.gray0,
      blue: brandColors.orange,
    },
    family: 'Trebuchet MS', // Google Inter not working, we need to use a web safe font, see https://templates.mailchimp.com/design/typography/
    weight: {
      regular: 400,
      bold: 600,
    },
    size: {
      sm: '12px',
      md: '13px',
      lg: '16px',
      xl: '24px',
    },
    lineHeight: '20px',
  },
  border: {
    radius: { sm: '4px', md: '8px', pill: '999px' },
    color: { highlighted: brandColors.line },
  },
  background: {
    colors: { highlight: brandColors.warmGround },
    button: brandColors.orange,
    transparent: {
      medium: 'rgba(0, 0, 0, 0.08)',
      light: 'rgba(0, 0, 0, 0.04)',
    },
  },
};
