import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyFirebase,
  applyFirebaseIos,
  applyGoogleServicesGradle,
  assertFirebaseFlagPaths,
  collectFirebaseOptions,
} from '../src/firebase/index.js';
import {
  fakeNativeProject,
  GOOGLE_SERVICES_FIXTURE,
  GOOGLE_SERVICE_INFO_FIXTURE,
} from './helpers/fakeNativeProject.js';

const read = (dir, relative) => fs.readFileSync(path.join(dir, relative), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;

test('applyGoogleServicesGradle: wires classpath and plugin idempotently', async () => {
  const dir = fakeNativeProject();

  const first = await applyGoogleServicesGradle(dir, {});
  assert.equal(first.status, 'applied');
  assert.equal(occurrences(read(dir, 'android/build.gradle'), 'com.google.gms:google-services'), 1);
  assert.equal(
    occurrences(read(dir, 'android/app/build.gradle'), 'com.google.gms.google-services'),
    1,
  );

  const second = await applyGoogleServicesGradle(dir, {});
  assert.equal(second.status, 'already-applied');
  assert.equal(occurrences(read(dir, 'android/build.gradle'), 'com.google.gms:google-services'), 1);
});

test('applyGoogleServicesGradle: dry-run leaves Gradle untouched', async () => {
  const dir = fakeNativeProject();
  const result = await applyGoogleServicesGradle(dir, { dryRun: true });
  assert.equal(result.status, 'skipped');
  assert.equal(read(dir, 'android/build.gradle').includes('google-services'), false);
});

test('applyGoogleServicesGradle: fails without Android files', async () => {
  const dir = fakeNativeProject({ android: false });
  assert.equal((await applyGoogleServicesGradle(dir, {})).status, 'failed');
});

test('applyFirebaseIos: configures the Swift AppDelegate idempotently', async () => {
  const dir = fakeNativeProject({ name: 'Demo' });

  const first = await applyFirebaseIos(dir, 'Demo', {});
  assert.equal(first.status, 'applied');
  assert.match(first.manualAction, /Xcode/);

  const appDelegate = read(dir, 'ios/Demo/AppDelegate.swift');
  assert.equal(occurrences(appDelegate, 'import FirebaseCore'), 1);
  assert.equal(occurrences(appDelegate, 'FirebaseApp.configure()'), 1);

  const second = await applyFirebaseIos(dir, 'Demo', {});
  assert.equal(second.status, 'already-applied');
  assert.equal(read(dir, 'ios/Demo/AppDelegate.swift'), appDelegate);
});

test('applyFirebase: an Android failure does not skip the iOS steps', async () => {
  const dir = fakeNativeProject({ name: 'Demo', android: false });
  const results = await applyFirebase(
    dir,
    'Demo',
    {
      googleServicesPath: GOOGLE_SERVICES_FIXTURE,
      googleServiceInfoPath: GOOGLE_SERVICE_INFO_FIXTURE,
    },
    {},
  );

  const byType = Object.fromEntries(results.map((r) => [r.type, r]));
  assert.equal(byType.firebaseAndroidConfig.status, 'failed');
  assert.equal(byType.firebaseIosConfig.status, 'applied');
  assert.equal(byType.firebaseIos.status, 'applied');
  assert.equal(byType.firebaseAndroidGradle, undefined);
});

test('applyFirebase: reports the APNs manual action for messaging', async () => {
  const dir = fakeNativeProject({ name: 'Demo' });
  const results = await applyFirebase(
    dir,
    'Demo',
    { googleServiceInfoPath: GOOGLE_SERVICE_INFO_FIXTURE },
    { includeMessagingManual: true },
  );
  assert.ok(results.some((r) => r.type === 'firebaseManual' && /APNs/.test(r.manualAction)));
});

test('applyFirebase: does nothing without config paths', async () => {
  const dir = fakeNativeProject();
  assert.deepEqual(await applyFirebase(dir, 'Demo', {}, {}), []);
});

test('collectFirebaseOptions: --yes without flags returns nothing', async () => {
  assert.deepEqual(await collectFirebaseOptions({ yes: true, firebaseSelected: true }), {});
});

test('collectFirebaseOptions: skips prompting when Firebase is not selected', async () => {
  const result = await collectFirebaseOptions({
    firebaseSelected: false,
    askYesNo: async () => {
      throw new Error('should not prompt');
    },
  });
  assert.deepEqual(result, {});
});

test('collectFirebaseOptions: validates flag paths', async () => {
  const result = await collectFirebaseOptions({
    yes: true,
    googleServicesPath: GOOGLE_SERVICES_FIXTURE,
  });
  assert.equal(result.googleServicesPath, GOOGLE_SERVICES_FIXTURE);
  await assert.rejects(
    () => collectFirebaseOptions({ yes: true, googleServicesPath: '/tmp/x.json' }),
    /google-services\.json/,
  );
});

test('collectFirebaseOptions: blank answers skip a platform', async () => {
  const asked = [];
  const result = await collectFirebaseOptions({
    firebaseSelected: true,
    askYesNo: async () => true,
    askText: async (question) => {
      asked.push(question);
      return question.includes('google-services.json') ? GOOGLE_SERVICES_FIXTURE : '';
    },
  });
  assert.equal(asked.length, 2);
  assert.equal(result.googleServicesPath, GOOGLE_SERVICES_FIXTURE);
  assert.equal(result.googleServiceInfoPath, undefined);
});

test('collectFirebaseOptions: re-asks after an invalid path', async () => {
  const answers = ['/tmp/nope.json', GOOGLE_SERVICES_FIXTURE, ''];
  const result = await collectFirebaseOptions({
    firebaseSelected: true,
    askYesNo: async () => true,
    askText: async () => answers.shift(),
  });
  assert.equal(result.googleServicesPath, GOOGLE_SERVICES_FIXTURE);
});

test('assertFirebaseFlagPaths: throws with the flag name', () => {
  assert.throws(
    () => assertFirebaseFlagPaths({ googleServiceInfoPath: '/tmp/nope.plist' }),
    /--google-service-info/,
  );
  assert.doesNotThrow(() =>
    assertFirebaseFlagPaths({ googleServicesPath: GOOGLE_SERVICES_FIXTURE }),
  );
});
