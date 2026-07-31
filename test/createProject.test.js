import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInitArgs } from '../src/createProject.js';

test('buildInitArgs: pins the requested React Native version', () => {
  const args = buildInitArgs('MyApp', '0.81.6');
  assert.deepEqual(args, [
    '--yes',
    '@react-native-community/cli@latest',
    'init',
    'MyApp',
    '--version',
    '0.81.6',
    '--skip-install',
    '--pm',
    'npm',
  ]);
});

test('buildInitArgs: omits --version when none is given', () => {
  const args = buildInitArgs('MyApp');
  assert.ok(!args.includes('--version'));
  assert.ok(args.includes('MyApp'));
});
