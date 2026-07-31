# Splash Package Choice Design

**Date:** 2026-07-31  
**Status:** Approved for planning  
**Package:** `create-react-native-setup`  
**Supersedes (splash only):** native-assets-only constraint in `2026-07-30-branding-icon-splash-design.md` — icon behavior is unchanged; splash gains an optional npm package path.

## Goal

When the user opts into a splash screen, the CLI asks which implementation to use, installs **only** the selected package (or none for native-assets-only), asks for a splash image, and fully configures Android + iOS + JS hide (when a package is used).

## Decisions

| Topic | Choice |
|-------|--------|
| Architecture | Keep under `src/branding/` (Approach 1) |
| Package choices | `react-native-bootsplash`, `react-native-splash-screen`, or **native assets only** (no npm package) |
| Install | Exactly one package when a library is chosen; never both; never install a splash package for native-only |
| Image | Always ask for (or require via `--splash`) a splash image path after the choice |
| BootSplash assets | Official CLI: `npx react-native-bootsplash generate <logo> …` |
| splash-screen assets | CLI-owned native generation (`sharp` + layout/theme/LaunchScreen), not BootSplash’s generator |
| JS | Idempotent `hide()` wiring in app entry / root for package modes only |
| Edits | Idempotent; never overwrite existing user hide/setup code if already present |
| `--yes` | Skip splash prompts unless `--splash <image>`; default package = `bootsplash` |
| Override | `--splash-package bootsplash \| splash-screen \| native` |
| Icon | Unchanged (native launcher assets only; no splash package coupling) |

## UX

### Interactive

1. `Set a custom splash screen? (y/N)` — unchanged Yes/No gate.  
2. If yes → **single-select** (TTY numbered/arrow picker, or Yes/No-style fallback):

   1. `react-native-bootsplash` (recommended)  
   2. `react-native-splash-screen`  
   3. Native assets only (no npm package)

3. Ask for splash image path; **re-ask until valid** (same validation as today: `.png` / `.jpg` / `.jpeg` / `.webp`, exists, is a file). Blank is not allowed once the user opted in.

### Non-interactive (`--yes`)

| Flags | Behavior |
|-------|----------|
| No `--splash` | Skip splash entirely |
| `--splash <image>` only | Use **bootsplash** + that image |
| `--splash <image> --splash-package splash-screen` | Use splash-screen + that image |
| `--splash <image> --splash-package native` | Native-assets-only + that image |
| `--splash-package` without `--splash` | Throw early: package flag requires `--splash` |
| Invalid `--splash-package` | Throw early (allowed: `bootsplash`, `splash-screen`, `native`) |

Interactive with `--splash` already set: skip the image prompt; still ask package choice unless `--splash-package` is set.  
Interactive with `--splash-package` set: skip package prompt; still ask image unless `--splash` is set.

### Flags (`cliArgs.js`)

- `--splash <file>` — existing; splash image  
- `--splash-package <id>` — new; `bootsplash` | `splash-screen` | `native`

Early validation: image path via existing branding asserts; package id via parseArgs.

## Pipeline order (`run.js`)

Collect branding (including splash package + path) **before** `closePrompts()`, same as today.

After project create / resolve / install of **catalog** packages:

1. If splash package is `bootsplash` or `splash-screen`, resolve + install **that single npm package** into the project (compatible version via existing `resolveCompatibleVersion` / `installPackages`).  
2. Run catalog `runSetupSteps` as today.  
3. Firebase / notifications (unchanged).  
4. Apply branding (icon + splash mode apply + JS hide when applicable).  

Splash package install **must** finish before BootSplash generate / package native apply.

Dry-run: no installs, no native writes, no generate CLI; report “would …” for splash package install and each apply step.

## Architecture

```
src/branding/
  index.js                 # collectBrandingOptions + applyBranding
  validateImage.js         # unchanged
  applyIcon.js             # unchanged
  applySplash.js           # native-assets-only path (existing)
  applyBootSplash.js       # NEW — generate CLI + MainActivity/AppDelegate + JS hide
  applySplashScreenPkg.js  # NEW — assets + MainActivity/AppDelegate + JS hide
  splashPackage.js         # NEW — ids, labels, single-select helper, flag map
  wireSplashHide.js        # NEW — idempotent entry/App hide() injection
```

### `collectBrandingOptions` return shape

```js
{
  iconPath?: string,
  splashPath?: string,
  splashPackage?: 'bootsplash' | 'splash-screen' | 'native',
}
```

- `splashPath` set iff splash is opted in (prompt, flag, or `--yes`+`--splash`).  
- `splashPackage` set whenever `splashPath` is set (default `bootsplash` under `--yes`).  
- Native-only: `splashPackage: 'native'` and no splash npm install.

### `applyBranding`

