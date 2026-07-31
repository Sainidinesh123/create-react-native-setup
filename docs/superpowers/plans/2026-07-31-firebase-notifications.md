# Firebase Config & Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase config-file copy/wiring and a Notifications multi-select flow (`messaging` + `notifee`) with native + JS bootstrap, flags under `--yes`, idempotent edits, and per-platform failure isolation.

**Architecture:** Catalog groups for Firebase/Notifications packages; dedicated `src/firebase/` and `src/notifications/` modules (same pattern as branding) for prompts, copies, Gradle/Info.plist/Manifest edits, and `src/notifications` bootstrap. Wired from `run.js` after install and catalog setup.

**Tech Stack:** Node 18+ ESM, `node:test`, existing readline prompt queue, raw-mode multi-select (TTY) with Yes/No fallback.

## Global Constraints

- v1 notification packages only: `@react-native-firebase/messaging` and `@notifee/react-native`.
- Selecting messaging auto-adds `@react-native-firebase/app` if missing.
- `--yes` skips Firebase/Notifications prompts; honor `--google-services`, `--google-service-info`, `--notifications`.
- Paths: `google-services.json` → `android/app/google-services.json`; `GoogleService-Info.plist` → `ios/<ProjectName>/GoogleService-Info.plist`.
- Blank interactive path skips that platform and reports a note.
- Never overwrite an existing `src/notifications.js`/`.ts`.
- Entry import only if absent; do not rewrite unrelated entry content.
- Idempotent Gradle / Manifest / Info.plist / imports.
- Android failure must not skip iOS steps (and vice versa).
- Dry-run: no installs, no file writes; `skipped` + “would …”.
- Xcode target membership / Push entitlement `manualAction` only when unsafe to automate.
- Always report APNs/Firebase Console manual actions when messaging/iOS Firebase is in play.
- Spec: `docs/superpowers/specs/2026-07-31-firebase-notifications-design.md`.

## File structure

| File | Responsibility |
|------|----------------|
| `catalogs/default.json` | `notifications` group + `firebase-messaging` / `notifee` packages |
| `src/cliArgs.js` | New flags + help |
| `src/firebase/validateConfig.js` | Path/basename validation |
| `src/firebase/copyConfig.js` | Copy configs to native destinations |
| `src/firebase/applyAndroid.js` | Google Services Gradle wiring |
| `src/firebase/applyIos.js` | Plist + optional pbxproj / entitlements |
| `src/firebase/index.js` | collect + applyFirebase |
| `src/notifications/multiSelect.js` | Space/Enter picker + Yes/No fallback |
| `src/notifications/applyMessaging.js` | FCM native config |
| `src/notifications/applyNotifee.js` | Notifee native config |
| `src/notifications/writeBootstrap.js` | Bootstrap module + entry import |
| `src/notifications/index.js` | collect + applyNotifications |
| `src/run.js` / `src/index.js` | Wire collection, auto-add firebase-app, apply steps |
| `README.md` | Document flags and flow |
| Tests under `test/` | Unit/fixture coverage |

---

### Task 1: Catalog — notifications group + packages

**Files:**
- Modify: `catalogs/default.json`
- Modify: `test/catalog.test.js` (assert new group/packages load)

**Interfaces:**
- Produces catalog ids: `firebase-messaging`, `notifee`; group id `notifications`

- [ ] **Step 1: Extend catalog test**

```js
test('loadCatalog: includes notifications group packages', () => {
  const catalog = loadCatalog();
  assert.ok(catalog.packageById.has('firebase-messaging'));
  assert.ok(catalog.packageById.has('notifee'));
  assert.ok(catalog.groups.some((g) => g.id === 'notifications'));
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `node --test test/catalog.test.js`

- [ ] **Step 3: Update `catalogs/default.json`**

Add group after `firebase`:

```json
{
  "id": "notifications",
  "label": "Notifications",
  "description": "Firebase Cloud Messaging and Notifee",
  "default": false,
  "packages": ["firebase-messaging", "notifee"]
}
```

Add packages:

```json
{
  "id": "firebase-messaging",
  "label": "@react-native-firebase/messaging",
  "npm": ["@react-native-firebase/messaging"],
  "default": false,
  "setup": [
    { "type": "androidPermission", "permission": "android.permission.POST_NOTIFICATIONS" },
    { "type": "infoPlist", "key": "UIBackgroundModes", "value": ["remote-notification"], "mergeArray": true },
    { "type": "docs", "url": "https://rnfirebase.io/messaging/usage" },
    { "type": "podInstall" }
  ]
},
{
  "id": "notifee",
  "label": "@notifee/react-native",
  "npm": ["@notifee/react-native"],
  "default": false,
  "setup": [
    { "type": "docs", "url": "https://notifee.app/react-native/docs/overview" },
    { "type": "podInstall" }
  ]
}
```

If `infoPlist` does not yet support `mergeArray` for `UIBackgroundModes`, leave messaging Info.plist to Task 6 (`applyMessaging`) and keep only `androidPermission` + `docs` + `podInstall` in the catalog for messaging.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add catalogs/default.json test/catalog.test.js
git commit -m "feat: add notifications catalog group for messaging and notifee"
```

