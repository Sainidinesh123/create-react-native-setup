import test from 'node:test';
import assert from 'node:assert/strict';
import {
  peersCompatible,
  resolveCompatibleVersion,
  resolveSelectedPackages,
} from '../src/resolveVersions.js';

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
    },
  );
  assert.equal(result.skipped, true);
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
    },
  );
  assert.equal(resolved.length, 2);
  assert.equal(skipped.length, 0);
  assert.equal(resolved.filter((r) => r.name === 'react-native-screens').length, 1);
});
