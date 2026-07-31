import { askYesNo, askText } from '../prompt.js';
import {
  validateGoogleServicesPath,
  validateGoogleServiceInfoPath,
} from './validateConfig.js';
import { copyGoogleServices, copyGoogleServiceInfo } from './copyConfig.js';
import { applyGoogleServicesGradle } from './applyAndroid.js';
import { applyFirebaseIos } from './applyIos.js';

export const APNS_MANUAL_ACTION =
  'Upload an APNs auth key (or certificate) to Firebase Console → Project settings → Cloud Messaging, and enable Push Notifications for the app in the Apple Developer portal.';

/**
 * Fail before any scaffolding happens when a flag points at an unusable file.
 * @param {{ googleServicesPath?: string, googleServiceInfoPath?: string }} flags
 */
export function assertFirebaseFlagPaths(flags = {}) {
  for (const [flag, value, validate] of [
    ['--google-services', flags.googleServicesPath, validateGoogleServicesPath],
    ['--google-service-info', flags.googleServiceInfoPath, validateGoogleServiceInfoPath],
  ]) {
    if (!value) continue;
    const result = validate(value);
    if (!result.ok) {
      throw new Error(`${flag}: ${result.error}`);
    }
  }
}

/**
 * Decide which Firebase config files to install, prompting only when needed.
 * A blank answer skips that platform.
 * @param {{
 *   yes?: boolean,
 *   googleServicesPath?: string,
 *   googleServiceInfoPath?: string,
 *   firebaseSelected?: boolean,
 *   askYesNo?: Function,
 *   askText?: Function,
 * }} options
 * @returns {Promise<{ googleServicesPath?: string, googleServiceInfoPath?: string }>}
 */
export async function collectFirebaseOptions(options = {}) {
  const confirm = options.askYesNo || askYesNo;
  const prompt = options.askText || askText;
  const collected = {};

  const flags = [
    ['googleServicesPath', options.googleServicesPath, validateGoogleServicesPath],
    ['googleServiceInfoPath', options.googleServiceInfoPath, validateGoogleServiceInfoPath],
  ];
  for (const [key, value, validate] of flags) {
    if (!value) continue;
    const result = validate(value);
    if (!result.ok) {
      throw new Error(result.error);
    }
    collected[key] = result.absolutePath;
  }

  const hasFlags = Boolean(collected.googleServicesPath || collected.googleServiceInfoPath);
  if (hasFlags || options.yes || !options.firebaseSelected) {
    return collected;
  }

  if (!(await confirm('Configure Firebase config files now?', { defaultYes: true }))) {
    return collected;
  }

  const questions = [
    [
      'googleServicesPath',
      'Path to google-services.json (Android, blank to skip): ',
      validateGoogleServicesPath,
    ],
    [
      'googleServiceInfoPath',
      'Path to GoogleService-Info.plist (iOS, blank to skip): ',
      validateGoogleServiceInfoPath,
    ],
  ];
  for (const [key, question, validate] of questions) {
    const answer = await askUntilValid(prompt, question, validate);
    if (answer) {
      collected[key] = answer;
    }
  }

  return collected;
}

async function askUntilValid(prompt, question, validate) {
  while (true) {
    const answer = (await prompt(question)) || '';
    if (!answer.trim()) {
      return null;
    }
    const result = validate(answer);
    if (result.ok) {
      return result.absolutePath;
    }
    console.log(`  ${result.error}`);
  }
}

/**
 * Copy the Firebase config files and wire them into each native project.
 * Android and iOS are applied independently so one failure cannot skip the other.
 * @param {string} projectPath
 * @param {string} projectName
 * @param {{ googleServicesPath?: string, googleServiceInfoPath?: string }} paths
 * @param {{ dryRun?: boolean, includeMessagingManual?: boolean }} [options]
 * @returns {Promise<Array<object>>}
 */
export async function applyFirebase(projectPath, projectName, paths = {}, options = {}) {
  const results = [];
  const push = (type, result) => results.push({ packageId: 'firebase', type, ...result });

  if (paths.googleServicesPath) {
    const copied = await step(() =>
      copyGoogleServices(projectPath, paths.googleServicesPath, options),
    );
    push('firebaseAndroidConfig', copied);
    if (copied.status !== 'failed') {
      push('firebaseAndroidGradle', await step(() => applyGoogleServicesGradle(projectPath, options)));
    }
  }

  if (paths.googleServiceInfoPath) {
    const copied = await step(() =>
      copyGoogleServiceInfo(projectPath, projectName, paths.googleServiceInfoPath, options),
    );
    push('firebaseIosConfig', copied);
    if (copied.status !== 'failed') {
      push('firebaseIos', await step(() => applyFirebaseIos(projectPath, projectName, options)));
    }
  }

  if (options.includeMessagingManual && (paths.googleServiceInfoPath || paths.googleServicesPath)) {
    push('firebaseManual', {
      status: 'manual',
      detail: 'Push notifications need credentials that only you can configure',
      manualAction: APNS_MANUAL_ACTION,
    });
  }

  return results;
}

async function step(fn) {
  try {
    return await fn();
  } catch (error) {
    return { status: 'failed', detail: error.message };
  }
}

export {
  applyFirebaseIos,
  applyGoogleServicesGradle,
  copyGoogleServiceInfo,
  copyGoogleServices,
  validateGoogleServiceInfoPath,
  validateGoogleServicesPath,
};
