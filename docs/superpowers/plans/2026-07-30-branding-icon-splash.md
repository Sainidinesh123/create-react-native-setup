# Native App Icon & Splash Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users optionally supply image paths so the CLI generates native Android/iOS app icons and splash assets with `sharp` (no splash libraries in the generated app), and ship this as package version `1.1.0`.

**Architecture:** Add a dedicated `src/branding/` module (validate → prompt/collect → applyIcon / applySplash). Wire it into `run.js` after package install and before catalog setup. Extend CLI with `--icon` / `--splash`. Branding results merge into the report `setup` array.

**Tech Stack:** Node 18+ ESM, `node:test`, `sharp` (CLI dependency only), existing readline prompts.

## Global Constraints

- Native-assets-only: do **not** install `react-native-splash-screen`, Bootsplash, or any icon/splash package into the generated app.
- `sharp` is a dependency of `create-react-native-setup` only.
- Allowed image extensions: `.png`, `.jpg`, `.jpeg`, `.webp`.
- `--yes` skips branding prompts; honor `--icon` / `--splash` when provided.
- Interactive: separate Yes/No for icon and splash; re-ask path until valid.
- Invalid flag paths throw **before** project create.
- Branding apply failures become report entries (`failed`); do not abort the whole bootstrap.
- Dry-run: no asset writes; branding steps status `skipped` with “would …” detail.
- Bump package version to `1.1.0` when branding ships.
- Follow existing ESM / `node:test` / setup-handler return shape: `{ status, detail, manualAction? }`.

## File structure

| File | Responsibility |
|------|----------------|
| `src/branding/validateImage.js` | Exists + extension validation |
| `src/branding/prompt.js` | Interactive Yes/No + path collection |
| `src/branding/applyIcon.js` | Android mipmaps + iOS AppIcon.appiconset via sharp |
| `src/branding/applySplash.js` | Android splash drawables/theme + iOS splash imageset/LaunchScreen |
| `src/branding/index.js` | `collectBrandingOptions`, `applyBranding`, early `assertBrandingFlagPaths` |
| `src/cliArgs.js` | Parse `--icon` / `--splash`; help text |
| `src/index.js` | Pass icon/splash into `run`; validate flags early |
| `src/run.js` | Call branding after install, merge results into report |
| `package.json` | Add `sharp`, version `1.1.0` |
| `README.md` | Document branding flags and prompts |
| `test/brandingValidate.test.js` | validateImage tests |
| `test/brandingPrompt.test.js` | collectBrandingOptions tests |
| `test/brandingIcon.test.js` | applyIcon temp-dir tests |
| `test/brandingSplash.test.js` | applySplash temp-dir tests |
| `test/cliArgs.test.js` | Flag parsing tests |
| `test/fixtures/branding-source.png` | Small PNG fixture (created in Task 1) |

---

### Task 1: Image validation + sharp + fixture

**Files:**
- Create: `src/branding/validateImage.js`
- Create: `test/brandingValidate.test.js`
- Create: `test/fixtures/branding-source.png` (via script)
- Modify: `package.json` (add `sharp` dependency; keep version `1.0.0` until final task)

**Interfaces:**
- Produces: `validateImagePath(imagePath: string) => { ok: true, absolutePath: string } | { ok: false, error: string }`
- Produces: `ALLOWED_IMAGE_EXTENSIONS` Set or array

- [ ] **Step 1: Write the failing test**

Create `test/brandingValidate.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateImagePath } from '../src/branding/validateImage.js';

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'branding-source.png',
);

test('validateImagePath: accepts existing png fixture', () => {
  const result = validateImagePath(fixture);
  assert.equal(result.ok, true);
  assert.equal(result.absolutePath, path.resolve(fixture));
});

test('validateImagePath: rejects missing file', () => {
  const result = validateImagePath(path.join(os.tmpdir(), 'no-such-branding-image.png'));
  assert.equal(result.ok, false);
  assert.match(result.error, /not found|does not exist/i);
});

test('validateImagePath: rejects bad extension', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crs-img-'));
  const bad = path.join(dir, 'icon.gif');
  fs.writeFileSync(bad, 'x');
  const result = validateImagePath(bad);
  assert.equal(result.ok, false);
  assert.match(result.error, /extension|png|jpg|webp/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/brandingValidate.test.js`  
Expected: FAIL (module not found / fixture missing)

- [ ] **Step 3: Install sharp and create fixture + implementation**

