import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidProjectName,
  resolveReactNativeVersion,
  selectPackages,
} from '../src/prompt.js';
import { loadCatalog } from '../src/catalog.js';

const availableVersions = async () => ['0.80.3', '0.81.6', '0.86.2', '0.87.0-rc.3'];
const latestVersion = async () => '0.86.2';

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

test('resolveReactNativeVersion: --yes uses latest without prompting', async () => {
  let asked = 0;
  const version = await resolveReactNativeVersion({
    yes: true,
    fetchLatest: latestVersion,
    fetchVersions: availableVersions,
    askText: async () => {
      asked += 1;
      return '';
    },
  });
  assert.equal(version, '0.86.2');
  assert.equal(asked, 0);
});

test('resolveReactNativeVersion: explicit "latest" resolves to newest stable', async () => {
  const version = await resolveReactNativeVersion({
    requested: 'latest',
    fetchLatest: latestVersion,
    fetchVersions: availableVersions,
  });
  assert.equal(version, '0.86.2');
});

test('resolveReactNativeVersion: explicit version is used as-is', async () => {
  const version = await resolveReactNativeVersion({
    requested: '0.81.6',
    fetchLatest: latestVersion,
    fetchVersions: availableVersions,
  });
  assert.equal(version, '0.81.6');
});

test('resolveReactNativeVersion: unpublished explicit version throws', async () => {
  await assert.rejects(
    () =>
      resolveReactNativeVersion({
        requested: '0.99.99',
        fetchLatest: latestVersion,
        fetchVersions: availableVersions,
      }),
    /not published/i,
  );
});

test('resolveReactNativeVersion: empty prompt answer keeps latest', async () => {
  const version = await resolveReactNativeVersion({
    fetchLatest: latestVersion,
    fetchVersions: availableVersions,
    askText: async () => '',
  });
  assert.equal(version, '0.86.2');
});

test('resolveReactNativeVersion: prompt accepts a specific version', async () => {
  const version = await resolveReactNativeVersion({
    fetchLatest: latestVersion,
    fetchVersions: availableVersions,
    askText: async () => '0.80.3',
  });
  assert.equal(version, '0.80.3');
});

test('resolveReactNativeVersion: prompt re-asks after an invalid answer', async () => {
  const answers = ['0.99.99', '0.81.6'];
  const version = await resolveReactNativeVersion({
    fetchLatest: latestVersion,
    fetchVersions: availableVersions,
    askText: async () => answers.shift(),
  });
  assert.equal(version, '0.81.6');
  assert.equal(answers.length, 0);
});
