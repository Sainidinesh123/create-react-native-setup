import test from 'node:test';
import assert from 'node:assert/strict';
import { formatReport, collectManualActions } from '../src/report.js';

test('formatReport includes installed and skipped', () => {
  const text = formatReport({
    projectName: 'Demo',
    projectPath: '/tmp/Demo',
    reactNativeVersion: '0.76.0',
    packageManager: 'npm',
    dryRun: true,
    durationMs: 1500,
    installed: [{ name: 'axios', version: '1.0.0', reason: 'latest' }],
    skipped: [{ name: 'bad', reason: 'incompatible' }],
    setup: [
      { packageId: 'x', type: 'docs', status: 'applied', detail: 'Docs', manualAction: 'https://example.com' },
    ],
  });
  assert.match(text, /Demo/);
  assert.match(text, /axios@1\.0\.0/);
  assert.match(text, /bad/);
  assert.match(text, /https:\/\/example\.com/);
});

test('collectManualActions dedupes', () => {
  const items = collectManualActions({
    setup: [
      { manualAction: 'https://a.com' },
      { manualAction: 'https://a.com' },
      { status: 'failed', packageId: 'p', type: 'babelPlugin', detail: 'oops' },
    ],
    skipped: [],
  });
  assert.equal(items.filter((i) => i === 'https://a.com').length, 1);
  assert.ok(items.some((i) => /oops/.test(i)));
});
