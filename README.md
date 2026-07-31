# create-react-native-setup

Single-command CLI that creates a bare React Native project and optionally installs commonly used packages with **compatible stable versions**, automated post-install setup, and a detailed report.

## Requirements

- Node.js 18+
- Network access (npm registry)
- For iOS pods: macOS with CocoaPods

## Install / run

### From this folder (development)

```bash
cd Desktop/NewProject/create-rn-setup
npm install
node bin/create-react-native-setup.js MyApp
```

### From npm

```bash
npx create-react-native-setup MyApp
# or
npm i -g create-react-native-setup
create-react-native-setup MyApp
```

> **`npm i create-react-native-setup` does not create a project.** It only downloads
> this CLI into `node_modules`, which is why you see `up to date, audited N packages`
> and no new app folder. Use `npx create-react-native-setup MyApp` to scaffold, or
> install globally with `-g` so the `create-react-native-setup` command is on your PATH.

## Usage

```bash
npx create-react-native-setup [projectName] [options]
```

| Option | Description |
|--------|-------------|
| `--yes`, `-y`, `--default` | Accept defaults and skip every prompt |
| `--rn-version <ver>` | React Native version to create (default: latest stable) |
| `--icon <file>` | Image used to generate native app icons |
| `--splash <file>` | Image used to generate the native splash screen |
| `--google-services <file>` | `google-services.json` for Android Firebase |
| `--google-service-info <file>` | `GoogleService-Info.plist` for iOS Firebase |
| `--notifications <list>` | Notification packages: `messaging`, `notifee` (or `none`) |
| `--config <file>` | Use a custom package catalog JSON |
| `--dry-run` | Resolve and print the plan without creating files or installing |
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

# Notifications + Firebase configs without prompts
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

## What it does

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
12. Asks for an app icon and splash image, then generates the native assets
13. Prints a report and writes `create-react-native-setup-report.json` in the new project

Passing `--rn-version`, `--icon`, `--splash`, `--google-services`, `--google-service-info`, or `--notifications` skips the matching prompt; `--yes` skips all of them.

## Firebase and notifications

**Firebase config files** — copies `google-services.json` to `android/app/` and `GoogleService-Info.plist` to `ios/<App>/`, adds the Google Services Gradle plugin, and calls `FirebaseApp.configure()` from the iOS AppDelegate. Xcode target membership for the plist is reported as a manual step when it cannot be automated safely.

**Notifications** — installs `@react-native-firebase/messaging` and/or `@notifee/react-native`, ensures `POST_NOTIFICATIONS`, merges `UIBackgroundModes` (`remote-notification`), writes `src/notifications.js` (or `.ts`) without overwriting an existing file, and imports it from the app entry.

**Still manual:** upload an APNs auth key to Firebase Console → Cloud Messaging, and enable Push Notifications in Xcode / the Apple Developer portal.

## App icon and splash screen

Both are generated as **native assets only** — no splash or icon library is added to your app.

**App icon** — resizes your image into every Android launcher density
(`mipmap-mdpi` … `mipmap-xxxhdpi`, including `ic_launcher_round.png`) and every slot in the
iOS `AppIcon.appiconset`, writing the `filename` entries into `Contents.json` so Xcode picks
them up.

**Splash screen** — writes `splash_image.png` into each Android `drawable-*dpi` folder, adds a
`drawable/splash.xml` layer-list, and points `AppTheme`'s `android:windowBackground` at it. On
iOS it creates `Splash.imageset` and a `LaunchScreen.storyboard` that centers the image.

Because the splash is drawn by the OS before the first React frame, no `SplashScreen.hide()`
call is needed.

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

## Publish to npm

```bash
npm login
npm publish
```

Then anyone can run:

```bash
npx create-react-native-setup MyApp
```

## Tests

```bash
npm test
```

## License

MIT
