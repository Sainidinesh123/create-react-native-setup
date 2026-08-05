# Troubleshooting

## `npx` runs an old version

Clear the npx cache or pin the version:

```bash
npx create-react-native-setup@latest MyApp
npm cache clean --force
```

## Android: `ANDROID_HOME` / SDK not found

Install Android Studio, set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) to your SDK path, and ensure `platform-tools` is on `PATH`.

## Android: `Unresolved reference 'BootTheme'`

Your splash package is BootSplash but `styles.xml` lacked `BootTheme`. Upgrade to **create-react-native-setup ≥ 1.2.5**, or re-run branding with a splash image so the CLI wires the theme.

## Android: AAPT / `Theme.BootSplash.EdgeToEdge` not found

BootSplash v7 removed that parent. Prefer parent `Theme.BootSplash`. Recent CLI releases normalize this automatically.

## iOS: CocoaPods / pod install fails

On macOS, from the app’s `ios/` folder:

```bash
pod install
```

Ensure Ruby/CocoaPods and the Xcode command-line tools are installed.

## npm `E401` / `E404` when publishing or installing

Log in with the correct npm user (`npm login`), confirm package ownership for publishes, and check the package name spelling.

## Firebase config not applied

Confirm paths to `google-services.json` and/or `GoogleService-Info.plist`, and that Firebase or messaging was enabled in prompts / flags. See [Firebase.md](./Firebase.md).

## Project directory already exists

Choose a new name or remove/rename the existing folder. The CLI will not overwrite an existing project directory.

## Still stuck?

Open a [bug report](../.github/ISSUE_TEMPLATE/bug_report.md) with version, OS, command, and logs / report JSON.
