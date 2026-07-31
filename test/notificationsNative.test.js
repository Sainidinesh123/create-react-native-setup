import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyMessagingNative,
  mergeBackgroundModes,
} from '../src/notifications/applyMessaging.js';
import { applyNotifeeNative } from '../src/notifications/applyNotifee.js';
import { fakeNativeProject } from './helpers/fakeNativeProject.js';

const read = (dir, relative) => fs.readFileSync(path.join(dir, relative), 'utf8');

test('mergeBackgroundModes: adds UIBackgroundModes idempotently', async () => {
  const dir = fakeNativeProject({ name: 'Demo' });
  const first = await mergeBackgroundModes(dir, 'Demo', {});
  assert.equal(first.status, 'applied');
  assert.match(first.manualAction, /Push Notifications/);

  const plist = read(dir, 'ios/Demo/Info.plist');
  assert.match(plist, /UIBackgroundModes/);
  assert.match(plist, /remote-notification/);
  assert.match(plist, /fetch/);

  const second = await mergeBackgroundModes(dir, 'Demo', {});
  assert.equal(second.status, 'already-applied');
  assert.equal(read(dir, 'ios/Demo/Info.plist'), plist);
});

test('mergeBackgroundModes: expands an existing array', async () => {
  const dir = fakeNativeProject({ name: 'Demo' });
  const plistPath = path.join(dir, 'ios/Demo/Info.plist');
  fs.writeFileSync(
    plistPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>UIBackgroundModes</key>
	<array>
		<string>fetch</string>
	</array>
</dict>
</plist>
`,
  );
  const result = await mergeBackgroundModes(dir, 'Demo', {});
  assert.equal(result.status, 'applied');
  assert.match(read(dir, 'ios/Demo/Info.plist'), /remote-notification/);
});

test('applyMessagingNative: Android failure does not skip iOS', async () => {
  const dir = fakeNativeProject({ name: 'Demo', android: false });
  const results = await applyMessagingNative(dir, 'Demo', {});
  const byType = Object.fromEntries(results.map((r) => [r.type, r]));
  assert.equal(byType.messagingAndroid.status, 'skipped');
  assert.equal(byType.messagingIos.status, 'applied');
});

test('applyMessagingNative: adds POST_NOTIFICATIONS and background modes', async () => {
  const dir = fakeNativeProject({ name: 'Demo' });
  const results = await applyMessagingNative(dir, 'Demo', {});
  assert.ok(results.every((r) => r.status === 'applied' || r.status === 'already-applied'));
  assert.match(read(dir, 'android/app/src/main/AndroidManifest.xml'), /POST_NOTIFICATIONS/);
  assert.match(read(dir, 'ios/Demo/Info.plist'), /remote-notification/);
});

test('applyMessagingNative: dry-run writes nothing', async () => {
  const dir = fakeNativeProject({ name: 'Demo' });
  const before = read(dir, 'ios/Demo/Info.plist');
  const results = await applyMessagingNative(dir, 'Demo', { dryRun: true });
  assert.ok(results.every((r) => r.status === 'skipped'));
  assert.equal(read(dir, 'ios/Demo/Info.plist'), before);
  assert.equal(
    read(dir, 'android/app/src/main/AndroidManifest.xml').includes('POST_NOTIFICATIONS'),
    false,
  );
});

test('applyNotifeeNative: ensures POST_NOTIFICATIONS idempotently', async () => {
  const dir = fakeNativeProject();
  const first = await applyNotifeeNative(dir, {});
  assert.equal(first[0].status, 'applied');
  const second = await applyNotifeeNative(dir, {});
  assert.equal(second[0].status, 'already-applied');
});
