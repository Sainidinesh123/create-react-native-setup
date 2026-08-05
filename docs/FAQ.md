# FAQ

## Is this Expo or bare React Native?

**Bare React Native** (Community CLI). It is not an Expo managed template. If you want Expo, use `create-expo-app`.

## Does `npm install create-react-native-setup` create my app?

No. That only installs the CLI package. Use:

```bash
npx create-react-native-setup MyApp
```

## Which React Native versions are supported?

Latest stable by default. Pin with `--rn-version`. Validated against recent Community CLI templates (roughly 0.81–0.86). Requires Node 18+.

## Can I skip all prompts?

Yes:

```bash
npx create-react-native-setup MyApp --yes
```

## Does the tool install Firebase for every app?

No. Firebase packages and config wiring run only when you select Firebase-related groups or pass Firebase / notification flags.

## Will splash / BootSplash break my Android build?

BootSplash wiring creates `BootTheme`, colors, drawables, Manifest theme, and MainActivity init. Prefer `--splash-package bootsplash` with a valid splash image. See [SplashScreen.md](./SplashScreen.md) and [Troubleshooting.md](./Troubleshooting.md).

## Where is the setup report?

In the project root as `create-react-native-setup-report.json`, plus a human-readable terminal report.

## Can I use this in CI?

Yes — use `--yes` and optionally `--dry-run` to validate the plan without creating a project.

## How do I contribute?

See [CONTRIBUTING.md](../CONTRIBUTING.md).
