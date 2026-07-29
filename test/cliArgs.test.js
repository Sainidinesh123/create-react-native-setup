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
