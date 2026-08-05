# Migration

## From Community CLI only

If you already have a bare RN app from `@react-native-community/cli init`:

1. **Preferred:** generate a fresh app with `create-react-native-setup` and move your JS / business code over.  
2. Alternatively, apply Firebase / icons / splash **manually** using the same patterns described in the docs — this CLI is intended as a **generator**, not an in-place migrator for arbitrary existing trees.

## From Expo managed

This tool does **not** convert Expo managed projects to bare. Eject / prebuild with Expo tooling first (or start bare), then use this generator for new apps.

## Upgrading create-react-native-setup

```bash
npx create-react-native-setup@latest MyNewApp --yes
```

Re-running against an existing folder is not supported (directory must not already exist). Use a new project name or move the old folder aside.

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version-to-version notes (e.g. BootSplash fixes in 1.2.5).
