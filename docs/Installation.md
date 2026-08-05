# Installation

## Quick start (recommended)

```bash
npx create-react-native-setup MyApp
```

No global install required. npm downloads the latest published CLI and runs it.

## Global install

```bash
npm install -g create-react-native-setup
create-react-native-setup MyApp
```

## Local install (wrong expectation)

```bash
npm install create-react-native-setup
```

This only adds the package to `node_modules`. It does **not** create a React Native project. Invoke the binary:

```bash
npx create-react-native-setup MyApp
# or
./node_modules/.bin/create-react-native-setup MyApp
```

## Requirements

- **Node.js 18+** (`node -v`)
- Network access to the npm registry
- For running the generated Android app: Android SDK / `ANDROID_HOME`
- For iOS: macOS, Xcode, CocoaPods

## Verify the CLI

```bash
npx create-react-native-setup --help
npm view create-react-native-setup version
```

## Next steps

- [Configuration](./Configuration.md)
- [Examples](./Examples.md)
- [Troubleshooting](./Troubleshooting.md)
