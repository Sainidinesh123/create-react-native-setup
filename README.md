# create-react-native-setup

[![npm version](https://img.shields.io/npm/v/create-react-native-setup.svg)](https://www.npmjs.com/package/create-react-native-setup)
[![npm downloads](https://img.shields.io/npm/dm/create-react-native-setup.svg)](https://www.npmjs.com/package/create-react-native-setup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/node/v/create-react-native-setup.svg)](https://nodejs.org)

```bash
npx create-react-native-setup MyApp
```

**create-react-native-setup** is a React Native CLI / project generator that scaffolds a bare React Native starter with guided setup. It installs compatible packages, can configure Firebase setup and push notifications, and generates native app icons and splash screens—then prints a clear report of what changed.

Use it when you want a faster React Native setup than a blank Community CLI init, without adopting Expo.

## Features

- React Native project generator built on `@react-native-community/cli`
- Optional package groups (navigation, animation, camera, Firebase, and more)
- Compatible stable version resolution (no hardcoded npm versions)
- Firebase config copy + Android/iOS wiring
- Push notifications via `@react-native-firebase/messaging` and/or `@notifee/react-native`
- Native app icon and splash screen generation
- Idempotent native/Babel/JS setup steps and a post-run report

## Quick start

```bash
npx create-react-native-setup MyApp
```

Or install globally:

```bash
npm i -g create-react-native-setup
create-react-native-setup MyApp
```

> **`npm i create-react-native-setup` alone does not create a project.** It only installs the CLI into `node_modules`. Use `npx create-react-native-setup MyApp` (or a global install) to scaffold.

## Requirements

- Node.js 18+
- Network access (npm registry)
- For iOS pods: macOS with CocoaPods

## React Native CLI setup (usage)

```bash
npx create-react-native-setup [projectName] [options]
```

| Option | Description |
|--------|-------------|
| `--yes`, `-y`, `--default` | Accept defaults and skip every prompt |
| `--rn-version <ver>` | React Native version to create (default: latest stable) |
| `--icon <file>` | Image used to generate native app icons |
| `--splash <file>` | Image used to generate the native splash screen |
| `--splash-package <id>` | Splash implementation: `bootsplash`, `splash-screen`, or `native` (default `bootsplash` with `--yes --splash`) |
| `--google-services <file>` | `google-services.json` for Android Firebase |
| `--google-service-info <file>` | `GoogleService-Info.plist` for iOS Firebase |
| `--notifications <list>` | Notification packages: `messaging`, `notifee` (or `none`) |
| `--config <file>` | Use a custom package catalog JSON |
| `--dry-run` | Resolve and print the plan without creating or installing |
| `--help`, `-h` | Show help |

Images may be `.png`, `.jpg`, `.jpeg`, or `.webp`. A square source works best.
Firebase config files must keep their standard basenames (`google-services.json`, `GoogleService-Info.plist`).

### Examples

```bash
# Fully interactive: name → RN version → packages → notifications → Firebase → icon → splash
npx create-react-native-setup

# Non-interactive defaults (no branding / Firebase / notifications)
npx create-react-native-setup MyApp --yes

# Pin a React Native version
npx create-react-native-setup MyApp --rn-version 0.81.6

# Branding without prompts
npx create-react-native-setup MyApp --yes --icon ./icon.png --splash ./splash.png

# Push notifications + Firebase configs without prompts
npx create-react-native-setup MyApp --yes \
  --notifications messaging,notifee \
  --google-services ./google-services.json \
  --google-service-info ./GoogleService-Info.plist

# Preview only
npx create-react-native-setup MyApp --yes --dry-run

# Custom catalog
npx create-react-native-setup MyApp --config ./my-catalog.json
```

The CLI creates the project in the **current working directory**. You only answer prompts; installs, config edits, asset generation, and `pod install` (on macOS) run automatically.

## What the generator does

1. Prompts for the project name
2. Prompts for the React Native version (blank keeps the latest stable)
3. Asks Yes/No for package **groups** (Navigation, Animation, Camera, …)
4. When Notifications is selected, multi-selects `messaging` and/or `notifee` (Space/Enter on a TTY)
5. Auto-adds `@react-native-firebase/app` when messaging is chosen
6. Asks for Firebase config file paths when Firebase is in play (blank skips a platform)
7. Creates the app via `@react-native-community/cli`
8. Resolves the latest **compatible stable** npm version for each package (no hardcoded versions)
9. Installs with the detected package manager
10. Applies idempotent setup (Babel plugin, entry import, Android permissions, Info.plist, pods)
11. Copies Firebase configs, wires Gradle / AppDelegate, configures notifications, and writes a JS bootstrap
12. Asks whether to set app icon / splash, then image paths, and applies them automatically after setup
13. Prints a report and writes `create-react-native-setup-report.json` in the new project

Passing `--rn-version`, `--icon`, `--splash`, `--google-services`, `--google-service-info`, or `--notifications` skips the matching prompt; `--yes` skips all of them.

## Firebase setup and push notifications

**Firebase config files** — copies `google-services.json` to `android/app/` and `GoogleService-Info.plist` to `ios/<App>/`, adds the Google Services Gradle plugin, and calls `FirebaseApp.configure()` from the iOS AppDelegate. Xcode target membership for the plist is reported as a manual step when it cannot be automated safely.

**Push notifications** — installs `@react-native-firebase/messaging` and/or `@notifee/react-native`, ensures `POST_NOTIFICATIONS`, merges `UIBackgroundModes` (`remote-notification`), writes `src/notifications.js` (or `.ts`) without overwriting an existing file, and imports it from the app entry.

**Still manual:** upload an APNs auth key to Firebase Console → Cloud Messaging, and enable Push Notifications in Xcode / the Apple Developer portal.

## App icon and splash screen

Near the end of configuration the CLI asks:

- `Set a custom app icon? (y/N)` → if yes, `App icon image path`
- `Set a custom splash screen? (y/N)` → if yes, splash package, image path, and background

Splash package choices:

1. `react-native-bootsplash` (recommended) — install + official `generate` + hide()
2. `react-native-splash-screen` — install + native assets + show()/hide()
3. Native assets only — no splash npm package

Background color defaults to `#ffffff` (blank accepts the default). After all answers, setup runs automatically and generates/applies icon + splash with no extra manual steps. Layout is **background + centered logo** (no crop/stretch).

App icons are always native launcher assets (Android mipmaps + iOS AppIcon).

**App icon** — resizes your image into every Android launcher density
(`mipmap-mdpi` … `mipmap-xxxhdpi`, including `ic_launcher_round.png`) and every slot in the
iOS `AppIcon.appiconset`, writing the `filename` entries into `Contents.json` so Xcode picks
them up.

**Native / splash-screen assets** — writes density splash drawables and a centered LaunchScreen image on a solid background.

## Extending the catalog

Edit `catalogs/default.json` or pass `--config`:

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

### Built-in setup step types

| Type | Purpose |
|------|---------|
| `babelPlugin` | Add a Babel plugin (idempotent) |
| `importInEntry` | Add import at top of `index.js` / `index.tsx` |
| `androidPermission` | Add Android permission |
| `infoPlist` | Add iOS Info.plist key |
| `podInstall` | Run CocoaPods (macOS only; deduped) |
| `docs` | Record docs URL in the report |

Add a new handler under `src/setup/` and register it in `src/setup/registry.js`.

## Contributing / local development

```bash
git clone https://github.com/Sainidinesh123/create-react-native-setup.git
cd create-react-native-setup
npm install
node bin/create-react-native-setup.js MyApp
npm test
```

## Links

- npm: https://www.npmjs.com/package/create-react-native-setup
- Source: https://github.com/Sainidinesh123/create-react-native-setup
- Issues: https://github.com/Sainidinesh123/create-react-native-setup/issues

## License

MIT