---

### Task 2: CLI flags

**Files:**
- Modify: `src/cliArgs.js`
- Modify: `test/cliArgs.test.js`

**Interfaces:**
- Produces: `googleServicesPath?`, `googleServiceInfoPath?`, `notifications?` (raw string or parsed ids array — prefer parse to `notificationIds: string[]` with values `messaging` | `notifee`)

- [ ] **Step 1: Failing tests**

```js
test('parseArgs: firebase and notifications flags', () => {
  const result = parseArgs([
    'App',
    '--google-services', './google-services.json',
    '--google-service-info', './GoogleService-Info.plist',
    '--notifications', 'messaging,notifee',
  ]);
  assert.equal(result.googleServicesPath, './google-services.json');
  assert.equal(result.googleServiceInfoPath, './GoogleService-Info.plist');
  assert.deepEqual(result.notificationIds, ['messaging', 'notifee']);
});

test('parseArgs: --notifications rejects unknown ids', () => {
  assert.throws(() => parseArgs(['--notifications', 'onesignal']), /unknown/i);
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Add to `VALUE_FLAGS`:

```js
{ flag: '--google-services', key: 'googleServicesPath', requires: 'requires a file path' },
{ flag: '--google-service-info', key: 'googleServiceInfoPath', requires: 'requires a file path' },
{ flag: '--notifications', key: 'notificationsRaw', requires: 'requires a comma-separated list (messaging,notifee)' },
```

After the parse loop, if `notificationsRaw` is set:

```js
const allowed = new Set(['messaging', 'notifee']);
result.notificationIds = result.notificationsRaw.split(',').map((s) => s.trim()).filter(Boolean);
for (const id of result.notificationIds) {
  if (!allowed.has(id)) throw new Error(`--notifications: unknown id "${id}" (use messaging, notifee)`);
}
delete result.notificationsRaw;
```

Update `printHelp()` with the three flags and a short interactive-flow note.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/cliArgs.js test/cliArgs.test.js
git commit -m "feat: add Firebase config and --notifications CLI flags"
```

---

### Task 3: Firebase config validation + copy

**Files:**
- Create: `src/firebase/validateConfig.js`
- Create: `src/firebase/copyConfig.js`
- Create: `test/firebaseConfig.test.js`

**Interfaces:**
- Produces: `validateGoogleServicesPath(path)`, `validateGoogleServiceInfoPath(path)` → `{ ok, absolutePath?, error? }`
- Produces: `copyGoogleServices(projectPath, sourcePath, { dryRun })`, `copyGoogleServiceInfo(projectPath, projectName, sourcePath, { dryRun })` → `{ status, detail }`

- [ ] **Step 1: Failing tests** (fixture files in `test/fixtures/` — minimal JSON/plist contents)

```js
test('validateGoogleServicesPath: requires basename google-services.json', () => {
  assert.equal(validateGoogleServicesPath('/tmp/wrong.json').ok, false);
});

test('copyGoogleServices: writes android/app/google-services.json', async () => {
  const dir = fakeAndroidProject();
  const result = await copyGoogleServices(dir, FIXTURE_JSON, {});
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'android/app/google-services.json')));
});

test('copyGoogleServices: dry-run does not write', async () => {
  const dir = fakeAndroidProject();
  const result = await copyGoogleServices(dir, FIXTURE_JSON, { dryRun: true });
  assert.equal(result.status, 'skipped');
  assert.equal(fs.existsSync(path.join(dir, 'android/app/google-services.json')), false);
});

test('copyGoogleServiceInfo: writes ios/<Name>/GoogleService-Info.plist', async () => {
  const dir = fakeIosProject('Demo');
  const result = await copyGoogleServiceInfo(dir, 'Demo', FIXTURE_PLIST, {});
  assert.ok(fs.existsSync(path.join(dir, 'ios/Demo/GoogleService-Info.plist')));
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement validate + copy**

Basename checks: `google-services.json`, `GoogleService-Info.plist`. Resolve `~`. Copy with `fs.copyFileSync`. Missing `android/app` or `ios/<Name>` → `failed`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/firebase/validateConfig.js src/firebase/copyConfig.js test/firebaseConfig.test.js test/fixtures/google-services.json test/fixtures/GoogleService-Info.plist
git commit -m "feat: validate and copy Firebase config files to native paths"
```

