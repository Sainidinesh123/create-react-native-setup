import { askText, askYesNo } from '../prompt.js';
import { promptLabel, color } from '../colors.js';

export const SPLASH_PACKAGE_IDS = ['bootsplash', 'splash-screen', 'native'];

export const SPLASH_PACKAGE_OPTIONS = [
  {
    id: 'bootsplash',
    npm: 'react-native-bootsplash',
    label: 'react-native-bootsplash (recommended)',
  },
  {
    id: 'splash-screen',
    npm: 'react-native-splash-screen',
    label: 'react-native-splash-screen',
  },
  {
    id: 'native',
    npm: null,
    label: 'Native assets only (no npm package)',
  },
];

export const SPLASH_NPM_BY_ID = {
  bootsplash: 'react-native-bootsplash',
  'splash-screen': 'react-native-splash-screen',
};

/**
 * @param {string} value
 * @returns {string | null}
 */
export function normalizeSplashPackageId(value) {
  if (typeof value !== 'string') return null;
  const id = value.trim().toLowerCase();
  if (id === 'splashscreen' || id === 'react-native-splash-screen') return 'splash-screen';
  if (id === 'react-native-bootsplash' || id === 'boot-splash') return 'bootsplash';
  return SPLASH_PACKAGE_IDS.includes(id) ? id : null;
}

/**
 * Ask which splash implementation to install/configure.
 * @param {{
 *   splashPackage?: string,
 *   yes?: boolean,
 *   askText?: Function,
 *   askYesNo?: Function,
 * }} options
 * @returns {Promise<'bootsplash' | 'splash-screen' | 'native'>}
 */
export async function collectSplashPackageChoice(options = {}) {
  if (options.splashPackage) {
    const id = normalizeSplashPackageId(options.splashPackage);
    if (!id) {
      throw new Error(
        `--splash-package must be one of: ${SPLASH_PACKAGE_IDS.join(', ')}`,
      );
    }
    return id;
  }

  if (options.yes) {
    return 'bootsplash';
  }

  const prompt = options.askText || askText;
  console.log(color.magenta('\nWhich splash screen package should be installed?'));
  for (const [index, option] of SPLASH_PACKAGE_OPTIONS.entries()) {
    console.log(`  ${color.bold(String(index + 1))}) ${option.label}`);
  }

  while (true) {
    const answer = (await prompt(promptLabel('Choose splash package [1-3] (default 1): '))) || '1';
    if (/^[123]$/.test(answer)) {
      return SPLASH_PACKAGE_OPTIONS[Number(answer) - 1].id;
    }
    const byId = normalizeSplashPackageId(answer);
    if (byId) return byId;
    console.log(color.yellow('  Enter 1, 2, or 3'));
  }
}

/**
 * Optional background color for splash generation (default white).
 * @param {{ yes?: boolean, splashBackground?: string, askText?: Function }} options
 */
export async function collectSplashBackground(options = {}) {
  if (options.splashBackground) {
    return normalizeHexColor(options.splashBackground);
  }
  if (options.yes) {
    return '#ffffff';
  }
  const prompt = options.askText || askText;
  while (true) {
    const answer =
      (await prompt(promptLabel('Splash background color (hex, blank = #ffffff): '))) ||
      '#ffffff';
    try {
      return normalizeHexColor(answer);
    } catch (error) {
      console.log(color.yellow(`  ${error.message}`));
    }
  }
}

export function normalizeHexColor(value) {
  const raw = String(value || '').trim();
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error('Use a 6-digit hex color like #ffffff');
  }
  return hex.toLowerCase();
}

export { askYesNo };
