# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.3.0] - 2026-09-12

### Changed & Dependencies

- Bumped package version to `1.3.0` for npm distribution.
- Upgraded `sharp` dependency to `^0.35.4`.

### Documentation

- Expanded README (SEO, TOC, comparison, placeholders for screenshots/GIFs)
- Added docs site under `docs/` (Installation, FAQ, Troubleshooting, Firebase, Push, Icons, Splash, Migration, Configuration, Examples)
- Added CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, SUPPORT, PR and issue templates polish

## [1.2.6] - 2026-08-05

### Documentation

- npm / GitHub SEO metadata, badges, keywords, FAQ and troubleshooting sections

## [1.2.5] - 2026-08-05

### Fixed

- BootSplash Android: always create `BootTheme` in `styles.xml`, wire colors and logo drawables, Manifest theme, MainActivity / iOS AppDelegate init
- Prefer parent `Theme.BootSplash` (compatible with bootsplash v7; avoids broken `Theme.BootSplash.EdgeToEdge`)

## [1.2.4] - 2026-08

### Added / Improved

- Splash package choice (`bootsplash` / `splash-screen` / `native`)
- Prompt and CLI UX refinements

## [1.2.0] – [1.2.3]

Firebase, notifications, branding, catalog resolution, and related fixes. See git history for granular commits.

[Unreleased]: https://github.com/Sainidinesh123/create-react-native-setup/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/Sainidinesh123/create-react-native-setup/releases/tag/v1.3.0
[1.2.6]: https://github.com/Sainidinesh123/create-react-native-setup/releases/tag/v1.2.6
[1.2.5]: https://github.com/Sainidinesh123/create-react-native-setup/releases/tag/v1.2.5
[1.2.4]: https://github.com/Sainidinesh123/create-react-native-setup/releases/tag/v1.2.4