---

### Task 4: Firebase Android Gradle + iOS apply + collect/applyFirebase

**Files:**
- Create: `src/firebase/applyAndroid.js`
- Create: `src/firebase/applyIos.js`
- Create: `src/firebase/index.js`
- Create: `test/firebaseApply.test.js`

**Interfaces:**
- Produces: `applyGoogleServicesGradle(projectPath, { dryRun })` → `{ status, detail, manualAction? }`
- Produces: `applyFirebaseIos(projectPath, projectName, { dryRun })` → `{ status, detail, manualAction? }`
- Produces: `collectFirebaseOptions(options)`, `applyFirebase(projectPath, projectName, options, { dryRun })` → result array
- Consumes: copy helpers from Task 3

- [ ] **Step 1: Failing tests**

```js
test('applyGoogleServicesGradle: inserts plugin idempotently', async () => {
  const dir = fixtureWithAppGradle();
  const first = await applyGoogleServicesGradle(dir, {});
  assert.equal(first.status, 'applied');
  const second = await applyGoogleServicesGradle(dir, {});
  assert.equal(second.status, 'already-applied');
  const text = fs.readFileSync(path.join(dir, 'android/app/build.gradle'), 'utf8');
  assert.equal(text.split('com.google.gms.google-services').length - 1, /* expected once at apply site */ 1);
});

test('applyFirebase: android failure does not skip ios copy', async () => {
  // project with ios only — android copy fails, ios copy still attempted
});

test('collectFirebaseOptions: --yes without flags returns empty', async () => {
  assert.deepEqual(await collectFirebaseOptions({ yes: true, firebaseSelected: true }), {});
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

`applyAndroid.js`: detect Groovy vs Kotlin DSL; ensure Google Services plugin on app module; add classpath/`plugins` block in root/`settings` as required by template present in fixture. Prefer string contains checks for idempotency.

`applyIos.js`: after copy (caller may copy first), try minimal `.pbxproj` membership if a well-known pattern matches; else return `manualAction` for Xcode target membership. Attempt Push entitlement only when an entitlements file is findable; else `manualAction`.

`index.js`:

```js
export async function collectFirebaseOptions({
  yes, googleServicesPath, googleServiceInfoPath, firebaseSelected, askYesNo, askText,
}) {
  // If flag paths present, validate and return.
  // If yes && no flags → {}.
  // If !firebaseSelected && !flags → {}.
  // Else ask Configure Firebase files?; if yes, ask paths (blank = skip platform).
}

