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