| `splashPackage` | Action |
|-----------------|--------|
| `native` | Existing `applySplash` only; **no** JS hide |
| `bootsplash` | `applyBootSplash` (assumes package already installed) |
| `splash-screen` | `applySplashScreenPkg` |

Each returns setup-like results merged into the report (`packageId: 'branding'`, distinct `type`s).

## Mode details

### A. Native assets only (`native`)

Keep current `applySplash.js` behavior:

- Android density drawables + `windowBackground`  
- iOS `Splash.imageset` + `LaunchScreen.storyboard`  
- No npm package, no JS hide  

### B. `react-native-bootsplash`

1. Install `react-native-bootsplash` only.  
2. Run official generator from project cwd (non-dry-run), e.g.:

   ```bash
   npx react-native-bootsplash generate <absoluteLogoPath> \
     --platforms=android,ios \
     --background=#ffffff \
     --logo-width=100
   ```

   Prefer invoking the package’s local bin after install when available. Capture stdout/stderr; on non-zero exit → branding step `failed` with detail; do not abort the whole CLI.  
3. Ensure Android `MainActivity` calls `RNBootSplash.init(...)` before `super.onCreate` (Kotlin/Java templates); skip if already present.  
4. Ensure iOS `AppDelegate` initializes BootSplash per current library docs for the RN template in use; skip if already present.  
5. Pod install remains via existing catalog/pod mechanisms when applicable, or report manualAction if pods were not run.  
6. JS: idempotent `BootSplash.hide({ fade: true })` (or current recommended API) in `App.tsx`/`App.js` `useEffect`, or entry if App is unsuitable — **prefer App root**; if hide import already exists, status `already-applied`.

Manual actions only when unsafe to automate (e.g. Xcode storyboard target membership if generator did not add it).

### C. `react-native-splash-screen`

1. Install `react-native-splash-screen` only.  
2. Assets (CLI-owned, `sharp`):
   - Android: `res/layout/launch_screen.xml` + drawable splash image(s); theme / styles as required by the library docs for current RN.  
   - iOS: update LaunchScreen / assets similarly to today’s native splash (image visible at launch).  
3. Android: `SplashScreen.show(this)` (or documented Kotlin equivalent) in `MainActivity.onCreate` before `super.onCreate`; idempotent.  
4. iOS: `RNSplashScreen` show in AppDelegate per docs; idempotent.  
5. JS: idempotent `SplashScreen.hide()` in App root; do not duplicate if already present.

Do **not** run BootSplash’s generator for this mode.

## Idempotency & no overwrite

- String/presence checks before inserting imports, `init`/`show`, or `hide()`.  
- If a file already contains the library’s hide/init call → `already-applied`.  
- Do not rewrite unrelated App/entry content.  
- Do not replace a user-customized LaunchScreen wholesale when only a package init is missing — prefer minimal edits; BootSplash generate may rewrite splash storyboard/drawables (acceptable for that mode; document in report detail).  
- Re-running the CLI on an existing project is out of primary scope (tool creates new apps); still keep edits safe if re-applied in tests.

## Error handling

| Case | Behavior |
|------|----------|
| Invalid image (interactive) | Re-ask |
| Invalid image / package flag | Throw early before create |
| Splash package resolve/install fails | Report failure; skip that mode’s native/JS apply |
| BootSplash generate fails | `failed` result; skip further BootSplash native tweaks that depend on generated assets when appropriate |
| Platform missing (no android/ or ios/) | Per-platform isolation: fail/skip that platform, continue the other |
| Dry-run | No install, no generate, no writes |

## Testing

- `parseArgs`: `--splash-package` valid/invalid; requires pairing rules with `--splash` enforced in collect/assert layer as specified.  
- `collectBrandingOptions`: interactive package + path; `--yes` defaults; flag overrides.  
- `applyBootSplash` / `applySplashScreenPkg`: fixture native trees; idempotent second run; dry-run no writes.  
- `wireSplashHide`: adds once; leaves existing hide alone.  
- Ensure selecting bootsplash never installs splash-screen and vice versa.  
- Native mode never resolves either package.

## Out of scope

- Dark mode / brand image / BootSplash license-key features.  
- Custom background color / logo-width CLI flags (sensible defaults only; can add later).  
- Expo / config-plugin path.  
- Changing app icon behavior.  
- Removing the Analytics/Sentry catalog group (unrelated).

## Success criteria

- User can choose BootSplash, splash-screen, or native-only after opting into splash.  
- Only the chosen package is installed (or none for native).  
- `--yes --splash ./logo.png` configures BootSplash end-to-end without prompts.  
- `--splash-package` overrides the default.  
- Android + iOS configured; JS `hide()` present for package modes.  
- All branding/splash edits idempotent; existing hide/init not overwritten.  
- Report lists splash package install + apply steps; dry-run writes nothing.
