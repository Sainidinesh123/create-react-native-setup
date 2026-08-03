import { askYesNo, askText } from '../prompt.js';
import { color } from '../colors.js';
import { validateImagePath } from './validateImage.js';
import { applyIcon } from './applyIcon.js';
import { applySplash } from './applySplash.js';
import { applyBootSplash } from './applyBootSplash.js';
import { applySplashScreenPkg } from './applySplashScreenPkg.js';
import {
  collectSplashBackground,
  collectSplashPackageChoice,
  normalizeSplashPackageId,
  SPLASH_NPM_BY_ID,
} from './splashPackage.js';

/**
 * Fail before any scaffolding happens when a flag points at an unusable image.
 * @param {{ iconPath?: string, splashPath?: string, splashPackage?: string }} flags
 */
export function assertBrandingFlagPaths(flags = {}) {
  for (const [flag, value] of [
    ['--icon', flags.iconPath],
    ['--splash', flags.splashPath],
  ]) {
    if (!value) continue;
    const result = validateImagePath(value);
    if (!result.ok) {
      throw new Error(`${flag}: ${result.error}`);
    }
  }
  if (flags.splashPackage && !flags.splashPath) {
    throw new Error('--splash-package requires --splash <image>');
  }
  if (flags.splashPackage && !normalizeSplashPackageId(flags.splashPackage)) {
    throw new Error('--splash-package must be one of: bootsplash, splash-screen, native');
  }
}

/**
 * Ask for icon + splash image paths up front (blank skips).
 * When a splash path is set, chooses package/background, then applyBranding
 * generates and wires assets with no further manual steps.
 * @returns {Promise<{
 *   iconPath?: string,
 *   splashPath?: string,
 *   splashPackage?: 'bootsplash' | 'splash-screen' | 'native',
 *   splashBackground?: string,
 * }>}
 */
export async function collectBrandingOptions(options = {}) {
  const confirm = options.askYesNo || askYesNo;
  const prompt = options.askText || askText;
  const collected = {};

  if (options.iconPath) {
    const result = validateImagePath(options.iconPath);
    if (!result.ok) throw new Error(result.error);
    collected.iconPath = result.absolutePath;
  } else if (!options.yes) {
    const iconPath = await askOptionalImagePath(prompt, 'App icon image path');
    if (iconPath) collected.iconPath = iconPath;
  }

  if (options.splashPath) {
    const result = validateImagePath(options.splashPath);
    if (!result.ok) throw new Error(result.error);
    collected.splashPath = result.absolutePath;
  } else if (!options.yes) {
    const splashPath = await askOptionalImagePath(prompt, 'Splash screen image path');
    if (splashPath) collected.splashPath = splashPath;
  }

  if (collected.splashPath) {
    collected.splashPackage = await collectSplashPackageChoice({
      splashPackage: options.splashPackage,
      yes: options.yes,
      askText: prompt,
      askYesNo: confirm,
    });

    const npmName = SPLASH_NPM_BY_ID[collected.splashPackage];
    if (npmName) {
      console.log(color.green(`  Will install and configure ${npmName}`));
    } else {
      console.log(color.dim('  Using native assets only (no splash npm package)'));
    }

    collected.splashBackground = await collectSplashBackground({
      yes: options.yes,
      splashBackground: options.splashBackground,
      askText: prompt,
    });
  }

  return collected;
}

/**
 * Path prompt that allows blank to skip. Re-asks until valid when non-blank.
 * @returns {Promise<string | undefined>}
 */
async function askOptionalImagePath(prompt, label) {
  while (true) {
    const answer = await prompt(`${label} (blank to skip): `);
    if (!answer) {
      return undefined;
    }
    const result = validateImagePath(answer);
    if (result.ok) {
      return result.absolutePath;
    }
    console.log(color.yellow(`  ${result.error}`));
  }
}

/**
 * @param {string} projectPath
 * @param {{
 *   iconPath?: string,
 *   splashPath?: string,
 *   splashPackage?: string,
 *   splashBackground?: string,
 * }} branding
 * @param {{ dryRun?: boolean }} [options]
 */
export async function applyBranding(projectPath, branding = {}, options = {}) {
  const results = [];
  const background = branding.splashBackground || '#ffffff';

  if (branding.iconPath) {
    results.push({
      packageId: 'branding',
      type: 'appIcon',
      ...(await applyIcon(projectPath, branding.iconPath, options)),
    });
  }

  if (branding.splashPath) {
    const mode = branding.splashPackage || 'native';
    if (mode === 'bootsplash') {
      results.push(
        ...(await applyBootSplash(projectPath, branding.splashPath, {
          ...options,
          background,
        })),
      );
    } else if (mode === 'splash-screen') {
      results.push(
        ...(await applySplashScreenPkg(projectPath, branding.splashPath, {
          ...options,
          background,
        })),
      );
    } else {
      results.push({
        packageId: 'branding',
        type: 'splashScreen',
        ...(await applySplash(projectPath, branding.splashPath, {
          ...options,
          background,
        })),
      });
    }
  }

  return results;
}

export {
  applyIcon,
  applySplash,
  applyBootSplash,
  applySplashScreenPkg,
  validateImagePath,
  SPLASH_NPM_BY_ID,
};