```bash
npm install sharp@^0.34.2
mkdir -p test/fixtures
node --input-type=module -e "
import sharp from 'sharp';
import path from 'node:path';
await sharp({
  create: { width: 512, height: 512, channels: 3, background: { r: 30, g: 144, b: 255 } },
}).png().toFile('test/fixtures/branding-source.png');
console.log('wrote fixture');
"
```

Create `src/branding/validateImage.js`:

```js
import fs from 'node:fs';
import path from 'node:path';

export const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/**
 * @param {string} imagePath
 * @returns {{ ok: true, absolutePath: string } | { ok: false, error: string }}
 */
export function validateImagePath(imagePath) {
  if (!imagePath || typeof imagePath !== 'string' || !imagePath.trim()) {
    return { ok: false, error: 'Image path is required' };
  }
  const absolutePath = path.resolve(imagePath.trim());
  const ext = path.extname(absolutePath).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: `Unsupported image extension "${ext}". Use .png, .jpg, .jpeg, or .webp`,
    };
  }
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return { ok: false, error: `Image file not found: ${absolutePath}` };
  }
  return { ok: true, absolutePath };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/brandingValidate.test.js`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/branding/validateImage.js test/brandingValidate.test.js test/fixtures/branding-source.png
git commit -m "feat: add branding image path validation and sharp dependency"
```

---

### Task 2: CLI flags `--icon` and `--splash`

**Files:**
- Modify: `src/cliArgs.js`
- Modify: `test/cliArgs.test.js`

**Interfaces:**
- Produces: `parseArgs` result may include `iconPath?: string`, `splashPath?: string`
- Consumes: none from branding yet

- [ ] **Step 1: Write the failing tests**

Append to `test/cliArgs.test.js`:

```js
test('parseArgs: --icon and --splash paths', () => {
  const result = parseArgs(['MyApp', '--icon', './icon.png', '--splash', './splash.png']);
  assert.equal(result.iconPath, './icon.png');
  assert.equal(result.splashPath, './splash.png');
});

test('parseArgs: --icon= and --splash= forms', () => {
  const result = parseArgs(['--icon=./a.png', '--splash=./b.png']);
  assert.equal(result.iconPath, './a.png');
  assert.equal(result.splashPath, './b.png');
});

test('parseArgs: --icon without path throws', () => {
  assert.throws(() => parseArgs(['--icon']), /requires a file path/);
});

