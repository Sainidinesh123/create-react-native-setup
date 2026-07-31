import fs from 'node:fs';
import { androidPermission } from '../setup/androidPermission.js';
import { androidManifestPath } from '../nativePaths.js';

/**
 * Notifee auto-links on bare React Native. Ensure the Android 13+ permission
 * is present; skip speculative Manifest service/receiver entries.
 * @param {string} projectPath
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<Array<object>>}
 */
export async function applyNotifeeNative(projectPath, options = {}) {
  const results = [];

  try {
    if (options.dryRun) {
      results.push({
        packageId: 'notifee',
        type: 'notifeeAndroid',
        status: 'skipped',
        detail: '[dry-run] Would ensure POST_NOTIFICATIONS for Notifee',
      });
      return results;
    }

    if (!fs.existsSync(androidManifestPath(projectPath))) {
      results.push({
        packageId: 'notifee',
        type: 'notifeeAndroid',
        status: 'skipped',
        detail: 'AndroidManifest.xml not found (no android/ folder?)',
      });
      return results;
    }

    const android = await androidPermission(projectPath, {
      permission: 'android.permission.POST_NOTIFICATIONS',
    });
    results.push({ packageId: 'notifee', type: 'notifeeAndroid', ...android });
  } catch (error) {
    results.push({
      packageId: 'notifee',
      type: 'notifeeAndroid',
      status: 'failed',
      detail: error.message,
    });
  }

  return results;
}
