import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  applyBootSplash,
  ensureBootTheme,
  ensureManifestBootTheme,
  ensureMainActivityBootSplash,
  wireAndroidBootSplash,
} from '../src/branding/applyBootSplash.js';

const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'branding-source.png',
);

function bootsplashProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crns-bootsplash-'));
  const res = path.join(dir, 'android', 'app', 'src', 'main', 'res');
  fs.mkdirSync(path.join(res, 'values'), { recursive: true });
  fs.writeFileSync(
    path.join(res, 'values', 'styles.xml'),
    `<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    </style>
</resources>
`,
  );
  fs.writeFileSync(
    path.join(dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:name=".MainApplication">
      <activity
        android:name=".MainActivity"
        android:exported="true"
        android:theme="@style/AppTheme">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
    </application>
</manifest>
`,
  );
  const javaDir = path.join(dir, 'android', 'app', 'src', 'main', 'java', 'com', 'sample');
  fs.mkdirSync(javaDir, { recursive: true });
  fs.writeFileSync(
    path.join(javaDir, 'MainActivity.kt'),
    `package com.sample

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "Sample"
}
`,
  );
  fs.mkdirSync(path.join(dir, 'ios', 'Sample'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'ios', 'Sample', 'AppDelegate.swift'),
    `import UIKit
import React
import ReactAppDependencyProvider

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
}
`,
  );
  fs.writeFileSync(path.join(dir, 'App.tsx'), `export default function App() { return null }\n`);
  return dir;
}

test('ensureBootTheme: inserts BootTheme into styles.xml', () => {
  const dir = bootsplashProject();
  const result = ensureBootTheme(dir);
  assert.equal(result.status, 'applied');
  const styles = fs.readFileSync(
    path.join(dir, 'android/app/src/main/res/values/styles.xml'),
    'utf8',
  );
  assert.match(styles, /style name="BootTheme"/);
  assert.match(styles, /bootSplashBackground/);
  assert.match(styles, /bootSplashLogo/);
  assert.match(styles, /postBootSplashTheme/);
  assert.match(styles, /parent="Theme\.BootSplash"/);
  assert.doesNotMatch(styles, /EdgeToEdge/);
});

test('ensureBootTheme: rewrites obsolete EdgeToEdge parent', () => {
  const dir = bootsplashProject();
  const stylesPath = path.join(dir, 'android/app/src/main/res/values/styles.xml');
  fs.writeFileSync(
    stylesPath,
    `<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar"></style>
    <style name="BootTheme" parent="Theme.BootSplash.EdgeToEdge">
        <item name="bootSplashBackground">@color/bootsplash_background</item>
        <item name="bootSplashLogo">@drawable/bootsplash_logo</item>
        <item name="postBootSplashTheme">@style/AppTheme</item>
    </style>
</resources>
`,
  );
  const result = ensureBootTheme(dir);
  assert.ok(['applied', 'already-applied'].includes(result.status));
  const styles = fs.readFileSync(stylesPath, 'utf8');
  assert.match(styles, /parent="Theme\.BootSplash"/);
  assert.doesNotMatch(styles, /EdgeToEdge/);
});

test('ensureManifestBootTheme: switches MainActivity theme', () => {
  const dir = bootsplashProject();
  const result = ensureManifestBootTheme(dir);
  assert.equal(result.status, 'applied');
  const manifest = fs.readFileSync(
    path.join(dir, 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );
  assert.match(manifest, /android:name="\.MainActivity"/);
  assert.match(manifest, /android:theme="@style\/BootTheme"/);
});

test('ensureMainActivityBootSplash: adds RNBootSplash.init with BootTheme', () => {
  const dir = bootsplashProject();
  const result = ensureMainActivityBootSplash(dir);
  assert.equal(result.status, 'applied');
  const main = fs.readFileSync(
    path.join(dir, 'android/app/src/main/java/com/sample/MainActivity.kt'),
    'utf8',
  );
  assert.match(main, /import com\.zoontek\.rnbootsplash\.RNBootSplash/);
  assert.match(main, /RNBootSplash\.init\(this, R\.style\.BootTheme\)/);
  assert.match(main, /override fun onCreate/);
  assert.doesNotMatch(main, /import android\.R/);
});

test('wireAndroidBootSplash: full path creates BootTheme + logo + colors', async () => {
  const dir = bootsplashProject();
  const result = await wireAndroidBootSplash(dir, FIXTURE, '#ffffff', 100);
  assert.equal(result.status, 'applied');

  const styles = fs.readFileSync(
    path.join(dir, 'android/app/src/main/res/values/styles.xml'),
    'utf8',
  );
  assert.match(styles, /BootTheme/);

  const colors = fs.readFileSync(
    path.join(dir, 'android/app/src/main/res/values/colors.xml'),
    'utf8',
  );
  assert.match(colors, /bootsplash_background/);

  assert.equal(
    fs.existsSync(
      path.join(dir, 'android/app/src/main/res/drawable-xxhdpi/bootsplash_logo.png'),
    ),
    true,
  );

  const manifest = fs.readFileSync(
    path.join(dir, 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );
  assert.match(manifest, /@style\/BootTheme/);
});

test('applyBootSplash dry-run skips native writes', async () => {
  const dir = bootsplashProject();
  const results = await applyBootSplash(dir, FIXTURE, { dryRun: true });
  assert.ok(results.every((r) => r.status === 'skipped'));
  const styles = fs.readFileSync(
    path.join(dir, 'android/app/src/main/res/values/styles.xml'),
    'utf8',
  );
  assert.doesNotMatch(styles, /BootTheme/);
});
