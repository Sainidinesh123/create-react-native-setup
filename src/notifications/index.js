import { multiSelect } from './multiSelect.js';

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

export { multiSelect };
