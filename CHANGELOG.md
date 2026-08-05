# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.2.5] - 2026-08-04

### Fixed
- **BootSplash Android/iOS auto-configuration** so choosing `react-native-bootsplash` no longer leaves builds failing with unresolved `BootTheme`.
- Always ensure `styles.xml` defines `BootTheme` with parent **`Theme.BootSplash`** (v7+; rewrites obsolete `Theme.BootSplash.EdgeToEdge`).
- Set MainActivity `android:theme="@style/BootTheme"` in `AndroidManifest.xml`.
- Wire `RNBootSplash.init(this, R.style.BootTheme)` in `MainActivity` and `RNBootSplash.initWithStoryboard` on iOS AppDelegate when possible.
- Generate `bootsplash_background` / logo drawables as a fallback when the official generate CLI fails.

### Added
- Unit tests for BootSplash native wiring (`test/bootsplash.test.js`).

### Changed
- README: clearer BootSplash auto-wire behavior for bare React Native setups.

## [1.2.4] - 2026-08-03

### Changed
- Prompt order: React Native version and package selection before icon/splash.
- Restore yes/no confirmation before collecting branding image paths.
- Green bold labels for interactive prompts.

## [1.2.3] - 2026-08-03

### Added
- Splash package choice (`bootsplash` / `splash-screen` / `native`).
- `--splash-package` CLI flag and official BootSplash generate integration.

## [1.2.2] - 2026-08-03

### Changed
- npm / README SEO metadata and packaging allowlist improvements.

## [1.2.1] - 2026-07-31

### Fixed
- Vision Camera nitro peers; keep Sentry out of the camera group.

[1.2.5]: https://github.com/Sainidinesh123/create-react-native-setup/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/Sainidinesh123/create-react-native-setup/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/Sainidinesh123/create-react-native-setup/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/Sainidinesh123/create-react-native-setup/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/Sainidinesh123/create-react-native-setup/releases/tag/v1.2.1
