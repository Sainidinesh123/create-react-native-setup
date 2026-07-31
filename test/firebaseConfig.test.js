import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateGoogleServicesPath,
  validateGoogleServiceInfoPath,
} from '../src/firebase/validateConfig.js';
import { copyGoogleServices, copyGoogleServiceInfo } from '../src/firebase/copyConfig.js';
import {
  fakeNativeProject,
  GOOGLE_SERVICES_FIXTURE,
  GOOGLE_SERVICE_INFO_FIXTURE,
} from './helpers/fakeNativeProject.js';

test('validateGoogleServicesPath: accepts the fixture', () => {
  const result = validateGoogleServicesPath(GOOGLE_SERVICES_FIXTURE);
  assert.equal(result.ok, true);
  assert.equal(result.absolutePath, GOOGLE_SERVICES_FIXTURE);
});

test('validateGoogleServicesPath: rejects a wrong basename', () => {
  const result = validateGoogleServicesPath(GOOGLE_SERVICE_INFO_FIXTURE);
  assert.equal(result.ok, false);
  assert.match(result.error, /google-services\.json/);
});

test('validateGoogleServicesPath: rejects a missing file', () => {
  const result = validateGoogleServicesPath('/tmp/nope/google-services.json');
  assert.equal(result.ok, false);
  assert.match(result.error, /not found/i);
});

test('validateGoogleServiceInfoPath: accepts the fixture and rejects blanks', () => {
  assert.equal(validateGoogleServiceInfoPath(GOOGLE_SERVICE_INFO_FIXTURE).ok, true);
  assert.equal(validateGoogleServiceInfoPath('  ').ok, false);
});

test('copyGoogleServices: writes android/app/google-services.json', async () => {
  const dir = fakeNativeProject();
  const result = await copyGoogleServices(dir, GOOGLE_SERVICES_FIXTURE, {});
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'android/app/google-services.json')));

  const second = await copyGoogleServices(dir, GOOGLE_SERVICES_FIXTURE, {});
  assert.equal(second.status, 'already-applied');
});

test('copyGoogleServices: dry-run writes nothing', async () => {
  const dir = fakeNativeProject();
  const result = await copyGoogleServices(dir, GOOGLE_SERVICES_FIXTURE, { dryRun: true });
  assert.equal(result.status, 'skipped');
  assert.equal(fs.existsSync(path.join(dir, 'android/app/google-services.json')), false);
});

test('copyGoogleServices: fails without an android/app directory', async () => {
  const dir = fakeNativeProject({ android: false });
  const result = await copyGoogleServices(dir, GOOGLE_SERVICES_FIXTURE, {});
  assert.equal(result.status, 'failed');
});

test('copyGoogleServiceInfo: writes ios/<Name>/GoogleService-Info.plist', async () => {
  const dir = fakeNativeProject({ name: 'Demo' });
  const result = await copyGoogleServiceInfo(dir, 'Demo', GOOGLE_SERVICE_INFO_FIXTURE, {});
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'ios/Demo/GoogleService-Info.plist')));
});

test('copyGoogleServiceInfo: finds the app dir when the name differs', async () => {
  const dir = fakeNativeProject({ name: 'Renamed' });
  const result = await copyGoogleServiceInfo(dir, 'Demo', GOOGLE_SERVICE_INFO_FIXTURE, {});
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'ios/Renamed/GoogleService-Info.plist')));
});

test('copyGoogleServiceInfo: fails without an ios directory', async () => {
  const dir = fakeNativeProject({ ios: false });
  const result = await copyGoogleServiceInfo(dir, 'Demo', GOOGLE_SERVICE_INFO_FIXTURE, {});
  assert.equal(result.status, 'failed');
});
