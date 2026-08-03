import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyBranding,
  applyIcon,
  applySplash,
  assertBrandingFlagPaths,
  collectBrandingOptions,
  validateImagePath,
} from '../src/branding/index.js';

const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'branding-source.png',
);

const ANDROID_MIPMAPS = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];

/** Minimal stand-in for the bare React Native template layout. */
function fakeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crns-branding-'));
  const res = path.join(dir, 'android', 'app', 'src', 'main', 'res');
  for (const density of ANDROID_MIPMAPS) {
    fs.mkdirSync(path.join(res, density), { recursive: true });
  }
  fs.mkdirSync(path.join(res, 'values'), { recursive: true });
  fs.writeFileSync(
    path.join(res, 'values', 'styles.xml'),
    `<resources>

    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    </style>

</resources>
`,
  );

  const assets = path.join(dir, 'ios', 'FakeApp', 'Images.xcassets');
  fs.mkdirSync(path.join(assets, 'AppIcon.appiconset'), { recursive: true });
  fs.writeFileSync(
    path.join(assets, 'AppIcon.appiconset', 'Contents.json'),
    JSON.stringify({
      images: [
        { idiom: 'iphone', scale: '2x', size: '60x60' },
        { idiom: 'ios-marketing', scale: '1x', size: '1024x1024' },
      ],
      info: { author: 'xcode', version: 1 },
    }),
  );
  fs.writeFileSync(
    path.join(dir, 'ios', 'FakeApp', 'LaunchScreen.storyboard'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<document></document>\n',
  );
  return dir;
}

test('validateImagePath: accepts the fixture', () => {
  const result = validateImagePath(FIXTURE);
  assert.equal(result.ok, true);
  assert.equal(result.absolutePath, path.resolve(FIXTURE));
});

test('validateImagePath: rejects a missing file', () => {
  const result = validateImagePath(path.join(os.tmpdir(), 'nope-crns.png'));
  assert.equal(result.ok, false);
  assert.match(result.error, /not found/i);
});

test('validateImagePath: rejects an unsupported extension', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crns-ext-'));
  const bad = path.join(dir, 'icon.gif');
  fs.writeFileSync(bad, 'x');
  const result = validateImagePath(bad);
  assert.equal(result.ok, false);
  assert.match(result.error, /Unsupported image type/);
});

test('assertBrandingFlagPaths: throws for a bad flag path', () => {
  assert.throws(() => assertBrandingFlagPaths({ iconPath: '/nope/icon.png' }), /--icon/);
});

test('assertBrandingFlagPaths: accepts valid flag paths', () => {
  assert.doesNotThrow(() =>
    assertBrandingFlagPaths({ iconPath: FIXTURE, splashPath: FIXTURE }),
  );
});

test('collectBrandingOptions: --yes skips branding entirely', async () => {
  let asked = 0;
  const result = await collectBrandingOptions({
    yes: true,
    askYesNo: async () => {
      asked += 1;
      return true;
    },
  });
  assert.deepEqual(result, {});
  assert.equal(asked, 0);
});

test('collectBrandingOptions: --yes still honors explicit flags', async () => {
  const result = await collectBrandingOptions({ yes: true, iconPath: FIXTURE });
  assert.equal(result.iconPath, path.resolve(FIXTURE));
  assert.equal(result.splashPath, undefined);
});

test('collectBrandingOptions: asks confirmation before image paths', async () => {
  const confirms = [];
  const result = await collectBrandingOptions({
    askYesNo: async (question) => {
      confirms.push(question);
      return true;
    },
    askText: async (question) => {
      if (/Choose splash|splash package/i.test(question)) return '3';
      if (/background/i.test(question)) return '#ffffff';
      return FIXTURE;
    },
  });
  assert.equal(result.iconPath, path.resolve(FIXTURE));
  assert.equal(result.splashPath, path.resolve(FIXTURE));
  assert.equal(result.splashPackage, 'native');
  assert.equal(result.splashBackground, '#ffffff');
  assert.match(confirms[0], /Set a custom app icon/i);
  assert.match(confirms[1], /Set a custom splash screen/i);
});

test('collectBrandingOptions: asks which splash package after confirming splash', async () => {
  const result = await collectBrandingOptions({
    askYesNo: async (question) => /splash/i.test(question),
    askText: async (question) => {
      if (/Choose splash|splash package/i.test(question)) return '1';
      if (/background/i.test(question)) return '#112233';
      return FIXTURE;
    },
  });
  assert.equal(result.splashPackage, 'bootsplash');
  assert.equal(result.splashBackground, '#112233');
  assert.equal(result.splashPath, path.resolve(FIXTURE));
  assert.equal(result.iconPath, undefined);
});

test('collectBrandingOptions: --yes --splash defaults to bootsplash', async () => {
  const result = await collectBrandingOptions({
    yes: true,
    splashPath: FIXTURE,
  });
  assert.equal(result.splashPackage, 'bootsplash');
  assert.equal(result.splashPath, path.resolve(FIXTURE));
});

test('collectBrandingOptions: declining both confirms collects nothing', async () => {
  const result = await collectBrandingOptions({
    askYesNo: async () => false,
    askText: async () => FIXTURE,
  });
  assert.deepEqual(result, {});
});

test('collectBrandingOptions: re-asks after an invalid path', async () => {
  const answers = ['/nope/missing.png', FIXTURE];
  const result = await collectBrandingOptions({
    askYesNo: async (question) => /icon/i.test(question),
    askText: async () => answers.shift(),
  });
  assert.equal(result.iconPath, path.resolve(FIXTURE));
  assert.equal(answers.length, 0);
});

