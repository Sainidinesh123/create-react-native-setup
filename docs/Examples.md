# Examples

## Interactive React Native starter

```bash
npx create-react-native-setup
```

Answer prompts for name, RN version, packages, Firebase, icon, and splash.

## Defaults only (boilerplate)

```bash
npx create-react-native-setup ShopApp --yes
```

## Pin React Native version

```bash
npx create-react-native-setup ShopApp --yes --rn-version 0.81.6
```

## Firebase + FCM + Notifee

```bash
npx create-react-native-setup ShopApp --yes \
  --notifications messaging,notifee \
  --google-services ./google-services.json \
  --google-service-info ./GoogleService-Info.plist
```

## App icon + BootSplash

```bash
npx create-react-native-setup ShopApp --yes \
  --icon ./brand/icon.png \
  --splash ./brand/splash.png \
  --splash-package bootsplash
```

## Dry-run (CI / planning)

```bash
npx create-react-native-setup ShopApp --yes --dry-run
```

## Before / after

**Before (manual bare RN):**

```bash
npx @react-native-community/cli@latest init ShopApp
# then manually: pick libraries, edit Gradle, AppDelegate,
# generate icons/splash, FCM permissions, bootstrap JS …
```

**After (generator):**

```bash
npx create-react-native-setup ShopApp --yes \
  --icon ./brand/icon.png \
  --splash ./brand/splash.png \
  --splash-package bootsplash \
  --notifications messaging \
  --google-services ./google-services.json
```

You get a structured terminal report and `create-react-native-setup-report.json` listing what was installed and wired.

## Generated layout (typical)

```text
ShopApp/
├── android/
├── ios/
├── src/                    # helpers when notifications are enabled
├── App.tsx
├── index.js
├── package.json
├── babel.config.js
└── create-react-native-setup-report.json
```
