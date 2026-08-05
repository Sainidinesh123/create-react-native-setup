# Configuration

## CLI options

| Option | Description |
|--------|-------------|
| `--yes`, `-y`, `--default` | Skip prompts; use defaults |
| `--rn-version <ver>` | Pin React Native version |
| `--icon <file>` | App icon source image |
| `--splash <file>` | Splash / BootSplash source image |
| `--splash-package <id>` | `bootsplash` \| `splash-screen` \| `native` |
| `--google-services <file>` | Android Firebase config |
| `--google-service-info <file>` | iOS Firebase config |
| `--notifications <list>` | `messaging`, `notifee`, `none` (comma-separated) |
| `--config <file>` | Custom package catalog JSON |
| `--dry-run` | Plan only; do not create or install |
| `--help`, `-h` | Show help |

## Custom catalog

Pass `--config path/to/catalog.json` to override the default package groups (same shape as `catalogs/default.json` in this repo).

## Output report

Every successful run writes:

- Terminal summary  
- `create-react-native-setup-report.json` in the project root  

## Environment

- `ANDROID_HOME` / `ANDROID_SDK_ROOT` for Android builds  
- Node **≥ 18** (see `engines` in `package.json`)

## Related

- [Examples.md](./Examples.md)
- [Installation.md](./Installation.md)
