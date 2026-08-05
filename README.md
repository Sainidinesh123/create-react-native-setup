# create-react-native-setup — React Native CLI project generator & starter kit

[![npm version](https://img.shields.io/npm/v/create-react-native-setup.svg)](https://www.npmjs.com/package/create-react-native-setup)
[![npm downloads](https://img.shields.io/npm/dm/create-react-native-setup.svg)](https://www.npmjs.com/package/create-react-native-setup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Sainidinesh123/create-react-native-setup.svg?style=social)](https://github.com/Sainidinesh123/create-react-native-setup/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/Sainidinesh123/create-react-native-setup.svg)](https://github.com/Sainidinesh123/create-react-native-setup/issues)
[![Node.js](https://img.shields.io/node/v/create-react-native-setup.svg)](https://nodejs.org)

```bash
npx create-react-native-setup MyApp
```

**create-react-native-setup** is a React Native CLI project generator and starter kit for **bare React Native** (Android & iOS). It scaffolds a production-oriented app with guided package selection, Firebase / FCM push notification setup, native **app icon** and **splash screen** generation, and compatible dependency resolution—then prints a clear report of every change.

Use this React Native bootstrap CLI when you want more than a blank Community CLI init, without locking into Expo managed workflow.

## Why use this package?

| Pain point | What this CLI does |
|------------|--------------------|
| Blank `init` leaves hours of wiring | Selects navigation, reanimated, camera, Firebase, and more in one flow |
| Version conflicts across peers | Resolves the latest **compatible stable** npm versions for your RN release |
| Firebase / FCM setup is error-prone | Copies configs, wires Gradle & AppDelegate, bootstraps notification JS |
| Icons & splash are tedious | Generates Android + iOS assets; optional `react-native-bootsplash` auto-config |
| Hard to know what changed | Writes a terminal report + `create-react-native-setup-report.json` |

## Features

- **React Native project generator** on top of `@react-native-community/cli`
- **Bare React Native** Android & iOS scaffold (not Expo-managed)
- Optional package **groups** (navigation, animation, camera, Firebase, analytics, …)
- Compatible stable **version resolution** (no hardcoded package versions)
- **Firebase** config copy + Google Services Gradle / iOS `FirebaseApp.configure()`
- **Push notifications / FCM** via `@react-native-firebase/messaging` and/or `@notifee/react-native`
- Native **app icon** generation (mipmaps + iOS AppIcon)
- **Splash screen** via BootSplash, `react-native-splash-screen`, or native assets
- Idempotent Babel / entry / permission / Info.plist setup
- Interactive or fully non-interactive (`--yes`) with `npx`

## Screenshots

> Placeholder — add PNGs under `docs/assets/` and link them here after you capture a demo run.

```text
docs/assets/cli-interactive.png     # package group prompts
docs/assets/report.png              # final setup report
docs/assets/android-splash.png      # cold-start splash
docs/assets/ios-icon.png            # generated app icon
```

<!-- Example once files exist:
![Interactive CLI](docs/assets/cli-interactive.png)
![Setup report](docs/assets/report.png)
-->

## Installation

This package is a **CLI**. Prefer `npx` (no global install required):

```bash
npx create-react-native-setup MyApp
```

Optional global install:

```bash
npm install -g create-react-native-setup
create-react-native-setup MyApp
```

> **`npm install create-react-native-setup` alone does not create a project.**  
> It only installs the React Native CLI tool into `node_modules`. Always run the binary via `npx` or a global install.

### Requirements

- Node.js **18+**
- Network access to the npm registry
- For iOS pods: **macOS** with CocoaPods
- For Android builds: Android SDK (`ANDROID_HOME`) and a device/emulator

## Usage

```bash
npx create-react-native-setup [projectName] [options]
```

| Option | Description |
|--------|-------------|
| `--yes`, `-y`, `--default` | Accept defaults and skip every prompt |
| `--rn-version <ver>` | React Native version to create (default: latest stable) |
| `--icon <file>` | Image for native app icons |
| `--splash <file>` | Image for splash / BootSplash logo |
| `--splash-package <id>` | `bootsplash` \| `splash-screen` \| `native` |
| `--google-services <file>` | `google-services.json` (Android Firebase) |
| `--google-service-info <file>` | `GoogleService-Info.plist` (iOS Firebase) |
| `--notifications <list>` | `messaging`, `notifee`, or `none` |
| `--config <file>` | Custom package catalog JSON |
| `--dry-run` | Resolve and print the plan without writing files |
| `--help`, `-h` | Show help |

Images: `.png`, `.jpg`, `.jpeg`, `.webp` (square sources work best).  
Firebase configs must keep standard basenames.

## Example

```bash
# Interactive React Native setup (name → RN version → packages → Firebase → icon → splash)
npx create-react-native-setup

# Fast path with defaults
npx create-react-native-setup MyApp --yes

# Pin React Native version
npx create-react-native-setup MyApp --rn-version 0.81.6

# Branding + BootSplash without prompts
npx create-react-native-setup MyApp --yes \
  --icon ./icon.png \
  --splash ./splash.png \
  --splash-package bootsplash

# Firebase + FCM / push notifications
npx create-react-native-setup MyApp --yes \
  --notifications messaging,notifee \
  --google-services ./google-services.json \
  --google-service-info ./GoogleService-Info.plist

# Preview only
npx create-react-native-setup MyApp --yes --dry-run
```

The scaffolder creates the app in the **current working directory**. After prompts (or flags), installs, native edits, asset generation, and `pod install` (macOS) run automatically.

## What the generator does

1. Project name  
2. React Native version (blank = latest stable)  
3. Package groups (Navigation, Animation, Camera, Firebase, …)  
4. Notification multi-select when that group is enabled  
5. Auto-adds `@react-native-firebase/app` when messaging is selected  
6. Firebase config paths (blank skips a platform)  
7. Creates the app via `@react-native-community/cli`  
8. Resolves compatible package versions  
9. Installs with the detected package manager  
10. Applies Babel / entry / permissions / Info.plist / pods  
11. Firebase + notification wiring + JS bootstrap  
12. App icon / splash (BootSplash auto-wires `BootTheme` on Android when chosen)  
13. Prints a report and writes `create-react-native-setup-report.json`

## Generated project structure (typical)

```text
MyApp/
├── android/                 # Bare React Native Android project
│   └── app/src/main/...
├── ios/                     # Bare React Native iOS project
├── src/                     # Optional generated helpers (e.g. notifications)
├── App.tsx / App.js
├── index.js
├── package.json
├── babel.config.js
└── create-react-native-setup-report.json
```

Exact folders depend on which groups and branding options you enable.

## Supported React Native versions

- Targets the **latest stable** React Native by default (`--rn-version` to pin).  
- Compatible with current Community CLI templates (tested around **0.81.x – 0.86.x**).  
- Package versions are resolved against the chosen React Native peers—not frozen in the catalog.  
- Requires **Node.js 18+**.

## Firebase, FCM & push notifications

- Copies `google-services.json` / `GoogleService-Info.plist`  
- Applies Google Services Gradle plugin and iOS `FirebaseApp.configure()`  
- Installs messaging and/or Notifee; ensures `POST_NOTIFICATIONS` and iOS background modes  
- Writes `src/notifications.js` (or `.ts`) and imports it from the entry file  

**Still manual:** APNs key in Firebase Console, and Push Notifications capability in Xcode.

## App icon & splash screen

- **Icon:** Android mipmaps + iOS `AppIcon.appiconset`  
- **Splash:** `react-native-bootsplash` (recommended), `react-native-splash-screen`, or native assets only  
- BootSplash: ensures `BootTheme` (parent `Theme.BootSplash` for v7+), Manifest theme, MainActivity init, AppDelegate storyboard hook, and JS `hide()`

## Extending the catalog

Use `catalogs/default.json` or `--config`:

```json
{
  "version": 1,
  "groups": [
    {
      "id": "animation",
      "label": "Animation & Gestures",
      "default": true,
      "packages": ["reanimated"]
    }
  ],
  "packages": [
    {
      "id": "reanimated",
      "label": "React Native Reanimated",
      "npm": ["react-native-reanimated"],
      "default": true,
      "setup": [
        {
          "type": "babelPlugin",
          "plugin": "react-native-reanimated/plugin",
          "position": "last"
        }
      ]
    }
  ]
}
```

| Setup type | Purpose |
|------------|---------|
| `babelPlugin` | Add Babel plugin |
| `importInEntry` | Add import to `index.js` / `index.tsx` |
| `androidPermission` | Android permission |
| `infoPlist` | iOS Info.plist key |
| `podInstall` | CocoaPods (macOS) |
| `docs` | Docs URL in report |

## FAQ

**Is this an Expo template?**  
No. It scaffolds **bare React Native** (Android + iOS) via the React Native Community CLI.

**Does `npm i create-react-native-setup` create my app?**  
No—that only installs the CLI. Use `npx create-react-native-setup MyApp`.

**Can I use it for Firebase + FCM?**  
Yes—pass configs and `--notifications messaging` (and/or `notifee`).

**Will BootSplash break Android builds?**  
This CLI auto-wires `BootTheme` and related native files for BootSplash v7+ when you choose that splash package.

**Which package manager does it use?**  
It detects npm / yarn / pnpm from the generated project and installs accordingly.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `SDK location not found` | Set `ANDROID_HOME` or write `android/local.properties` with `sdk.dir=...` |
| `Unresolved reference BootTheme` | Re-run with `--splash` + `--splash-package bootsplash` on a current release (1.2.5+), or add `BootTheme` to `styles.xml` |
| `pod install` skipped | Run on macOS: `cd ios && pod install` |
| npm publish `404` / `401` | `npm login` as a package owner; use `--otp` for 2FA |
| Generator refuses Node | Upgrade to Node 18+ (RN templates may ask for newer engines) |

## Ranking / discoverability tips (for maintainers)

Keep shipping frequently, answer issues quickly, add real screenshots, and pin GitHub topics (see repo About). Weekly downloads and README quality matter more to npm search than keyword stuffing alone.

## Contributing

```bash
git clone https://github.com/Sainidinesh123/create-react-native-setup.git
cd create-react-native-setup
npm install
npm test
node bin/create-react-native-setup.js DemoApp --dry-run --yes
```

Issues and PRs: https://github.com/Sainidinesh123/create-react-native-setup/issues

## Links

- npm: https://www.npmjs.com/package/create-react-native-setup  
- GitHub: https://github.com/Sainidinesh123/create-react-native-setup  
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## License

MIT © [Sainidinesh123](https://github.com/Sainidinesh123)
