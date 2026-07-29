import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidProjectName, selectPackages } from '../src/prompt.js';
import { loadCatalog } from '../src/catalog.js';

test('isValidProjectName', () => {
  assert.equal(isValidProjectName('MyApp'), true);
  assert.equal(isValidProjectName('my_app-1'), true);
  assert.equal(isValidProjectName('1bad'), false);
  assert.equal(isValidProjectName('bad name'), false);
});

test('selectPackages --yes selects defaults only', async () => {
  const catalog = loadCatalog();
  const selected = await selectPackages(catalog, { yes: true });
  assert.ok(selected.some((p) => p.id === 'reanimated'));
  assert.ok(selected.some((p) => p.id === 'react-navigation'));
  assert.ok(!selected.some((p) => p.id === 'vision-camera'));
});
