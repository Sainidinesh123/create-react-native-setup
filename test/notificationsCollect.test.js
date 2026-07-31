import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/catalog.js';
import {
  collectNotificationOptions,
  ensureFirebaseAppSelected,
} from '../src/notifications/index.js';
import { multiSelect, reduceKey, renderLines } from '../src/notifications/multiSelect.js';

const OPTIONS = [
  { id: 'a', label: 'Package A' },
  { id: 'b', label: 'Package B' },
];

test('reduceKey: space toggles, arrows wrap, enter finishes', () => {
  let state = { cursor: 0, selected: new Set() };

  state = reduceKey(state, ' ', OPTIONS);
  assert.deepEqual([...state.selected], ['a']);

  state = reduceKey(state, ' ', OPTIONS);
  assert.deepEqual([...state.selected], []);

  state = reduceKey(state, '\u001b[A', OPTIONS);
  assert.equal(state.cursor, 1);

  state = reduceKey(state, '\u001b[B', OPTIONS);
  assert.equal(state.cursor, 0);

  state = reduceKey(state, '\r', OPTIONS);
  assert.equal(state.done, true);
  assert.equal(state.cancelled, undefined);
});

test('reduceKey: ctrl-c cancels', () => {
  const state = reduceKey({ cursor: 0, selected: new Set(['a']) }, '\u0003', OPTIONS);
  assert.equal(state.cancelled, true);
  assert.equal(state.done, true);
});

test('renderLines: marks the cursor and selection', () => {
  const lines = renderLines(OPTIONS, { cursor: 1, selected: new Set(['b']) });
  assert.deepEqual(lines, ['  ◯ Package A', '❯ ◉ Package B']);
});

test('multiSelect: falls back to yes/no questions without a TTY', async () => {
  const asked = [];
  const chosen = await multiSelect(OPTIONS, {
    isTTY: false,
    askYesNo: async (question) => {
      asked.push(question);
      return question.includes('Package A');
    },
  });
  assert.deepEqual(chosen, ['a']);
  assert.equal(asked.length, 2);
});

test('collectNotificationOptions: --yes without flags installs nothing', async () => {
  const result = await collectNotificationOptions({ yes: true, notificationsGroupSelected: true });
  assert.deepEqual(result.packageIds, []);
});

test('collectNotificationOptions: flags map to catalog ids', async () => {
  const result = await collectNotificationOptions({
    yes: true,
    notificationIds: ['messaging', 'notifee'],
  });
  assert.deepEqual(result.packageIds, ['firebase-messaging', 'notifee']);

  const single = await collectNotificationOptions({ notificationIds: ['notifee'] });
  assert.deepEqual(single.packageIds, ['notifee']);
});

test('collectNotificationOptions: no prompt when the group was declined', async () => {
  const result = await collectNotificationOptions({
    notificationsGroupSelected: false,
    multiSelect: async () => {
      throw new Error('should not prompt');
    },
  });
  assert.deepEqual(result.packageIds, []);
});

test('collectNotificationOptions: prompts when the group was accepted', async () => {
  let received;
  const result = await collectNotificationOptions({
    notificationsGroupSelected: true,
    multiSelect: async (options, io) => {
      received = { options, io };
      return ['notifee'];
    },
  });
  assert.deepEqual(result.packageIds, ['notifee']);
  assert.deepEqual(
    received.options.map((option) => option.id),
    ['firebase-messaging', 'notifee'],
  );
  assert.deepEqual(received.io.preselected, ['firebase-messaging', 'notifee']);
});

test('ensureFirebaseAppSelected: adds firebase-app for messaging only once', () => {
  const catalog = loadCatalog();
  const selected = ensureFirebaseAppSelected([], catalog, ['firebase-messaging']);
  assert.ok(selected.some((pkg) => pkg.id === 'firebase-app'));

  const again = ensureFirebaseAppSelected(selected, catalog, ['firebase-messaging']);
  assert.equal(again.filter((pkg) => pkg.id === 'firebase-app').length, 1);
});

test('ensureFirebaseAppSelected: leaves notifee-only selections alone', () => {
  const catalog = loadCatalog();
  assert.deepEqual(ensureFirebaseAppSelected([], catalog, ['notifee']), []);
});
