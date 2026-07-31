# Firebase Config Files & Notification Setup

**Date:** 2026-07-31  
**Status:** Approved for planning  
**Package:** `create-react-native-setup`

## Goal

When users opt into Firebase and/or Notifications during project bootstrap, the CLI copies Firebase config files to the correct native paths, wires Android/iOS Firebase build settings, lets them multi-select notification packages (`@react-native-firebase/messaging`, `@notifee/react-native`), installs compatible versions (including required peers such as `@react-native-firebase/app`), applies native + JS configuration, and leaves only truly external steps (APNs upload, Firebase Console) as manual actions in the report.

## Decisions

| Topic | Choice |
|-------|--------|
| Architecture | Dedicated `src/firebase/` + `src/notifications/` modules (Approach 1); catalog for package groups |
| Notification packages (v1) | `@react-native-firebase/messaging` and `@notifee/react-native` only |
| Group relationship | Separate Yes/No for Firebase and Notifications; if messaging is selected without Firebase app, auto-add `@react-native-firebase/app` |
| `--yes` | Skip Firebase/Notifications prompts; honor flags when provided |
| JS setup | Native config + generated `src/notifications.js` imported from `index.js` |
| Multi-select UX | Space toggle, Enter confirm; non-TTY fallback: Yes/No per package |

## UX & pipeline

Interactive order in `run.js` (after project name and RN version):

1. Existing package-group Yes/No prompts, including:
   - **Firebase?** → selects `firebase-app`
   - **Notifications?** → if yes, show multi-select for messaging / notifee
2. If Firebase selected (or Firebase config flags present): **Configure Firebase files?** (`y/N`)
   - If yes: prompt for Android `google-services.json` path and iOS `GoogleService-Info.plist` path
   - Re-ask until valid; blank skips that platform and records a report note
3. Branding prompts (existing)
4. Create RN project
5. Resolve + install packages (selected + auto `firebase-app` when messaging needs it; peer resolver already installs required peers)
6. Catalog setup steps
7. `applyFirebase` (copy configs + Gradle / iOS wiring)
8. `applyNotifications` (native + JS bootstrap)
9. Branding asset apply (existing)
10. Report

Example interactive fragment:

```text
Install Firebase packages? (y/N): y
Configure Firebase files? (y/N): y
Android google-services.json path: /path/to/google-services.json
iOS GoogleService-Info.plist path: /path/to/GoogleService-Info.plist
Install Notifications packages? (y/N): y
Select notification packages (Space = toggle, Enter = confirm):
◉ @react-native-firebase/messaging
◯ @notifee/react-native
```

### Flags (non-interactive / pre-fill)

| Flag | Meaning |
|------|---------|
| `--google-services <path>` | Android Firebase config; implies configure-files intent |
| `--google-service-info <path>` | iOS Firebase config |
| `--notifications messaging,notifee` | Comma-separated package ids (`messaging`, `notifee`) |

Invalid flag paths throw **before** project create. Under `--yes`, absent flags mean skip Firebase files and Notifications.

## Catalog changes

- Keep `firebase` group → `firebase-app` (`@react-native-firebase/app`).
- Add `notifications` group (`default: false`) with:
  - `firebase-messaging` → npm `@react-native-firebase/messaging`
  - `notifee` → npm `@notifee/react-native`
- Declarative setup on packages where possible (`androidPermission`, `infoPlist`, `docs`, `podInstall`).
- Complex Gradle / copy / JS generation stays in dedicated modules invoked from `run.js` (same pattern as branding).

## Architecture

```
src/firebase/
  validateConfig.js   # exists + expected basename / extension
  copyConfig.js       # android/app/google-services.json, ios/<App>/GoogleService-Info.plist
  applyAndroid.js     # Google Services Gradle classpath + app plugin
  applyIos.js         # plist placement; Xcode project reference when safe
  index.js            # collectFirebaseOptions + applyFirebase → report entries

src/notifications/
  multiSelect.js      # Space/Enter picker; Yes/No fallback
  applyMessaging.js   # FCM-related AndroidManifest / permissions / iOS background modes
  applyNotifee.js     # Notifee-specific native bits as required by current docs
  writeBootstrap.js   # src/notifications.js + index.js import (idempotent)
  index.js            # collectNotificationOptions + applyNotifications
```

### Collection APIs

