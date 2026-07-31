import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/cliArgs.js';

test('parseArgs: empty defaults', () => {
  assert.deepEqual(parseArgs([]), {
    yes: false,
    dryRun: false,
    help: false,
    unknown: [],
  });
});

test('parseArgs: positional project name', () => {
  assert.equal(parseArgs(['CoolApp']).projectName, 'CoolApp');
});

test('parseArgs: --yes and --default and -y', () => {
  assert.equal(parseArgs(['--yes']).yes, true);
  assert.equal(parseArgs(['--default']).yes, true);
  assert.equal(parseArgs(['-y']).yes, true);
});

test('parseArgs: --dry-run', () => {
  assert.equal(parseArgs(['--dry-run']).dryRun, true);
});

test('parseArgs: --config path', () => {
  assert.equal(parseArgs(['--config', './c.json']).configPath, './c.json');
  assert.equal(parseArgs(['--config=./c.json']).configPath, './c.json');
});

test('parseArgs: --config without path throws', () => {
  assert.throws(() => parseArgs(['--config']), /requires a file path/);
});

test('parseArgs: --help', () => {
  assert.equal(parseArgs(['--help']).help, true);
});

test('parseArgs: combined flags', () => {
  const result = parseArgs(['MyApp', '--yes', '--dry-run', '--config', 'x.json']);
  assert.equal(result.projectName, 'MyApp');
  assert.equal(result.yes, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.configPath, 'x.json');
});

test('parseArgs: --rn-version', () => {
  assert.equal(parseArgs(['--rn-version', '0.81.0']).rnVersion, '0.81.0');
  assert.equal(parseArgs(['--rn-version=0.81.0']).rnVersion, '0.81.0');
});

test('parseArgs: --rn-version without value throws', () => {
  assert.throws(() => parseArgs(['--rn-version']), /requires a version/);
});

test('parseArgs: --icon and --splash paths', () => {
  const result = parseArgs(['MyApp', '--icon', './icon.png', '--splash', './splash.png']);
  assert.equal(result.iconPath, './icon.png');
  assert.equal(result.splashPath, './splash.png');
});

test('parseArgs: --icon= and --splash= forms', () => {
  const result = parseArgs(['--icon=./a.png', '--splash=./b.png']);
  assert.equal(result.iconPath, './a.png');
  assert.equal(result.splashPath, './b.png');
});

test('parseArgs: Firebase config flags', () => {
  const result = parseArgs([
    'App',
    '--google-services',
    './google-services.json',
    '--google-service-info',
    './GoogleService-Info.plist',
  ]);
  assert.equal(result.googleServicesPath, './google-services.json');
  assert.equal(result.googleServiceInfoPath, './GoogleService-Info.plist');
});

test('parseArgs: --notifications parses ids', () => {
  assert.deepEqual(parseArgs(['--notifications', 'messaging,notifee']).notificationIds, [
    'messaging',
    'notifee',
  ]);
  assert.deepEqual(parseArgs(['--notifications=messaging']).notificationIds, ['messaging']);
});

test('parseArgs: --notifications rejects unknown ids', () => {
  assert.throws(() => parseArgs(['--notifications', 'onesignal']), /unknown id/i);
});

test('parseArgs: --notifications without value throws', () => {
  assert.throws(() => parseArgs(['--notifications']), /comma-separated/i);
});

test('parseArgs: --icon without path throws', () => {
  assert.throws(() => parseArgs(['--icon']), /requires a file path/);
});

test('parseArgs: --splash without path throws', () => {
  assert.throws(() => parseArgs(['--splash']), /requires a file path/);
});
