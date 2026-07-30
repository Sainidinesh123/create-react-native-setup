# App Icon & Splash Screen Branding

**Date:** 2026-07-30  
**Status:** Approved for planning  
**Package:** `create-react-native-setup`

## Goal

Add optional app icon and splash screen setup to the CLI. The user can opt in via Yes/No prompts (or CLI flags), provide image paths, and the tool configures **native Android and iOS assets only** using `sharp` — no splash/icon npm packages installed into the generated app.

## Decisions

| Topic | Choice |
|-------|--------|
| Architecture | Dedicated `src/branding/` module (not catalog-driven) |
| Icon | Native launcher assets generated with `sharp` |
| Splash | Native Android/iOS splash assets + theme/LaunchScreen wiring with `sharp` |
| Libraries in app | **None** — do not install `react-native-splash-screen` or similar |
| Prompts | Separate Yes/No for icon and splash; ask path only if yes |
| `--yes` | Skip branding prompts; honor `--icon` / `--splash` if provided |
| Flags in interactive mode | Pre-fill / skip matching prompt when path already provided |

## UX & pipeline

Order in `run.js`:

1. Project name  
2. Package group selection  
3. Create RN project  
4. Resolve + install catalog packages  
5. **Branding** (new)  
6. Existing catalog setup steps  
7. Report  

### Interactive

1. `Set app icon? (y/N)` → if yes, prompt for image path and **re-ask until the path is valid** (skip only by answering `n` on the Yes/No).  
2. `Set splash screen? (y/N)` → same for splash image path.

### Non-interactive (`--yes`)

- No branding prompts.  
- Apply icon if `--icon <path>` present.  
- Apply splash if `--splash <path>` present.  
- Otherwise skip that branding step.

### Flags

- `--icon <path>`  
- `--splash <path>`  

Invalid flag paths throw early (before project create when possible; if only validated at branding time, throw before writing assets and record failure — **prefer validate immediately after parse / before create** so users don’t wait for a full RN scaffold).

Allowed extensions: `.png`, `.jpg`, `.jpeg`, `.webp`. Path must exist and be a file.

## Architecture

```
src/branding/
  index.js          # collectBrandingOptions + applyBranding → report entries
  prompt.js         # Yes/No + path prompts
  validateImage.js  # exists + extension checks
  applyIcon.js      # Android mipmaps + iOS AppIcon.appiconset
  applySplash.js    # Android drawables/theme + iOS LaunchScreen assets
```

### `collectBrandingOptions({ yes, iconPath, splashPath, ask })`

Returns `{ iconPath?: string, splashPath?: string }` after prompts/flags.

### `applyBranding(projectPath, options, { dryRun })`

Runs applyIcon / applySplash as needed. Returns an array of setup-like results:

```js
{ packageId: 'branding', type: 'appIcon' | 'splashScreen', status, detail, manualAction? }
```

Merged into the final report’s `setup` array. No catalog package install for branding.

### CLI (`cliArgs.js` / help / README)

Document `--icon` and `--splash`.

### Dependency

Add `sharp` as a **dependency of create-react-native-setup** (the CLI tool), not of the generated app.

## Icon behavior (`applyIcon.js`)

- Input: source image path + `projectPath`.  
- Android: write `ic_launcher.png` and `ic_launcher_round.png` into `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}` at standard sizes (48 / 72 / 96 / 144 / 192). Overwrite existing files idempotently.  
- Adaptive icon XML (`ic_launcher.xml`) left as-is if present; if only legacy mipmaps exist, updating PNGs is enough for default RN templates.  
- iOS: locate `Images.xcassets/AppIcon.appiconset`, generate required PNG sizes from `Contents.json` (or a fixed known set matching current RN template), overwrite images referenced there.  
- Dry-run: log target paths/sizes; no writes.

## Splash behavior (`applySplash.js`)

Native-assets-only:

- **Android**
  - Generate density drawables (e.g. `drawable-mdpi` … `drawable-xxxhdpi`) named `splash` (or `launch_screen`) from the source image.  
  - Ensure launch theme uses that drawable as `windowBackground` (edit `styles.xml` / create a splash theme if missing; point `AndroidManifest` application/activity theme at it when needed).  
- **iOS**
  - Place splash image asset into the asset catalog or LaunchScreen resources.  
  - Update `LaunchScreen.storyboard` (or equivalent) to show the image (centered or full-bleed) with a solid default background color.  
- No JS changes required (system splash until first React frame).  
- Dry-run: log planned files and theme/storyboard edits; no writes.

Exact file paths should follow the default bare RN template layout; if a path is missing, return `status: 'failed'` with a clear detail (do not crash the whole CLI).

## Error handling

| Case | Behavior |
|------|----------|
| Interactive invalid path | Re-prompt with error message |
| Flag invalid path | Throw early with clear error |
| Missing native dirs after create | Branding step `failed` in report; continue bootstrap |
| `sharp` failure | Branding step `failed`; continue |
| Dry-run | Always `skipped` with “would …” detail |

Branding failures do **not** abort package setup or the final report.

## Testing

- `validateImage` unit tests (missing file, bad extension, good path).  
- `parseArgs` tests for `--icon` / `--splash`.  
- Temp-dir tests: fixture PNG → `applyIcon` / `applySplash` write expected relative paths (minimal fake `android/` + `ios/` tree; no full `init`).  
- Prompt tests with injected `ask` mocks for Yes/No + path collection under `--yes` vs interactive.

## Out of scope

- Installing or configuring `react-native-splash-screen` / Bootsplash.  
- Adaptive-icon foreground/background layer designer UI.  
- Custom splash background color / resize mode CLI options (use sensible defaults; can be added later).  
- Windows/macOS desktop targets.

## Success criteria

- User can opt into icon and/or splash independently and supply image paths.  
- `--yes --icon ./a.png --splash ./b.png` configures both without prompts.  
- Generated Android/iOS projects show the custom icon and native splash without extra app dependencies.  
- Report lists branding steps; dry-run never writes assets.