test('parseArgs: --splash without path throws', () => {
  assert.throws(() => parseArgs(['--splash']), /requires a file path/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/cliArgs.test.js`  
Expected: FAIL on new assertions (`iconPath` undefined)

- [ ] **Step 3: Implement parsing + help**

In `src/cliArgs.js`, mirror the `--config` handling for `--icon` and `--splash` (both space and `=` forms). Update `printHelp()`:

```text
  --icon <file>          Native app icon image (.png/.jpg/.webp)
  --splash <file>        Native splash image (.png/.jpg/.webp)
```

And add examples:

```text
  npx create-react-native-setup MyApp --icon ./icon.png --splash ./splash.png
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/cliArgs.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cliArgs.js test/cliArgs.test.js
git commit -m "feat: add --icon and --splash CLI flags"
```

---

### Task 3: Collect branding options (prompts + `--yes`)

**Files:**
- Create: `src/branding/prompt.js`
- Create: `src/branding/index.js` (collect + early assert only in this task; apply stubs ok)
- Create: `test/brandingPrompt.test.js`
- Modify: `src/prompt.js` only if needed to export a shared `askText` helper — prefer putting path prompt in `src/branding/prompt.js` to avoid widening `src/prompt.js`

**Interfaces:**
- Consumes: `validateImagePath` from `validateImage.js`; `askYesNo` from `../prompt.js`
- Produces:
  - `assertBrandingFlagPaths({ iconPath?, splashPath? }) => void` (throws if provided path invalid)
  - `collectBrandingOptions({ yes?: boolean, iconPath?: string, splashPath?: string, askYesNo?, askImagePath? }) => Promise<{ iconPath?: string, splashPath?: string }>`

- [ ] **Step 1: Write the failing test**

Create `test/brandingPrompt.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertBrandingFlagPaths,
  collectBrandingOptions,
} from '../src/branding/index.js';

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'branding-source.png',
);

test('assertBrandingFlagPaths: throws on bad flag path', () => {
  assert.throws(() => assertBrandingFlagPaths({ iconPath: '/no/such/icon.png' }), /not found/i);
});

test('assertBrandingFlagPaths: accepts valid paths', () => {
  assert.doesNotThrow(() => assertBrandingFlagPaths({ iconPath: fixture, splashPath: fixture }));
});

test('collectBrandingOptions: --yes uses flags only', async () => {
  const result = await collectBrandingOptions({
    yes: true,
    iconPath: fixture,
    splashPath: fixture,
  });
  assert.equal(result.iconPath, path.resolve(fixture));
  assert.equal(result.splashPath, path.resolve(fixture));
});

test('collectBrandingOptions: --yes without flags skips', async () => {
  const result = await collectBrandingOptions({ yes: true });
  assert.equal(result.iconPath, undefined);
  assert.equal(result.splashPath, undefined);
});

test('collectBrandingOptions: interactive prompts when no flags', async () => {
  const answers = [true, fixture, false];
  const result = await collectBrandingOptions({
    yes: false,
    askYesNo: async () => answers.shift(),
    askImagePath: async () => answers.shift(),
  });
  assert.equal(result.iconPath, path.resolve(fixture));
  assert.equal(result.splashPath, undefined);
});

test('collectBrandingOptions: flag skips matching prompt', async () => {
  let yesNoCalls = 0;
  const result = await collectBrandingOptions({
    yes: false,
    iconPath: fixture,
    askYesNo: async () => {
      yesNoCalls += 1;
      return false; // splash no
    },
  });
  assert.equal(result.iconPath, path.resolve(fixture));
  assert.equal(result.splashPath, undefined);
  assert.equal(yesNoCalls, 1); // only splash Yes/No
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/brandingPrompt.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement collect + prompt helpers**

`src/branding/prompt.js`:

```js
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { validateImagePath } from './validateImage.js';

/**
 * @param {string} label
 * @returns {Promise<string>} absolute path
 */
export async function askImagePath(label = 'Image path') {
  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      const raw = (await rl.question(`${label}: `)).trim();
      const result = validateImagePath(raw);
      if (result.ok) return result.absolutePath;
      console.log(result.error);
    }
  } finally {
    rl.close();
  }
}
```

`src/branding/index.js` (partial — applyBranding can throw “not implemented” until Task 4/5, or return empty; prefer implementing `assertBrandingFlagPaths` + `collectBrandingOptions` fully now):

```js
import { askYesNo } from '../prompt.js';
import { validateImagePath } from './validateImage.js';
import { askImagePath as defaultAskImagePath } from './prompt.js';

export function assertBrandingFlagPaths({ iconPath, splashPath } = {}) {
  for (const [label, value] of [
    ['--icon', iconPath],
    ['--splash', splashPath],
  ]) {
    if (!value) continue;
    const result = validateImagePath(value);
    if (!result.ok) {
      throw new Error(`${label}: ${result.error}`);
    }
  }
}

/**
 * @returns {Promise<{ iconPath?: string, splashPath?: string }>}
 */
export async function collectBrandingOptions(options = {}) {
  const ask = options.askYesNo || askYesNo;
  const askPath = options.askImagePath || defaultAskImagePath;
  const out = {};

  if (options.iconPath) {
    const v = validateImagePath(options.iconPath);
    if (!v.ok) throw new Error(`--icon: ${v.error}`);
    out.iconPath = v.absolutePath;
  } else if (!options.yes) {
    const want = await ask('Set app icon?', { defaultYes: false });
    if (want) out.iconPath = await askPath('App icon image path');
  }

  if (options.splashPath) {
    const v = validateImagePath(options.splashPath);
    if (!v.ok) throw new Error(`--splash: ${v.error}`);
    out.splashPath = v.absolutePath;
  } else if (!options.yes) {
    const want = await ask('Set splash screen?', { defaultYes: false });
    if (want) out.splashPath = await askPath('Splash screen image path');
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/brandingPrompt.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/branding/prompt.js src/branding/index.js test/brandingPrompt.test.js
git commit -m "feat: collect branding icon and splash options from prompts or flags"
```

---

### Task 4: Apply app icon (Android + iOS)

**Files:**
- Create: `src/branding/applyIcon.js`
- Create: `test/brandingIcon.test.js`
- Modify: `src/branding/index.js` (export `applyBranding` calling applyIcon)

**Interfaces:**
- Consumes: `sharp`, validated absolute `iconPath`
- Produces: `applyIcon(projectPath, iconPath, { dryRun?: boolean }) => Promise<{ status, detail }>`
- Produces: `applyBranding(projectPath, { iconPath?, splashPath? }, { dryRun? }) => Promise<Array<{ packageId, type, status, detail }>>` (splash may still be no-op until Task 5)

Android sizes:

```js
export const ANDROID_ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};
```

iOS: if `AppIcon.appiconset/Contents.json` exists, generate each `images[].filename` entry using `images[].size` × `images[].scale` (parse `"20x20"` + `"2x"` → 40px). If Contents.json missing filenames, write a minimal set: `icon-20@2x.png` (40), `icon-20@3x.png` (60), `icon-29@2x.png` (58), `icon-29@3x.png` (87), `icon-40@2x.png` (80), `icon-40@3x.png` (120), `icon-60@2x.png` (120), `icon-60@3x.png` (180), `icon-1024.png` (1024) and update Contents.json accordingly.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyIcon } from '../src/branding/applyIcon.js';

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'branding-source.png',
);

function fakeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crs-icon-'));
  for (const density of ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi']) {
    fs.mkdirSync(path.join(dir, 'android/app/src/main/res', density), { recursive: true });
  }
  const appicon = path.join(dir, 'ios/FakeApp/Images.xcassets/AppIcon.appiconset');
  fs.mkdirSync(appicon, { recursive: true });
  fs.writeFileSync(
    path.join(appicon, 'Contents.json'),
    JSON.stringify({
      images: [
        { size: '1024x1024', idiom: 'ios-marketing', filename: 'icon-1024.png', scale: '1x' },
        { size: '60x60', idiom: 'iphone', filename: 'icon-60@2x.png', scale: '2x' },
      ],
      info: { version: 1, author: 'test' },
    }),
    'utf8',
  );
  return dir;
}

