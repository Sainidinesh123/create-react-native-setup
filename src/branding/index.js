import { askYesNo, askText } from '../prompt.js';
import { validateImagePath } from './validateImage.js';
import { applyIcon } from './applyIcon.js';
import { applySplash } from './applySplash.js';

/**
 * Fail before any scaffolding happens when a flag points at an unusable image.
 * @param {{ iconPath?: string, splashPath?: string }} flags
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
}

/**
 * Decide which branding images to use, prompting only when needed.
 * @param {{
 *   yes?: boolean,
 *   iconPath?: string,
 *   splashPath?: string,
 *   askYesNo?: Function,
 *   askText?: Function,
 * }} options
 * @returns {Promise<{ iconPath?: string, splashPath?: string }>}
 */
export async function collectBrandingOptions(options = {}) {
  const confirm = options.askYesNo || askYesNo;
  const prompt = options.askText || askText;
  const collected = {};

  for (const [key, flagValue, question, label] of [
    ['iconPath', options.iconPath, 'Set a custom app icon?', 'App icon image path'],
    ['splashPath', options.splashPath, 'Set a custom splash screen?', 'Splash image path'],
  ]) {
    if (flagValue) {
      const result = validateImagePath(flagValue);
      if (!result.ok) {
        throw new Error(result.error);
      }
      collected[key] = result.absolutePath;
      continue;
    }
    if (options.yes) {
      continue;
    }
    if (await confirm(question, { defaultYes: false })) {
      collected[key] = await askForImagePath(prompt, label);
    }
  }

  return collected;
}

async function askForImagePath(prompt, label) {
  while (true) {
    const answer = await prompt(`${label}: `);
    const result = validateImagePath(answer);
    if (result.ok) {
      return result.absolutePath;
    }
    console.log(`  ${result.error}`);
  }
}

/**
 * @param {string} projectPath
 * @param {{ iconPath?: string, splashPath?: string }} branding
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<Array<{ packageId: string, type: string, status: string, detail: string }>>}
 */
export async function applyBranding(projectPath, branding = {}, options = {}) {
  const results = [];

  if (branding.iconPath) {
    results.push({
      packageId: 'branding',
      type: 'appIcon',
      ...(await applyIcon(projectPath, branding.iconPath, options)),
    });
  }
  if (branding.splashPath) {
    results.push({
      packageId: 'branding',
      type: 'splashScreen',
      ...(await applySplash(projectPath, branding.splashPath, options)),
    });
  }

  return results;
}

export { applyIcon, applySplash, validateImagePath };
