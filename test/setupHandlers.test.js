import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { babelPlugin } from '../src/setup/babelPlugin.js';
import { importInEntry } from '../src/setup/importInEntry.js';
import { androidPermission } from '../src/setup/androidPermission.js';
import { infoPlist } from '../src/setup/infoPlist.js';

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'crs-'));
}

test('babelPlugin: applies and is idempotent', async () => {
  const dir = tempProject();
  fs.writeFileSync(
    path.join(dir, 'babel.config.js'),
    "module.exports = { presets: ['module:@react-native/babel-preset'], plugins: [] };\n",
  );
  const step = { plugin: 'react-native-reanimated/plugin', position: 'last' };
  const first = await babelPlugin(dir, step);
  assert.equal(first.status, 'applied');
  const second = await babelPlugin(dir, step);
  assert.equal(second.status, 'already-applied');
  const content = fs.readFileSync(path.join(dir, 'babel.config.js'), 'utf8');
  assert.equal(content.split('react-native-reanimated/plugin').length - 1, 1);
});

test('importInEntry: applies and is idempotent', async () => {
  const dir = tempProject();
  fs.writeFileSync(path.join(dir, 'index.js'), "import { AppRegistry } from 'react-native';\n");
  const step = { import: 'react-native-gesture-handler' };
  const first = await importInEntry(dir, step);
  assert.equal(first.status, 'applied');
  const second = await importInEntry(dir, step);
  assert.equal(second.status, 'already-applied');
  const content = fs.readFileSync(path.join(dir, 'index.js'), 'utf8');
  assert.ok(content.startsWith("import 'react-native-gesture-handler';"));
});

test('androidPermission: applies and is idempotent', async () => {
  const dir = tempProject();
  const manifestDir = path.join(dir, 'android', 'app', 'src', 'main');
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(
    path.join(manifestDir, 'AndroidManifest.xml'),
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n</manifest>\n',
  );
  const step = { permission: 'android.permission.CAMERA' };
  const first = await androidPermission(dir, step);
  assert.equal(first.status, 'applied');
  const second = await androidPermission(dir, step);
  assert.equal(second.status, 'already-applied');
});

test('infoPlist: applies and is idempotent', async () => {
  const dir = tempProject();
  const plistDir = path.join(dir, 'ios', 'MyApp');
  fs.mkdirSync(plistDir, { recursive: true });
  fs.writeFileSync(
    path.join(plistDir, 'Info.plist'),
    '<?xml version="1.0"?>\n<plist><dict>\n</dict></plist>\n',
  );
  const step = { key: 'NSCameraUsageDescription', value: 'Need camera' };
  const first = await infoPlist(dir, step);
  assert.equal(first.status, 'applied');
  const second = await infoPlist(dir, step);
  assert.equal(second.status, 'already-applied');
});
