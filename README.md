# create-react-native-setup

### Create React Native App — bare React Native CLI project generator & starter kit

[![npm version](https://img.shields.io/npm/v/create-react-native-setup.svg)](https://www.npmjs.com/package/create-react-native-setup)
[![npm downloads](https://img.shields.io/npm/dm/create-react-native-setup.svg)](https://www.npmjs.com/package/create-react-native-setup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Sainidinesh123/create-react-native-setup?style=social)](https://github.com/Sainidinesh123/create-react-native-setup/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/Sainidinesh123/create-react-native-setup.svg)](https://github.com/Sainidinesh123/create-react-native-setup/issues)
[![CI](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/Sainidinesh123/create-react-native-setup)

```bash
npx create-react-native-setup MyApp
```

**create-react-native-setup** is a **React Native CLI tool** and **bare React Native project generator**. It scaffolds an Android & iOS app, installs compatible starter packages, and can configure **Firebase**, **FCM push notifications**, **app icons**, and **splash screens**—then prints a clear report of every change.

Inspired by the developer experience of tools like `create-vite` and `create-expo-app`, focused on **bare React Native** (Community CLI), not Expo managed workflow.

## Table of contents

- [Features](#features)
- [Why use this package?](#why-use-this-package)
- [Comparison with manual React Native setup](#comparison-with-manual-react-native-setup)
- [Installation](#installation)
- [Usage](#usage)
- [Interactive CLI walkthrough](#interactive-cli-walkthrough)
- [Screenshots & GIFs](#screenshots--gifs)
- [Generated folder structure](#generated-folder-structure)
- [Supported React Native versions](#supported-react-native-versions)
- [Firebase setup](#firebase-setup)
- [Push notifications](#push-notifications)
- [Splash screen](#splash-screen)
- [App icon generation](#app-icon-generation)
- [Supported platforms](#supported-platforms)
- [Requirements](#requirements)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

## Features

- **Create React Native App** experience via `npx`
- **Bare React Native** Android & iOS scaffold (`@react-native-community/cli`)
- Optional **React Native starter** package groups (navigation, animation, camera, Firebase, …)
- Compatible **stable version resolution** (no hardcoded peer versions)
- **React Native Firebase** config copy + Gradle / AppDelegate wiring
- **FCM / push notifications** (`@react-native-firebase/messaging`, Notifee)
- Native **app icon** generation (Android mipmaps + iOS AppIcon)
- **Splash screen** via BootSplash, `react-native-splash-screen`, or native assets
- Idempotent Babel / entry / permissions / Info.plist steps
- Interactive **or** fully non-interactive (`--yes`)

## Why use this package?

Blank `npx @react-native-community/cli init` is a great starting point—but teams still re-do Firebase, FCM, icons, splash, and peer-compatible installs on every project.

**create-react-native-setup** is a **React Native bootstrap / project generator** that keeps bare RN ownership while removing repetitive setup.

## Comparison with manual React Native setup

| Task | Manual bare RN | create-react-native-setup |
|------|----------------|---------------------------|
| Create app | Community CLI init | Same foundation + guided extras |
| Pick libraries | Search, trial, peer conflicts | Catalog groups + compatible resolve |
| Firebase | Hand-edit Gradle / AppDelegate | Optional automated wiring |
| Push / FCM | Permissions + bootstrap by hand | messaging / Notifee options |
| App icon | Multiple densities / Xcode slots | One image → generated assets |
| Splash | Native themes / BootSplash CLI | Package choice + auto native wire |
| Visibility | Guess what changed | Terminal report + JSON |

## Installation

Prefer **npx** (no global install):

```bash
npx create-react-native-setup MyApp
```

Optional global install:

```bash
npm install -g create-react-native-setup
create-react-native-setup MyApp
```

> `npm install create-react-native-setup` **only installs the CLI**. It does **not** create a project. Always invoke the binary.

## Usage

```bash
npx create-react-native-setup [projectName] [options]
```

| Option | Description |
|--------|-------------|
| `--yes`, `-y`, `--default` | Accept defaults; skip prompts |
| `--rn-version <ver>` | Pin React Native version |
| `--icon <file>` | Source image for app icons |
| `--splash <file>` | Source image for splash / BootSplash |
| `--splash-package <id>` | `bootsplash` \| `splash-screen` \| `native` |
| `--google-services <file>` | Android `google-services.json` |
| `--google-service-info <file>` | iOS `GoogleService-Info.plist` |
| `--notifications <list>` | `messaging`, `notifee`, or `none` |
| `--config <file>` | Custom package catalog |
| `--dry-run` | Plan only; no create/install |
| `--help`, `-h` | Help |

## Interactive CLI walkthrough

When you run without `--yes`:

1. **Project name**  
2. **React Native version** (blank = latest stable)  
3. **Package groups** (Navigation, Animation, Camera, Firebase, …)  
4. **Notifications** multi-select (if enabled)  
5. **Firebase** config paths (if Firebase / messaging is in play)  
6. **App icon?** → path  
7. **Splash screen?** → package + path + background  
8. Automatic create → install → native setup → report  

## Screenshots & GIFs

> Add media under `docs/assets/` after capture.

```text
docs/assets/cli-walkthrough.gif      # interactive prompts
docs/assets/report.png               # final report
docs/assets/android-splash.png       # cold start splash
docs/assets/app-icon.png             # generated icon
```

<!-- ![CLI walkthrough](docs/assets/cli-walkthrough.gif) -->
<!-- ![Setup report](docs/assets/report.png) -->

## Generated folder structure

```text
MyApp/
├── android/          # Bare React Native Android
├── ios/              # Bare React Native iOS
├── src/              # Optional helpers (e.g. notifications)
├── App.tsx
├── index.js
├── package.json
├── babel.config.js
└── create-react-native-setup-report.json
```

## Supported React Native versions

- Default: **latest stable** React Native  
- Pin with `--rn-version` (e.g. `0.81.6`, `0.86.2`)  
- Validated against recent Community CLI templates (~**0.81–0.86**)  
- Requires **Node.js 18+**

## Firebase setup

See **[docs/Firebase.md](./docs/Firebase.md)**.

Copies `google-services.json` / `GoogleService-Info.plist`, wires Google Services Gradle and iOS `FirebaseApp.configure()`.

## Push notifications

See **[docs/PushNotifications.md](./docs/PushNotifications.md)**.

Optional `@react-native-firebase/messaging` (FCM) and/or `@notifee/react-native`, Android `POST_NOTIFICATIONS`, iOS background modes, and a JS bootstrap file.

## Splash screen

See **[docs/SplashScreen.md](./docs/SplashScreen.md)**.

- `react-native-bootsplash` (recommended) — auto `BootTheme`, Manifest, MainActivity, AppDelegate  
- `react-native-splash-screen`  
- Native assets only  

## App icon generation

See **[docs/Icons.md](./docs/Icons.md)**.

One image → Android launcher densities + iOS `AppIcon.appiconset`.

## Supported platforms

| Platform | Support |
|----------|---------|
| Android | Yes (bare RN) |
| iOS | Yes (macOS for pods / device) |
| Expo managed | No — use Expo tooling instead |
| Web | No |

## Requirements

- Node.js **18+**  
- npm registry access  
- Android SDK for `run-android` (`ANDROID_HOME`)  
- macOS + CocoaPods for iOS  

## Examples

```bash
# React Native starter — interactive
npx create-react-native-setup

# React Native boilerplate defaults
npx create-react-native-setup ShopApp --yes

# React Native Firebase + FCM
npx create-react-native-setup ShopApp --yes \
  --notifications messaging,notifee \
  --google-services ./google-services.json \
  --google-service-info ./GoogleService-Info.plist

# Splash screen + app icon
npx create-react-native-setup ShopApp --yes \
  --icon ./brand/icon.png \
  --splash ./brand/splash.png \
  --splash-package bootsplash

# Dry-run (CI-friendly)
npx create-react-native-setup ShopApp --yes --dry-run
```

**Before:** blank Community CLI app + hours of wiring.  
**After:** report listing installed packages, native steps, and remaining manual actions (e.g. APNs).

## Troubleshooting

See **[docs/Troubleshooting.md](./docs/Troubleshooting.md)** for Android SDK, BootTheme, pods, and npm auth issues.

## FAQ

See **[docs/FAQ.md](./docs/FAQ.md)**.

## Documentation

| Guide | Path |
|-------|------|
| Installation | [docs/Installation.md](./docs/Installation.md) |
| Configuration | [docs/Configuration.md](./docs/Configuration.md) |
| Examples | [docs/Examples.md](./docs/Examples.md) |
| Firebase | [docs/Firebase.md](./docs/Firebase.md) |
| Push notifications | [docs/PushNotifications.md](./docs/PushNotifications.md) |
| Icons | [docs/Icons.md](./docs/Icons.md) |
| Splash screen | [docs/SplashScreen.md](./docs/SplashScreen.md) |
| FAQ | [docs/FAQ.md](./docs/FAQ.md) |
| Troubleshooting | [docs/Troubleshooting.md](./docs/Troubleshooting.md) |
| Migration | [docs/Migration.md](./docs/Migration.md) |

## Contributing

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** and **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)**.

```bash
git clone https://github.com/Sainidinesh123/create-react-native-setup.git
cd create-react-native-setup
npm install
npm test
```

## Roadmap

- [ ] First-class TypeScript template flags docs  
- [ ] Demo GIF + social preview assets in-repo  
- [ ] Optional CI workflow badge for GitHub Actions  
- [ ] Gallery of generated report screenshots  
- [ ] More catalog groups requested by the community  

Security reports: **[SECURITY.md](./SECURITY.md)** · Support: **[SUPPORT.md](./SUPPORT.md)**

## License

[MIT](./LICENSE) © [Sainidinesh123](https://github.com/Sainidinesh123)

---

**npm:** https://www.npmjs.com/package/create-react-native-setup  
**Changelog:** [CHANGELOG.md](./CHANGELOG.md)
