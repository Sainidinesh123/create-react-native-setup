import fs from 'node:fs';
import path from 'node:path';
import { androidPermission } from '../setup/androidPermission.js';
import { androidManifestPath, findIosAppDir } from '../nativePaths.js';

export const PUSH_CAPABILITY_ACTION =
  'In Xcode → Signing & Capabilities, add Push Notifications and Background Modes (Remote notifications + Background fetch).';

/**
 * Merge `remote-notification` (and `fetch`) into UIBackgroundModes in Info.plist.
 * @param {string} projectPath
 * @param {string} projectName
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ status: string, detail: string, manualAction?: string }>}
 */
export async function mergeBackgroundModes(projectPath, projectName, options = {}) {
  if (options.dryRun) {
    return {
      status: 'skipped',
      detail: '[dry-run] Would merge UIBackgroundModes for remote notifications',
      manualAction: PUSH_CAPABILITY_ACTION,
    };
  }

  const appDir = findIosAppDir(projectPath, projectName);
  if (!appDir) {
    return { status: 'failed', detail: 'Could not find the iOS app directory under ios/' };
  }

  const plistPath = path.join(appDir, 'Info.plist');
  if (!fs.existsSync(plistPath)) {
    return { status: 'failed', detail: 'Info.plist not found under the iOS app directory' };
  }

  let content = fs.readFileSync(plistPath, 'utf8');
  const modes = ['fetch', 'remote-notification'];
  const missing = modes.filter((mode) => !content.includes(`<string>${mode}</string>`));

  if (!missing.length && content.includes('<key>UIBackgroundModes</key>')) {
    return {
      status: 'already-applied',
      detail: 'UIBackgroundModes already includes remote-notification',
      manualAction: PUSH_CAPABILITY_ACTION,
    };
  }

  const arrayBody = modes.map((mode) => `\t\t<string>${mode}</string>`).join('\n');

  if (content.includes('<key>UIBackgroundModes</key>')) {
    // Expand an existing array with any missing mode strings.
    for (const mode of missing) {
      content = content.replace(
        /(<key>UIBackgroundModes<\/key>\s*<array>)([\s\S]*?)(<\/array>)/,
        (_, open, body, close) => `${open}${body}\t\t<string>${mode}</string>\n${close}`,
      );
    }
  } else if (content.includes('</dict>')) {
    const entry = `\t<key>UIBackgroundModes</key>\n\t<array>\n${arrayBody}\n\t</array>\n`;
    content = content.replace('</dict>', `${entry}</dict>`);
  } else {
    return { status: 'failed', detail: 'Malformed Info.plist (no </dict>)' };
  }

  fs.writeFileSync(plistPath, content, 'utf8');
  return {
    status: 'applied',
    detail: `Merged UIBackgroundModes in ${path.relative(projectPath, plistPath)}`,
    manualAction: PUSH_CAPABILITY_ACTION,
  };
}

/**
 * Native FCM wiring beyond catalog steps (permission is also in the catalog).
 * Android and iOS are isolated so one failure cannot skip the other.
 * @param {string} projectPath
 * @param {string} projectName
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<Array<object>>}
 */
export async function applyMessagingNative(projectPath, projectName, options = {}) {
  const results = [];

  try {
    if (options.dryRun) {
      results.push({
        packageId: 'firebase-messaging',
        type: 'messagingAndroid',
        status: 'skipped',
        detail: '[dry-run] Would ensure POST_NOTIFICATIONS in AndroidManifest.xml',
      });
    } else if (!fs.existsSync(androidManifestPath(projectPath))) {
      results.push({
        packageId: 'firebase-messaging',
        type: 'messagingAndroid',
        status: 'skipped',
        detail: 'AndroidManifest.xml not found (no android/ folder?)',
      });
    } else {
      const android = await androidPermission(projectPath, {
        permission: 'android.permission.POST_NOTIFICATIONS',
      });
      results.push({ packageId: 'firebase-messaging', type: 'messagingAndroid', ...android });
    }
  } catch (error) {
    results.push({
      packageId: 'firebase-messaging',
      type: 'messagingAndroid',
      status: 'failed',
      detail: error.message,
    });
  }

  try {
    const ios = await mergeBackgroundModes(projectPath, projectName, options);
    results.push({ packageId: 'firebase-messaging', type: 'messagingIos', ...ios });
  } catch (error) {
    results.push({
      packageId: 'firebase-messaging',
      type: 'messagingIos',
      status: 'failed',
      detail: error.message,
      manualAction: PUSH_CAPABILITY_ACTION,
    });
  }

  return results;
}
