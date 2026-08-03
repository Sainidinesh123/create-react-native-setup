/**
 * Parse CLI arguments for create-react-native-setup.
 * @param {string[]} argv
 */
const VALUE_FLAGS = [
  { flag: '--config', key: 'configPath', requires: 'requires a file path' },
  { flag: '--icon', key: 'iconPath', requires: 'requires a file path' },
  {
    flag: '--splash',
    key: 'splashPath',
    requires: 'requires a file path',
  },
  {
    flag: '--splash-package',
    key: 'splashPackage',
    requires: 'requires bootsplash, splash-screen, or native',
  },
  {
    flag: '--rn-version',
    key: 'rnVersion',
    requires: 'requires a version (e.g. 0.86.2 or latest)',
  },
  {
    flag: '--google-services',
    key: 'googleServicesPath',
    requires: 'requires a file path',
  },
  {
    flag: '--google-service-info',
    key: 'googleServiceInfoPath',
    requires: 'requires a file path',
  },
  {
    flag: '--notifications',
    key: 'notificationsRaw',
    requires: 'requires a comma-separated list (messaging,notifee)',
  },
];

export const NOTIFICATION_FLAG_IDS = ['messaging', 'notifee'];

export function parseArgs(argv = []) {
  const result = {
    yes: false,
    dryRun: false,
    help: false,
    unknown: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }
    if (arg === '--yes' || arg === '-y' || arg === '--default') {
      result.yes = true;
      continue;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }

    const valueFlag = VALUE_FLAGS.find(
      ({ flag }) => arg === flag || arg.startsWith(`${flag}=`),
    );
    if (valueFlag) {
      const { flag, key, requires } = valueFlag;
      let value;
      if (arg === flag) {
        value = argv[i + 1];
        if (!value || value.startsWith('-')) {
          throw new Error(`${flag} ${requires}`);
        }
        i += 1;
      } else {
        value = arg.slice(flag.length + 1);
        if (!value) {
          throw new Error(`${flag} ${requires}`);
        }
      }
      result[key] = value;
      continue;
    }

    if (arg.startsWith('-')) {
      result.unknown.push(arg);
      continue;
    }
    if (!result.projectName) {
      result.projectName = arg;
      continue;
    }
    result.unknown.push(arg);
  }

  if (result.notificationsRaw !== undefined) {
    const ids = result.notificationsRaw
      .split(',')
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean);
    const unknownId = ids.find((id) => !NOTIFICATION_FLAG_IDS.includes(id) && id !== 'none');
    if (unknownId) {
      throw new Error(
        `--notifications unknown id "${unknownId}" (expected: ${NOTIFICATION_FLAG_IDS.join(', ')}, none)`,
      );
    }
    result.notificationIds = ids.includes('none') ? [] : ids;
    delete result.notificationsRaw;
  }

  if (result.splashPackage !== undefined) {
    const allowed = new Set(['bootsplash', 'splash-screen', 'native']);
    const id = String(result.splashPackage).trim().toLowerCase();
    if (!allowed.has(id)) {
      throw new Error(
        `--splash-package unknown id "${result.splashPackage}" (expected: bootsplash, splash-screen, native)`,
      );
    }
    result.splashPackage = id;
  }

  return result;
}

export function printHelp() {
  console.log(`
create-react-native-setup — bootstrap a React Native app with optional packages

Usage:
  npx create-react-native-setup [projectName] [options]
  node bin/create-react-native-setup.js [projectName] [options]

Options:
  --yes, -y, --default   Accept defaults and skip all prompts
  --rn-version <ver>     React Native version to create (default: latest)
  --icon <file>          Image for the native app icon (.png/.jpg/.jpeg/.webp)
  --splash <file>        Image for the native splash screen (.png/.jpg/.jpeg/.webp)
  --splash-package <id>  Splash implementation: bootsplash | splash-screen | native
                         (default bootsplash when --yes --splash is used)
  --google-services <f>  google-services.json for Android Firebase
  --google-service-info <f>
                         GoogleService-Info.plist for iOS Firebase
  --notifications <list> Notification packages: messaging,notifee (or none)
  --config <file>        Use a custom package catalog JSON
  --dry-run              Show what would happen without creating or installing
  --help, -h             Show this help

Interactive prompts (skipped by --yes or when the matching flag is passed):
  project name → React Native version → package groups → notification packages
  → Firebase config files → app icon → splash screen

Examples:
  npx create-react-native-setup
  npx create-react-native-setup MyApp
  npx create-react-native-setup MyApp --yes
  npx create-react-native-setup MyApp --rn-version 0.81.0
  npx create-react-native-setup MyApp --icon ./icon.png --splash ./splash.png
  npx create-react-native-setup MyApp --notifications messaging,notifee \\
    --google-services ./google-services.json
  npx create-react-native-setup --dry-run --yes DemoApp
  npx create-react-native-setup MyApp --config ./my-catalog.json
`.trim());
}
