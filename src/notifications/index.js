import { multiSelect } from './multiSelect.js';
import { applyMessagingNative } from './applyMessaging.js';
import { applyNotifeeNative } from './applyNotifee.js';
import {
  ensureNotificationsImport,
  writeNotificationsBootstrap,
} from './writeBootstrap.js';
import { APNS_MANUAL_ACTION } from '../firebase/index.js';

export const NOTIFICATION_OPTIONS = [
  {
    id: 'firebase-messaging',
    flag: 'messaging',
    label: '@react-native-firebase/messaging (push via FCM)',
  },
  {
    id: 'notifee',
    flag: 'notifee',
    label: '@notifee/react-native (local and rich notifications)',
  },
];

export const NOTIFICATION_PACKAGE_IDS = NOTIFICATION_OPTIONS.map((option) => option.id);

/**
 * Choose the notification packages to install.
 * Flags win; `--yes` without flags installs nothing.
 * @param {{
 *   yes?: boolean,
 *   notificationIds?: string[],
 *   notificationsGroupSelected?: boolean,
 *   multiSelect?: Function,
 *   askYesNo?: Function,
 *   isTTY?: boolean,
 * }} options
 * @returns {Promise<{ packageIds: string[] }>}
 */
export async function collectNotificationOptions(options = {}) {
  if (options.notificationIds?.length) {
    const packageIds = NOTIFICATION_OPTIONS.filter((option) =>
      options.notificationIds.includes(option.flag),
    ).map((option) => option.id);
    return { packageIds };
  }

  if (options.yes || !options.notificationsGroupSelected) {
    return { packageIds: [] };
  }

  const pick = options.multiSelect || multiSelect;
  const packageIds = await pick(NOTIFICATION_OPTIONS, {
    preselected: NOTIFICATION_PACKAGE_IDS,
    isTTY: options.isTTY,
    askYesNo: options.askYesNo,
  });
  return { packageIds };
}

/**
 * Messaging cannot work without the Firebase app module.
 * @param {Array<{ id: string }>} selected
 * @param {{ packageById: Map<string, object> }} catalog
 * @param {string[]} packageIds
 * @returns {Array<{ id: string }>}
 */
export function ensureFirebaseAppSelected(selected, catalog, packageIds = []) {
  if (!packageIds.includes('firebase-messaging')) {
    return selected;
  }
  if (selected.some((pkg) => pkg.id === 'firebase-app')) {
    return selected;
  }
  const firebaseApp = catalog.packageById.get('firebase-app');
  return firebaseApp ? [...selected, firebaseApp] : selected;
}

/**
 * Apply native + JS notification setup for the selected packages.
 * @param {string} projectPath
 * @param {string} projectName
 * @param {{ packageIds?: string[], dryRun?: boolean }} options
 * @returns {Promise<Array<object>>}
 */
export async function applyNotifications(projectPath, projectName, options = {}) {
  const packageIds = options.packageIds || [];
  const dryRun = Boolean(options.dryRun);
  const results = [];
  const hasMessaging = packageIds.includes('firebase-messaging');
  const hasNotifee = packageIds.includes('notifee');

  if (!hasMessaging && !hasNotifee) {
    return results;
  }

  if (hasMessaging) {
    results.push(...(await applyMessagingNative(projectPath, projectName, { dryRun })));
  }
  if (hasNotifee) {
    results.push(...(await applyNotifeeNative(projectPath, { dryRun })));
  }

  const bootstrap = await writeNotificationsBootstrap(projectPath, {
    hasMessaging,
    hasNotifee,
    dryRun,
  });
  results.push({ packageId: 'notifications', type: 'notificationsBootstrap', ...bootstrap });

  if (bootstrap.modulePath) {
    const imported = await ensureNotificationsImport(projectPath, bootstrap.modulePath, {
      dryRun,
    });
    results.push({ packageId: 'notifications', type: 'notificationsImport', ...imported });
  }

  if (hasMessaging) {
    results.push({
      packageId: 'firebase-messaging',
      type: 'messagingManual',
      status: 'manual',
      detail: 'Push notifications need credentials that only you can configure',
      manualAction: APNS_MANUAL_ACTION,
    });
  }

  return results;
}

export {
  applyMessagingNative,
  applyNotifeeNative,
  ensureNotificationsImport,
  multiSelect,
  writeNotificationsBootstrap,
};