- `collectFirebaseOptions({ yes, googleServicesPath, googleServiceInfoPath, firebaseSelected, ask })`  
  → `{ googleServicesPath?, googleServiceInfoPath? }`

- `collectNotificationOptions({ yes, notificationsFlag, notificationsGroupSelected, ask, multiSelect })`  
  → `{ packageIds: string[] }` (catalog ids: `firebase-messaging`, `notifee`)

- After collection, if `firebase-messaging` ∈ packageIds and `firebase-app` not in selected catalog packages → insert `firebase-app`.

### Apply APIs

Return setup-shaped results:

```js
{ packageId: 'firebase' | 'notifications', type: string, status, detail, manualAction? }
```

Merged into the final report `setup` array.

## Auto-configuration details

### Firebase Android

- Copy validated `google-services.json` → `android/app/google-services.json`.
- Ensure Google Services Gradle plugin is applied on the app module and classpath/plugin management matches the current RN template style (`build.gradle` / `settings.gradle` / Kotlin DSL as present).
- Idempotent: skip if already applied.

### Firebase iOS

- Copy validated `GoogleService-Info.plist` → `ios/<ProjectName>/GoogleService-Info.plist`.
- Prefer adding the file to the Xcode project when the project file can be edited safely; otherwise copy + `manualAction` to add to the app target in Xcode.
- Trigger / rely on existing `podInstall` when Firebase native modules are present (macOS).

### Messaging (`@react-native-firebase/messaging`)

- Android: permissions (including `POST_NOTIFICATIONS` where required), Manifest meta/services per current RN Firebase messaging docs.
- iOS: `UIBackgroundModes` include `remote-notification` in Info.plist when missing.
- JS: bootstrap requests permission / registers default handlers in `src/notifications.js`.

### Notifee (`@notifee/react-native`)

- Android channel creation in bootstrap; Manifest adjustments required by current Notifee docs.
- JS: initialize channel(s) from the same bootstrap module when selected.

### JavaScript bootstrap

- Create `src/notifications.js` (or `.ts` if the template is TS — detect `App.tsx` / `tsconfig` and match extension).
- Add a single top-level import from `index.js` / `index.tsx` (idempotent).
- Module contents depend on which packages were selected (messaging only, notifee only, or both).

## Error handling

| Case | Behavior |
|------|----------|
| Interactive invalid config path | Re-prompt with error |
| Flag invalid path | Throw early (before create) |
| Blank path for one platform | Skip that platform; report note |
| Missing `android/` or `ios/` | Step `failed`; continue bootstrap |
| Gradle/plist edit cannot locate anchor | Step `failed` or `manualAction`; continue |
| Dry-run | `skipped` with “would …” detail; no file writes |
| Non-TTY multi-select | Fall back to Yes/No per notification package |

Branding and other setup continue even if Firebase/notification steps fail.

## Manual-only leftovers (always report)

- Upload APNs key/certificate in Firebase Console.
- Enable Push Notifications capability in Xcode if automatic entitlement edit is unreliable.
- Any Firebase Console cloud messaging campaign / server key configuration.

## Testing

- Config path validation (wrong name, missing file, good paths).
- CLI flag parsing for `--google-services`, `--google-service-info`, `--notifications`.
- Multi-select pure logic (toggle/confirm) with injected key events or unit API.
- Copy destination paths on a fake project tree.
- Gradle plugin insert idempotency on fixture `build.gradle` / `settings.gradle`.
- Info.plist background mode idempotency.
- Bootstrap write + index import idempotency.
- Auto-add `firebase-app` when messaging selected without Firebase group.
- Dry-run returns skipped without writing.

## Out of scope (v1)

- Other RN Firebase modules (Analytics, Crashlytics, Auth, etc.) in the notification picker.
- `react-native-push-notification`.
- Fully automating APNs credential upload.
- Windows notification channels beyond Android/iOS mobile.

## Success criteria

- User can opt into Firebase files and/or notification packages with minimal prompts.
- `--yes --google-services ./a.json --google-service-info ./b.plist --notifications messaging,notifee` configures without prompts.
- Generated apps have configs in the correct native paths, Gradle/Info.plist wired, packages installed with compatible versions, and a working JS bootstrap import.
- Report lists Firebase/notification steps and remaining manual Console/APNs actions.
- Dry-run never writes configs or JS files.
