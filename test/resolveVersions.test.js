import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLatestReactNativeVersion,
  peersCompatible,
  resolveCompatibleVersion,
  resolveSelectedPackages,
} from '../src/resolveVersions.js';

const noLatest = async () => undefined;

test('peersCompatible: missing peers ok', () => {
  assert.equal(peersCompatible({}, { reactNative: '0.76.0', react: '18.3.1' }), true);
});

test('peersCompatible: matching range', () => {
  assert.equal(
    peersCompatible(
      { 'react-native': '>=0.74.0' },
      { reactNative: '0.76.0', react: '18.3.1' },
    ),
    true,
  );
});

test('peersCompatible: mismatch', () => {
  assert.equal(
    peersCompatible(
      { 'react-native': '>=0.80.0' },
      { reactNative: '0.76.0', react: '18.3.1' },
    ),
    false,
  );
});

test('resolveCompatibleVersion: picks latest compatible', async () => {
  const result = await resolveCompatibleVersion(
    'demo-pkg',
    { reactNative: '0.76.0', react: '18.3.1' },
    {
      fetchVersions: async () => ['1.0.0', '2.0.0', '2.1.0-beta.1'],
      fetchPeers: async (_n, version) => {
        if (version === '2.0.0') return { 'react-native': '>=0.80.0' };
        return { 'react-native': '>=0.70.0' };
      },
      fetchLatest: noLatest,
    },
  );
  assert.equal(result.version, '1.0.0');
  assert.match(result.reason, /incompatible/);
});

test('resolveCompatibleVersion: skips when none compatible', async () => {
  const result = await resolveCompatibleVersion(
    'demo-pkg',
    { reactNative: '0.76.0' },
    {
      fetchVersions: async () => ['1.0.0'],
      fetchPeers: async () => ({ 'react-native': '>=0.90.0' }),
      fetchLatest: noLatest,
    },
  );
  assert.equal(result.skipped, true);
});

test('resolveCompatibleVersion: ignores versions above the latest dist-tag', async () => {
  const result = await resolveCompatibleVersion(
    'demo-pkg',
    { reactNative: '0.86.2', react: '19.0.0' },
    {
      fetchVersions: async () => ['1.0.0', '2.0.0', '1000.0.0'],
      fetchPeers: async () => ({}),
      fetchLatest: async () => '2.0.0',
    },
  );
  assert.equal(result.version, '2.0.0');
});

test('resolveSelectedPackages: dedupes peers', async () => {
  const { resolved, skipped } = await resolveSelectedPackages(
    [
      { id: 'nav', npm: ['@react-navigation/native'], peers: ['react-native-screens'] },
      { id: 'screens', npm: ['react-native-screens'], peers: [] },
    ],
    { reactNative: '0.76.0', react: '18.3.1' },
    {
      fetchVersions: async () => ['1.0.0'],
      fetchPeers: async () => ({}),
      fetchLatest: noLatest,
    },
  );
  assert.equal(resolved.length, 2);
  assert.equal(skipped.length, 0);
  assert.equal(resolved.filter((r) => r.name === 'react-native-screens').length, 1);
});

test('resolveCompatibleVersion: honors a required peer range', async () => {
  const result = await resolveCompatibleVersion(
    'demo-worklets',
    { reactNative: '0.86.2', react: '19.0.0' },
    {
      fetchVersions: async () => ['0.9.0', '0.11.3', '1.0.0'],
      fetchPeers: async () => ({}),
      fetchLatest: noLatest,
      range: '0.10.x - 0.11.x',
    },
  );
  assert.equal(result.version, '0.11.3');
});

test('resolveSelectedPackages: installs a required peer such as react-native-worklets', async () => {
  const { resolved, skipped } = await resolveSelectedPackages(
    [{ id: 'reanimated', npm: ['react-native-reanimated'], peers: [] }],
    { reactNative: '0.86.2', react: '19.0.0' },
    {
      fetchVersions: async (name) =>
        name === 'react-native-reanimated' ? ['4.5.3'] : ['0.11.3', '1.0.0'],
      fetchPeers: async (name) =>
        name === 'react-native-reanimated'
          ? { react: '*', 'react-native': '0.83 - 0.86', 'react-native-worklets': '0.10.x - 0.11.x' }
          : {},
      fetchPeerMeta: async () => new Set(),
      fetchLatest: noLatest,
    },
  );

  assert.equal(skipped.length, 0);
  const worklets = resolved.find((item) => item.name === 'react-native-worklets');
  assert.ok(worklets, 'react-native-worklets should be installed');
  assert.equal(worklets.version, '0.11.3');
  assert.match(worklets.reason, /peer of react-native-reanimated/);
});

test('resolveSelectedPackages: ignores template-provided and optional peers', async () => {
  const { resolved } = await resolveSelectedPackages(
    [{ id: 'demo', npm: ['demo-pkg'], peers: [] }],
    { reactNative: '0.86.2', react: '19.0.0' },
    {
      fetchVersions: async () => ['1.0.0'],
      fetchPeers: async (name) =>
        name === 'demo-pkg'
          ? { react: '*', 'react-native': '*', '@babel/core': '^7.0.0', expo: '*' }
          : {},
      fetchPeerMeta: async () => new Set(['expo']),
      fetchLatest: noLatest,
    },
  );

  assert.deepEqual(
    resolved.map((item) => item.name),
    ['demo-pkg'],
  );
});

test('getLatestReactNativeVersion: prefers the latest dist-tag', async () => {
  const version = await getLatestReactNativeVersion(
    async () => ['0.85.0', '0.86.2', '1000.0.0'],
    async () => '0.86.2',
  );
  assert.equal(version, '0.86.2');
});

test('getLatestReactNativeVersion: ignores placeholder versions without a dist-tag', async () => {
  const version = await getLatestReactNativeVersion(
    async () => ['0.85.0', '0.86.2', '1000.0.0'],
    noLatest,
  );
  assert.equal(version, '0.86.2');
});

test('getLatestReactNativeVersion: throws when no stable version exists', async () => {
  await assert.rejects(
    () => getLatestReactNativeVersion(async () => ['0.87.0-rc.3'], noLatest),
    /stable react-native version/,
  );
});