test('collectBrandingOptions: --icon flag skips icon confirm', async () => {
  const confirms = [];
  const result = await collectBrandingOptions({
    iconPath: FIXTURE,
    askYesNo: async (question) => {
      confirms.push(question);
      return false;
    },
  });
  assert.equal(result.iconPath, path.resolve(FIXTURE));
  assert.equal(confirms.length, 1);
  assert.match(confirms[0], /splash/i);
});
test('applyIcon: dry-run writes nothing', async () => {
  const dir = fakeProject();
  const result = await applyIcon(dir, FIXTURE, { dryRun: true });
  assert.equal(result.status, 'skipped');
  assert.match(result.detail, /would/i);
  assert.equal(
    fs.existsSync(path.join(dir, 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png')),
    false,
  );
});

test('applyIcon: writes Android mipmaps and iOS icons', async () => {
  const dir = fakeProject();
  const result = await applyIcon(dir, FIXTURE, {});
  assert.equal(result.status, 'applied');

  for (const density of ANDROID_MIPMAPS) {
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      assert.ok(
        fs.existsSync(path.join(dir, 'android/app/src/main/res', density, name)),
        `${density}/${name} should exist`,
      );
    }
  }

  const iconSet = path.join(dir, 'ios/FakeApp/Images.xcassets/AppIcon.appiconset');
  assert.ok(fs.existsSync(path.join(iconSet, 'icon-60@2x.png')));
  assert.ok(fs.existsSync(path.join(iconSet, 'icon-1024.png')));
});

test('applyIcon: records filenames in Contents.json so Xcode uses them', async () => {
  const dir = fakeProject();
  await applyIcon(dir, FIXTURE, {});
  const contents = JSON.parse(
    fs.readFileSync(
      path.join(dir, 'ios/FakeApp/Images.xcassets/AppIcon.appiconset/Contents.json'),
      'utf8',
    ),
  );
  assert.ok(contents.images.every((image) => image.filename));
});

test('applyBranding: dry-run reports skipped even before the project exists', async () => {
  const missing = path.join(os.tmpdir(), 'crns-not-created-yet');
  const results = await applyBranding(
    missing,
    { iconPath: FIXTURE, splashPath: FIXTURE, splashPackage: 'native' },
    { dryRun: true },
  );
  assert.equal(results.length, 2);
  assert.ok(results.every((entry) => entry.status === 'skipped'));
});

test('applyIcon: fails cleanly when native folders are absent', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crns-empty-'));
  const result = await applyIcon(dir, FIXTURE, {});
  assert.equal(result.status, 'failed');
  assert.match(result.detail, /No android res|AppIcon/);
});

test('applySplash: dry-run writes nothing', async () => {
  const dir = fakeProject();
  const result = await applySplash(dir, FIXTURE, { dryRun: true });
  assert.equal(result.status, 'skipped');
  assert.equal(
    fs.existsSync(path.join(dir, 'android/app/src/main/res/drawable-mdpi/splash_image.png')),
    false,
  );
});

test('applySplash: writes drawables, theme, imageset and storyboard', async () => {
  const dir = fakeProject();
  const result = await applySplash(dir, FIXTURE, {});
  assert.equal(result.status, 'applied');

  assert.ok(
    fs.existsSync(path.join(dir, 'android/app/src/main/res/drawable-xxhdpi/splash_image.png')),
  );
  assert.ok(fs.existsSync(path.join(dir, 'android/app/src/main/res/drawable/splash.xml')));

  const styles = fs.readFileSync(
    path.join(dir, 'android/app/src/main/res/values/styles.xml'),
    'utf8',
  );
  assert.match(styles, /android:windowBackground">@drawable\/splash</);

  const imageSet = path.join(dir, 'ios/FakeApp/Images.xcassets/Splash.imageset');
  assert.ok(fs.existsSync(path.join(imageSet, 'splash@3x.png')));
  assert.ok(fs.existsSync(path.join(imageSet, 'Contents.json')));

  const storyboard = fs.readFileSync(
    path.join(dir, 'ios/FakeApp/LaunchScreen.storyboard'),
    'utf8',
  );
  assert.match(storyboard, /image="Splash"/);
});

test('applySplash: does not duplicate the theme item when run twice', async () => {
  const dir = fakeProject();
  await applySplash(dir, FIXTURE, {});
  await applySplash(dir, FIXTURE, {});
  const styles = fs.readFileSync(
    path.join(dir, 'android/app/src/main/res/values/styles.xml'),
    'utf8',
  );
  assert.equal(styles.split('android:windowBackground').length - 1, 1);
});

test('applyBranding: returns a report entry per requested image', async () => {
  const dir = fakeProject();
  const results = await applyBranding(
    dir,
    { iconPath: FIXTURE, splashPath: FIXTURE, splashPackage: 'native' },
    {},
  );
  assert.deepEqual(
    results.map((entry) => entry.type),
    ['appIcon', 'splashScreen'],
  );
  assert.ok(results.every((entry) => entry.packageId === 'branding'));
  assert.ok(results.every((entry) => entry.status === 'applied'));
});

test('applyBranding: no images means no entries', async () => {
  const dir = fakeProject();
  assert.deepEqual(await applyBranding(dir, {}, {}), []);
});
