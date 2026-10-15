import * as fs from 'fs';
import * as path from 'path';

import { THEME_DARK } from '@ui/theme/constants/ThemeDark';
import { THEME_LIGHT } from '@ui/theme/constants/ThemeLight';
import { themeCssVariables } from '@ui/theme-constants/themeCssVariables';

// Components styled with Linaria read the CSS files while useTheme() readers
// get the TS theme, so a token edited in only one place renders differently
// depending on how a component is styled.

type TokenTree = { [key: string]: TokenTree | string | number };

const THEME_CONSTANTS_DIR = path.resolve(__dirname, '..');

const readCssDeclarations = (fileName: string) => {
  const css = fs.readFileSync(path.join(THEME_CONSTANTS_DIR, fileName), 'utf-8');
  const baseCss = css.split('@supports')[0];
  const declarations = new Map<string, string>();

  for (const match of baseCss.matchAll(/(--t-[\w-]+):\s*([^;]+);/g)) {
    declarations.set(match[1], match[2].trim());
  }

  return declarations;
};

const collectTokenPairs = (
  variables: TokenTree,
  theme: TokenTree | undefined,
  pairs: { cssVariable: string; themeValue: string }[] = [],
) => {
  for (const [key, variable] of Object.entries(variables)) {
    const themeValue = theme?.[key];

    if (typeof variable === 'string') {
      const cssVariable = variable.match(/^var\((--t-[\w-]+)\)$/)?.[1];

      if (
        cssVariable !== undefined &&
        (typeof themeValue === 'string' || typeof themeValue === 'number')
      ) {
        pairs.push({ cssVariable, themeValue: String(themeValue) });
      }
    } else if (typeof variable === 'object' && typeof themeValue === 'object') {
      collectTokenPairs(variable, themeValue, pairs);
    }
  }

  return pairs;
};

const COLOR_VALUE_PATTERN = /^(color\(|#|rgb|hsl)/;

describe.each([
  ['theme-light.css', THEME_LIGHT],
  ['theme-dark.css', THEME_DARK],
])('%s color tokens', (fileName, theme) => {
  const declarations = readCssDeclarations(fileName);
  const colorPairs = collectTokenPairs(
    themeCssVariables as unknown as TokenTree,
    theme as unknown as TokenTree,
  ).filter(({ themeValue }) => COLOR_VALUE_PATTERN.test(themeValue));

  it('mirror the TS theme', () => {
    const mismatches = colorPairs
      .filter(
        ({ cssVariable, themeValue }) =>
          declarations.get(cssVariable) !== themeValue,
      )
      .map(
        ({ cssVariable, themeValue }) =>
          `${cssVariable}: css=${declarations.get(cssVariable)} ts=${themeValue}`,
      );

    expect(mismatches).toEqual([]);
  });
});
