import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyNotifications,
  ensureNotificationsImport,
  writeNotificationsBootstrap,
} from '../src/notifications/index.js';
import { buildBootstrapSource } from '../src/notifications/writeBootstrap.js';
import { fakeNativeProject } from './helpers/fakeNativeProject.js';

const read = (dir, relative) => fs.readFileSync(path.join(dir, relative), 'utf8');

test('buildBootstrapSource: includes messaging and notifee pieces', () => {
  const both = buildBootstrapSource({ hasMessaging: true, hasNotifee: true });
  assert.match(both, /@react-native-firebase\/messaging/);
  assert.match(both, /@notifee\/react-native/);
  assert.match(both, /requestPermission/);
  assert.match(both, /createChannel/);
});

test('writeNotificationsBootstrap: creates src/notifications.js', async () => {
  const dir = fakeNativeProject();
  const result = await writeNotificationsBootstrap(dir, {
    hasMessaging: true,
    hasNotifee: false,
  });
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'src/notifications.js')));
  assert.match(read(dir, 'src/notifications.js'), /messaging/);
});

test('writeNotificationsBootstrap: uses .ts when the project is TypeScript', async () => {
  const dir = fakeNativeProject({ typescript: true });
  const result = await writeNotificationsBootstrap(dir, {
    hasMessaging: false,
    hasNotifee: true,
  });
  assert.equal(result.status, 'applied');
  assert.ok(fs.existsSync(path.join(dir, 'src/notifications.ts')));
});

test('writeNotificationsBootstrap: does not overwrite an existing file', async () => {
  const dir = fakeNativeProject();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/notifications.js'), '// keep\n');
  const result = await writeNotificationsBootstrap(dir, { hasMessaging: true });
  assert.equal(result.status, 'skipped');
  assert.equal(read(dir, 'src/notifications.js'), '// keep\n');
});

test('writeNotificationsBootstrap: dry-run writes nothing', async () => {
  const dir = fakeNativeProject();
  const result = await writeNotificationsBootstrap(dir, {
    hasMessaging: true,
    dryRun: true,
  });
  assert.equal(result.status, 'skipped');
  assert.equal(fs.existsSync(path.join(dir, 'src/notifications.js')), false);
});

test('ensureNotificationsImport: is idempotent', async () => {
  const dir = fakeNativeProject();
  const first = await ensureNotificationsImport(dir, './src/notifications', {});
  assert.equal(first.status, 'applied');
  const second = await ensureNotificationsImport(dir, './src/notifications', {});
  assert.equal(second.status, 'already-applied');
  assert.equal(read(dir, 'index.js').split('./src/notifications').length - 1, 1);
});

test('applyNotifications: wires native + bootstrap for messaging', async () => {
  const dir = fakeNativeProject({ name: 'Demo' });
  const results = await applyNotifications(dir, 'Demo', {
    packageIds: ['firebase-messaging'],
  });
  assert.ok(results.some((r) => r.type === 'messagingIos' && r.status === 'applied'));
  assert.ok(results.some((r) => r.type === 'notificationsBootstrap' && r.status === 'applied'));
  assert.ok(results.some((r) => r.type === 'notificationsImport' && r.status === 'applied'));
  assert.ok(results.some((r) => r.type === 'messagingManual' && /APNs/.test(r.manualAction)));
  assert.match(read(dir, 'index.js'), /src\/notifications/);
});

test('applyNotifications: does nothing without package ids', async () => {
  const dir = fakeNativeProject();
  assert.deepEqual(await applyNotifications(dir, 'Demo', { packageIds: [] }), []);
});