export async function applyFirebase(projectPath, projectName, paths, { dryRun } = {}) {
  const results = [];
  // Android block try/catch → push result; then iOS block try/catch → push result.
  // Always append manualActions for APNs/Console when iOS messaging/firebase paths used — caller may pass `includeMessagingManual`.
  return results;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/firebase/ test/firebaseApply.test.js
git commit -m "feat: apply Firebase Gradle and iOS wiring with isolated failures"
```

---

### Task 5: Multi-select + collectNotificationOptions + auto firebase-app

**Files:**
- Create: `src/notifications/multiSelect.js`
- Create: `src/notifications/index.js` (collect + ensureFirebaseApp helpers; apply stub OK)
- Create: `test/notificationsCollect.test.js`
- Modify: `src/prompt.js` only if shared helpers needed

**Interfaces:**
- Produces: `toggleSelection(selectedSet, id)`, `confirmSelection(selectedSet)` pure helpers
- Produces: `multiSelectPackages(options, { isTTY, askYesNo })` → `string[]` catalog ids
- Produces: `collectNotificationOptions(...)` → `{ packageIds: string[] }`
- Produces: `ensureFirebaseAppSelected(selectedPackages, catalog, packageIds)` → new selected array

Flag map: `messaging` → `firebase-messaging`, `notifee` → `notifee`.

- [ ] **Step 1: Failing tests**

```js
test('collectNotificationOptions: --yes without flag skips', async () => {
  const result = await collectNotificationOptions({ yes: true });
  assert.deepEqual(result.packageIds, []);
});

test('collectNotificationOptions: flag selects packages', async () => {
  const result = await collectNotificationOptions({
    yes: true,
    notificationIds: ['messaging', 'notifee'],
  });
  assert.deepEqual(result.packageIds.sort(), ['firebase-messaging', 'notifee']);
});

test('ensureFirebaseAppSelected: adds firebase-app when messaging chosen', () => {
  const catalog = loadCatalog();
  const selected = ensureFirebaseAppSelected([], catalog, ['firebase-messaging']);
  assert.ok(selected.some((p) => p.id === 'firebase-app'));
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

TTY multi-select: raw mode, render `◉`/`◯`, Space toggles, Enter returns selected ids. Non-TTY: Yes/No per option via `askYesNo`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/notifications/multiSelect.js src/notifications/index.js test/notificationsCollect.test.js
git commit -m "feat: collect notification package selection and auto-add firebase-app"
```

---

### Task 6: applyMessaging + applyNotifee (native)

**Files:**
- Create: `src/notifications/applyMessaging.js`
- Create: `src/notifications/applyNotifee.js`
- Create: `test/notificationsNative.test.js`
- Modify: `src/setup/infoPlist.js` **only if** catalog needs `mergeArray` for `UIBackgroundModes`; otherwise implement background mode merge inside `applyMessaging.js`

**Interfaces:**
- Produces: `applyMessagingNative(projectPath, projectName, { dryRun })` → result[]
- Produces: `applyNotifeeNative(projectPath, { dryRun })` → result[]

Follow **current** RN Firebase Messaging + Notifee docs for Manifest entries (verify against installed package README at implement time). Minimum:

- Messaging Android: ensure POST_NOTIFICATIONS (catalog or here); FCM default channel meta if required by docs.
- Messaging iOS: merge `remote-notification` into `UIBackgroundModes`.
- Notifee: any required Manifest service/receiver per docs; skip speculative entries.

Idempotent string checks. Android try/catch separate from iOS.

- [ ] **Step 1: Failing fixture tests for background modes + idempotent Manifest permission**

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/notifications/applyMessaging.js src/notifications/applyNotifee.js test/notificationsNative.test.js src/setup/infoPlist.js
git commit -m "feat: apply native Android and iOS notification configuration"
```

---

### Task 7: JS bootstrap (no overwrite)

**Files:**
- Create: `src/notifications/writeBootstrap.js`
- Modify: `src/notifications/index.js` (`applyNotifications`)
- Create: `test/notificationsBootstrap.test.js`

**Interfaces:**
- Produces: `writeNotificationsBootstrap(projectPath, { hasMessaging, hasNotifee, dryRun })` → `{ status, detail, manualAction? }`
- Produces: `ensureNotificationsImport(projectPath, modulePath, { dryRun })` → `{ status, detail }`
- Produces: `applyNotifications(projectPath, projectName, { packageIds, dryRun })` → result[]

- [ ] **Step 1: Failing tests**

```js
test('writeNotificationsBootstrap: creates src/notifications.js', async () => {
  const dir = fakeJsProject();
  const result = await writeNotificationsBootstrap(dir, { hasMessaging: true, hasNotifee: false }, {});
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'src/notifications.js')));
});

test('writeNotificationsBootstrap: does not overwrite existing file', async () => {
  const dir = fakeJsProject();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/notifications.js'), '// keep\n');
  const result = await writeBootstrap…;
  assert.equal(result.status, 'skipped'); // or already-applied
  assert.equal(fs.readFileSync(...), '// keep\n');
});

test('ensureNotificationsImport: idempotent', async () => {
  const dir = fakeJsProject();
  await ensureNotificationsImport(dir, './src/notifications', {});
  await ensureNotificationsImport(dir, './src/notifications', {});
  const content = fs.readFileSync(path.join(dir, 'index.js'), 'utf8');
  assert.equal(content.split(`./src/notifications`).length - 1, 1);
});
```

- [ ] **Step 2–4: Implement template body**

Minimal bootstrap:

```js
// Generated by create-react-native-setup — safe to edit
import messaging from '@react-native-firebase/messaging';
// optional notifee import + createChannel
export async function setupNotifications() {
  await messaging().requestPermission();
  // register foreground/background stubs as comments or no-op handlers
}
setupNotifications().catch(console.warn);
```

Use `.ts` when `tsconfig.json` or `App.tsx` exists. Detect path `src/` vs create it.

`applyNotifications` runs native appliers then bootstrap; appends APNs/Console `manualAction` entries when messaging selected.

- [ ] **Step 5: Commit**

```bash
git add src/notifications/writeBootstrap.js src/notifications/index.js test/notificationsBootstrap.test.js
git commit -m "feat: generate notifications JS bootstrap without overwriting existing files"
```

---

### Task 8: Wire `run.js` + `index.js` + README

**Files:**
- Modify: `src/run.js`
- Modify: `src/index.js`
- Modify: `README.md`
- Optional: bump `package.json` version to `1.2.0` when shipping this feature

**Interfaces:**
- Consumes: `collectFirebaseOptions`, `applyFirebase`, `collectNotificationOptions`, `ensureFirebaseAppSelected`, `applyNotifications`, `assert` helpers for flag paths

- [ ] **Step 1: Early flag validation in `main`**

```js
assertFirebaseFlagPaths({ googleServicesPath, googleServiceInfoPath });
// notifications ids already validated in parseArgs
```

Pass new options into `run`.

- [ ] **Step 2: Update `run.js` order**

After `selectPackages`:

```js
const notificationChoice = await collectNotificationOptions({
  yes: options.yes,
  notificationIds: options.notificationIds,
  notificationsGroupSelected: selected.some((p) =>
    ['firebase-messaging', 'notifee'].includes(p.id),
  ),
  // When group Yes selected packages both by default from catalog — actually:
  // Notifications group Yes currently selects BOTH packages via catalog.
  // Spec wants multi-select AFTER group Yes.
});
```

**Important:** Change package selection so the `notifications` group Yes does **not** auto-add both packages. Options:

1. Make `notifications` group empty of packages and handle selection only via multi-select; or
2. On Notifications group Yes, clear those package ids and replace with multi-select results.

Prefer (2) in `run.js`:

```js
let selected = await selectPackages(...);
const wantsNotifications = selected.some((p) =>
  ['firebase-messaging', 'notifee'].includes(p.id),
);
selected = selected.filter((p) => !['firebase-messaging', 'notifee'].includes(p.id));
const { packageIds } = await collectNotificationOptions({
  yes: options.yes,
  notificationIds: options.notificationIds,
  notificationsGroupSelected: wantsNotifications || Boolean(options.notificationIds?.length),
});
for (const id of packageIds) {
  selected.push(catalog.packageById.get(id));
}
selected = ensureFirebaseAppSelected(selected, catalog, packageIds);

const firebaseSelected = selected.some((p) => p.id === 'firebase-app');
const firebasePaths = await collectFirebaseOptions({
  yes: options.yes,
  googleServicesPath: options.googleServicesPath,
  googleServiceInfoPath: options.googleServiceInfoPath,
  firebaseSelected,
});
```

After catalog `runSetupSteps` (+ branding as today):

```js
setup.push(...(await applyFirebase(projectPath, projectName, firebasePaths, { dryRun, includeMessagingManual: packageIds.includes('firebase-messaging') })));
setup.push(...(await applyNotifications(projectPath, projectName, { packageIds, dryRun })));
```

Close prompts after all interactive collection (including firebase/notifications), before create.

- [ ] **Step 3: README** — document flags, multi-select, manual APNs note

- [ ] **Step 4: `npm test` — all PASS**

- [ ] **Step 5: Commit**

```bash
git add src/run.js src/index.js README.md package.json package-lock.json
git commit -m "feat: wire Firebase and notifications into the bootstrap pipeline"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Config paths + validation + blank skip | 3–4 |
| Multi-select Space/Enter; messaging + notifee only | 5 |
| Auto firebase-app | 5, 8 |
| `--yes` + flags | 2, 4, 5, 8 |
| Gradle / iOS Firebase | 4 |
| Messaging / Notifee native | 6 |
| JS bootstrap no overwrite | 7 |
| Idempotency | 4, 6, 7 |
| Per-platform isolation | 4, 6 |
| Dry-run | 3–7 |
| Manual APNs / conditional Xcode | 4, 7 |
| Catalog notifications group | 1 |
| Wire run.js | 8 |

## Placeholder scan

None intentional. At Task 6 implement time, re-read current `@react-native-firebase/messaging` and `@notifee/react-native` install docs and only apply Manifest entries those docs require.
