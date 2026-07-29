# create-rn-setup

Single-command CLI that creates a bare React Native project and optionally installs commonly used packages with **compatible stable versions**, automated post-install setup, and a detailed report.

## Requirements

- Node.js 18+
- Network access (npm registry)
- For iOS pods: macOS with CocoaPods

## Install / run

### From this folder (development)

```bash
cd /home/dinesh/Desktop/NewProject/create-rn-setup
npm install
node bin/create-rn-setup.js MyApp
```

### After publishing to npm

```bash
npx create-rn-setup MyApp
# or
npm i -g create-rn-setup
create-rn-setup MyApp
```

## Usage

```bash
npx create-rn-setup [projectName] [options]
```

| Option | Description |
|--------|-------------|
| `--yes`, `-y`, `--default` | Install all default catalog packages without prompts |
| `--config <file>` | Use a custom package catalog JSON |
| `--dry-run` | Resolve and print the plan without creating files or installing |
| `--help`, `-h` | Show help |

### Examples

```bash
# Interactive: asks for name (if omitted) and Yes/No per package group
npx create-rn-setup

# Non-interactive defaults
npx create-rn-setup MyApp --yes

# Preview only
npx create-rn-setup MyApp --yes --dry-run

# Custom catalog
npx create-rn-setup MyApp --config ./my-catalog.json
```

The CLI creates the project in the **current working directory**. You only answer prompts; installs, config edits, and `pod install` (on macOS) run automatically.

## What it does

1. Prompts for project name
2. Creates latest stable React Native app via `@react-native-community/cli`
3. Asks Yes/No for package **groups** (Navigation, Animation, Camera, …)
4. Resolves the latest **compatible stable** npm version for each package (no hardcoded versions)
5. Installs with the detected package manager
6. Applies idempotent setup (Babel plugin, entry import, Android permissions, Info.plist, pods)
7. Prints a report and writes `create-rn-setup-report.json` in the new project

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
npx create-rn-setup MyApp
```

## Tests

```bash
npm test
```

## License

MIT
