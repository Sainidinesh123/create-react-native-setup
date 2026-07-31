import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, validateCatalog } from '../src/catalog.js';

test('loadCatalog: default catalog validates', () => {
  const catalog = loadCatalog();
  assert.equal(catalog.version, 1);
  assert.ok(catalog.packages.length > 5);
  assert.ok(catalog.groups.some((g) => g.id === 'navigation'));
  assert.ok(catalog.packageById.get('reanimated'));
});

test('loadCatalog: includes the notifications group and packages', () => {
  const catalog = loadCatalog();
  assert.ok(catalog.groups.some((g) => g.id === 'notifications'));
  assert.equal(
    catalog.packageById.get('firebase-messaging').npm[0],
    '@react-native-firebase/messaging',
  );
  assert.equal(catalog.packageById.get('notifee').npm[0], '@notifee/react-native');
});

test('loadCatalog: vision-camera requires nitro peers and never pulls sentry', () => {
  const catalog = loadCatalog();
  const camera = catalog.packageById.get('vision-camera');
  assert.ok(camera);
  assert.deepEqual(
    camera.peers.map((peer) => (typeof peer === 'string' ? peer : peer.name)).sort(),
    ['react-native-nitro-image', 'react-native-nitro-modules'],
  );
  assert.equal(camera.npm.includes('@sentry/react-native'), false);
  assert.equal(
    camera.peers.some((peer) =>
      String(typeof peer === 'string' ? peer : peer.name).includes('sentry'),
    ),
    false,
  );

  const cameraGroup = catalog.groups.find((g) => g.id === 'camera');
  assert.deepEqual(cameraGroup.packages, ['vision-camera']);
  assert.equal(cameraGroup.packages.includes('sentry'), false);
});

test('validateCatalog: rejects unknown group package refs', () => {
  assert.throws(
    () =>
      validateCatalog({
        version: 1,
        groups: [{ id: 'g', label: 'G', packages: ['missing'] }],
        packages: [{ id: 'reanimated', label: 'R', npm: ['react-native-reanimated'] }],
      }),
    /unknown package/,
  );
});

test('validateCatalog: rejects duplicate package ids', () => {
  assert.throws(
    () =>
      validateCatalog({
        version: 1,
        groups: [],
        packages: [
          { id: 'a', label: 'A', npm: ['a'] },
          { id: 'a', label: 'A2', npm: ['a'] },
        ],
      }),
    /duplicate package id/,
  );
});