test('applyIcon: dry-run does not write files', async () => {
  const dir = fakeProject();
  const result = await applyIcon(dir, fixture, { dryRun: true });
  assert.equal(result.status, 'skipped');
  assert.match(result.detail, /would/i);
  assert.equal(
    fs.existsSync(path.join(dir, 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png')),
    false,
  );
});

test('applyIcon: writes android mipmaps and ios icons', async () => {
  const dir = fakeProject();
  const result = await applyIcon(dir, fixture, { dryRun: false });
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png')));
  assert.ok(fs.existsSync(path.join(dir, 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png')));
  assert.ok(
    fs.existsSync(path.join(dir, 'ios/FakeApp/Images.xcassets/AppIcon.appiconset/icon-1024.png')),
  );
  assert.ok(
    fs.existsSync(path.join(dir, 'ios/FakeApp/Images.xcassets/AppIcon.appiconset/icon-60@2x.png')),
  );
});

test('applyIcon: missing android tree fails gracefully', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crs-icon-empty-'));
  const result = await applyIcon(dir, fixture, { dryRun: false });
  assert.equal(result.status, 'failed');
  assert.match(result.detail, /android|ios|not found/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/brandingIcon.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement `applyIcon.js`**

Core logic:

```js
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const ANDROID_ICON_SIZES = { /* as above */ };

function findAppIconSet(projectPath) {
  const iosRoot = path.join(projectPath, 'ios');
  if (!fs.existsSync(iosRoot)) return null;
  // walk for AppIcon.appiconset directory
}

function parsePixelSize(size, scale) {
  const [w] = size.split('x').map(Number);
  const s = Number(String(scale).replace('x', '')) || 1;
  return Math.round(w * s);
}

export async function applyIcon(projectPath, iconPath, options = {}) {
  const resRoot = path.join(projectPath, 'android', 'app', 'src', 'main', 'res');
  const appicon = findAppIconSet(projectPath);
  if (!fs.existsSync(resRoot) && !appicon) {
    return { status: 'failed', detail: 'No android/ or iOS AppIcon.appiconset found' };
  }
  if (options.dryRun) {
    return { status: 'skipped', detail: `dry-run: would generate launcher icons from ${iconPath}` };
  }
  try {
    const jobs = [];
    if (fs.existsSync(resRoot)) {
      for (const [folder, size] of Object.entries(ANDROID_ICON_SIZES)) {
        const dir = path.join(resRoot, folder);
        fs.mkdirSync(dir, { recursive: true });
        for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
          jobs.push(sharp(iconPath).resize(size, size).png().toFile(path.join(dir, name)));
        }
      }
    }
    if (appicon) {
      const contentsPath = path.join(appicon, 'Contents.json');
      const contents = JSON.parse(fs.readFileSync(contentsPath, 'utf8'));
      for (const image of contents.images || []) {
        if (!image.filename) continue;
        const px = parsePixelSize(image.size, image.scale);
        jobs.push(
          sharp(iconPath).resize(px, px).png().toFile(path.join(appicon, image.filename)),
        );
      }
    }
    await Promise.all(jobs);
    return { status: 'applied', detail: `Generated app icons from ${iconPath}` };
  } catch (error) {
    return { status: 'failed', detail: error.message };
  }
}
```

Wire `applyBranding` in `index.js`:

```js
import { applyIcon } from './applyIcon.js';

export async function applyBranding(projectPath, branding, options = {}) {
  const results = [];
  if (branding.iconPath) {
    const outcome = await applyIcon(projectPath, branding.iconPath, options);
    results.push({ packageId: 'branding', type: 'appIcon', ...outcome });
  }
  // splash in Task 5
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/brandingIcon.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/branding/applyIcon.js src/branding/index.js test/brandingIcon.test.js
git commit -m "feat: generate native Android and iOS app icons with sharp"
```

---

### Task 5: Apply splash (Android + iOS, native only)

**Files:**
- Create: `src/branding/applySplash.js`
- Create: `test/brandingSplash.test.js`
- Modify: `src/branding/index.js` (call applySplash)

**Interfaces:**
- Produces: `applySplash(projectPath, splashPath, { dryRun?: boolean }) => Promise<{ status, detail }>`

Android drawable sizes (width; maintain aspect via `sharp` fit contain on square canvas or resize width):

```js
export const ANDROID_SPLASH_WIDTHS = {
  'drawable-mdpi': 320,
  'drawable-hdpi': 480,
  'drawable-xhdpi': 720,
  'drawable-xxhdpi': 1080,
  'drawable-xxxhdpi': 1440,
};
```

Behavior:
1. Write `splash.png` into each drawable-* folder.
2. Ensure `android/app/src/main/res/values/styles.xml` has a splash-capable style item `android:windowBackground` → `@drawable/splash`. Prefer editing existing `AppTheme` / `AppTheme.Launcher` if present; otherwise append:

```xml
<style name="AppTheme.Splash" parent="AppTheme">
    <item name="android:windowBackground">@drawable/splash</item>
</style>
```

3. If `AndroidManifest.xml` has `android:theme` on the main activity, point it at `@style/AppTheme.Splash` when a splash style was added (or keep existing if already splash-capable). Keep this minimal: if styles already set `windowBackground`, only ensure `@drawable/splash`.

iOS:
1. Create `Images.xcassets/Splash.imageset/` with `Contents.json` + `splash.png` (and @2x/@3x variants: 200, 400, 600 square or proportional).
2. If `LaunchScreen.storyboard` exists, ensure it contains an image view reference to `Splash` (string replace / insert if missing). If storyboard missing, return partial success with `manualAction` describing remaining step — still write the imageset.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySplash } from '../src/branding/applySplash.js';

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'branding-source.png',
);

function fakeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crs-splash-'));
  const main = path.join(dir, 'android/app/src/main');
  for (const d of ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi']) {
    fs.mkdirSync(path.join(main, 'res', d), { recursive: true });
  }
  fs.mkdirSync(path.join(main, 'res/values'), { recursive: true });
  fs.writeFileSync(
    path.join(main, 'res/values/styles.xml'),
    `<resources>
  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
  </style>
</resources>
`,
  );
  fs.writeFileSync(
    path.join(main, 'AndroidManifest.xml'),
    `<manifest>
  <application>
    <activity android:name=".MainActivity" android:theme="@style/AppTheme" />
  </application>
</manifest>
`,
  );
  const iosApp = path.join(dir, 'ios/FakeApp');
  fs.mkdirSync(path.join(iosApp, 'Images.xcassets'), { recursive: true });
  fs.writeFileSync(
    path.join(iosApp, 'LaunchScreen.storyboard'),
    `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <scenes>
    <scene>
      <viewController>
        <view>
          <subviews></subviews>
        </view>
      </viewController>
    </scene>
  </scenes>
</document>
`,
  );
  return dir;
}

test('applySplash: dry-run skips writes', async () => {
  const dir = fakeProject();
  const result = await applySplash(dir, fixture, { dryRun: true });
  assert.equal(result.status, 'skipped');
  assert.equal(
    fs.existsSync(path.join(dir, 'android/app/src/main/res/drawable-mdpi/splash.png')),
    false,
  );
});

test('applySplash: writes drawables, styles, and ios splash imageset', async () => {
  const dir = fakeProject();
  const result = await applySplash(dir, fixture, { dryRun: false });
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'android/app/src/main/res/drawable-mdpi/splash.png')));
  const styles = fs.readFileSync(path.join(dir, 'android/app/src/main/res/values/styles.xml'), 'utf8');
  assert.match(styles, /@drawable\/splash/);
  assert.ok(
    fs.existsSync(path.join(dir, 'ios/FakeApp/Images.xcassets/Splash.imageset/splash.png')),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/brandingSplash.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement `applySplash.js` and wire into `applyBranding`**

Do **not** call `npm install` for any splash package. Use only `sharp` + filesystem/XML edits.

```js
// applyBranding addition
if (branding.splashPath) {
  const outcome = await applySplash(projectPath, branding.splashPath, options);
  results.push({ packageId: 'branding', type: 'splashScreen', ...outcome });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/brandingSplash.test.js test/brandingIcon.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/branding/applySplash.js src/branding/index.js test/brandingSplash.test.js
git commit -m "feat: configure native Android and iOS splash assets with sharp"
```

---

### Task 6: Wire into `main` / `run` + README + version `1.1.0`

**Files:**
- Modify: `src/index.js`
- Modify: `src/run.js`
- Modify: `package.json` (`version`: `1.1.0`)
- Modify: `package-lock.json` (version field)
- Modify: `README.md`
- Optional: `test/runBrandingWire.test.js` — light unit test that `collectBrandingOptions` + `applyBranding` dry-run merge shape works; or rely on existing unit tests + manual dry-run

**Interfaces:**
- Consumes: `assertBrandingFlagPaths`, `collectBrandingOptions`, `applyBranding`
- `run(options)` accepts `iconPath?`, `splashPath?`

- [ ] **Step 1: Update `src/index.js`**

```js
import { assertBrandingFlagPaths } from './branding/index.js';

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return { help: true };
  }
  if (args.unknown.length) {
    console.warn(`Warning: ignoring unknown arguments: ${args.unknown.join(', ')}`);
  }

  assertBrandingFlagPaths({ iconPath: args.iconPath, splashPath: args.splashPath });

  return run({
    projectName: args.projectName,
    yes: args.yes,
    configPath: args.configPath,
    dryRun: args.dryRun,
    iconPath: args.iconPath,
    splashPath: args.splashPath,
  });
}
```

- [ ] **Step 2: Update `src/run.js`**

After package install and before `runSetupSteps`:

```js
import { collectBrandingOptions, applyBranding } from './branding/index.js';

// ...
const brandingOptions = await collectBrandingOptions({
  yes: Boolean(options.yes),
  iconPath: options.iconPath,
  splashPath: options.splashPath,
});

console.log('Applying branding...\n');
const brandingSetup = await applyBranding(projectPath, brandingOptions, {
  dryRun: Boolean(options.dryRun),
});

console.log('Running setup steps...\n');
const setup = await runSetupSteps(/* ... */);
const report = {
  // ...
  setup: [...brandingSetup, ...setup],
};
```

If both icon and splash skipped, log `No branding selected.` instead of “Applying branding…”.

- [ ] **Step 3: Bump version and README**

Set `"version": "1.1.0"` in `package.json` and root `package-lock.json` name/version entries.

README additions under Usage:

- Document `--icon` / `--splash`
- Note interactive Yes/No prompts for icon and splash
- Note native-only (no extra app packages)
- Example: `npx create-react-native-setup MyApp --icon ./icon.png --splash ./splash.png`

- [ ] **Step 4: Run full test suite**

Run: `npm test`  
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.js src/run.js package.json package-lock.json README.md
git commit -m "feat: wire branding into CLI pipeline and release 1.1.0"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Dedicated `src/branding/` | 1–5 |
| validate extensions + exists | 1 |
| Separate Yes/No prompts | 3 |
| `--yes` + `--icon`/`--splash` | 2–3, 6 |
| Early flag validation | 3, 6 |
| Native icon via sharp | 4 |
| Native splash via sharp (no RN splash lib) | 5 |
| Dry-run no writes | 4–5 |
| Failures in report, don’t abort | 4–6 (`apply*` returns failed; run continues) |
| Report merge | 6 |
| README / help | 2, 6 |
| Version 1.1.0 | 6 |

## Placeholder scan

None intentionally left. Splash storyboard mutation should be implemented with a concrete string/XML update in Task 5 (image view named `Splash`); if the template storyboard is too divergent, still write `Splash.imageset` and set `manualAction` in the result detail.
