import { stdin as defaultInput, stdout as defaultOutput } from 'node:process';
import { askYesNo as defaultAskYesNo, closePrompts } from '../prompt.js';

const UP_KEYS = new Set(['\u001b[A', 'k']);
const DOWN_KEYS = new Set(['\u001b[B', 'j']);
const CONFIRM_KEYS = new Set(['\r', '\n']);
const CANCEL_KEYS = new Set(['\u0003', '\u001b']);

/**
 * Pure key handling so the picker can be tested without a terminal.
 * @param {{ cursor: number, selected: Set<string>, done?: boolean, cancelled?: boolean }} state
 * @param {string} key
 * @param {Array<{ id: string }>} options
 */
export function reduceKey(state, key, options) {
  const next = { ...state, selected: new Set(state.selected) };

  if (CANCEL_KEYS.has(key)) {
    next.cancelled = true;
    next.done = true;
  } else if (CONFIRM_KEYS.has(key)) {
    next.done = true;
  } else if (UP_KEYS.has(key)) {
    next.cursor = (state.cursor - 1 + options.length) % options.length;
  } else if (DOWN_KEYS.has(key)) {
    next.cursor = (state.cursor + 1) % options.length;
  } else if (key === ' ') {
    const id = options[state.cursor].id;
    if (next.selected.has(id)) {
      next.selected.delete(id);
    } else {
      next.selected.add(id);
    }
  } else if (key === 'a') {
    const all = next.selected.size === options.length;
    next.selected = all ? new Set() : new Set(options.map((option) => option.id));
  }

  return next;
}

/**
 * @param {Array<{ id: string, label: string }>} options
 * @param {{ cursor: number, selected: Set<string> }} state
 * @returns {string[]}
 */
export function renderLines(options, state) {
  return options.map((option, index) => {
    const pointer = index === state.cursor ? '❯' : ' ';
    const marker = state.selected.has(option.id) ? '◉' : '◯';
    return `${pointer} ${marker} ${option.label}`;
  });
}

async function ttyMultiSelect(options, preselected, io) {
  const input = io.input || defaultInput;
  const output = io.output || defaultOutput;

  // Readline echoes and swallows keypresses, so it must not own stdin while the
  // picker reads raw keys. Later prompts recreate the interface on demand.
  closePrompts();

  let state = { cursor: 0, selected: new Set(preselected), done: false, cancelled: false };

  const draw = (first) => {
    if (!first) {
      output.write(`\u001b[${options.length}A`);
    }
    for (const line of renderLines(options, state)) {
      output.write(`\u001b[2K${line}\n`);
    }
  };

  output.write('Use ↑/↓ to move, Space to toggle, Enter to confirm.\n');
  draw(true);

  const wasRaw = input.isRaw;
  input.setRawMode(true);
  input.resume();
  input.setEncoding('utf8');

  try {
    await new Promise((resolve) => {
      const onData = (key) => {
        state = reduceKey(state, key, options);
        if (state.done) {
          input.off('data', onData);
          resolve();
          return;
        }
        draw(false);
      };
      input.on('data', onData);
    });
  } finally {
    input.setRawMode(Boolean(wasRaw));
    input.pause();
  }

  if (state.cancelled) {
    return [];
  }
  return options.filter((option) => state.selected.has(option.id)).map((option) => option.id);
}

/**
 * Pick zero or more options. Falls back to Yes/No questions when stdin is not a terminal.
 * @param {Array<{ id: string, label: string }>} options
 * @param {{
 *   preselected?: string[],
 *   isTTY?: boolean,
 *   askYesNo?: Function,
 *   input?: NodeJS.ReadStream,
 *   output?: NodeJS.WriteStream,
 * }} [io]
 * @returns {Promise<string[]>}
 */
export async function multiSelect(options, io = {}) {
  if (!options.length) return [];

  const preselected = io.preselected || [];
  const isTTY = io.isTTY ?? Boolean((io.input || defaultInput).isTTY);

  if (isTTY) {
    return ttyMultiSelect(options, preselected, io);
  }

  const confirm = io.askYesNo || defaultAskYesNo;
  const chosen = [];
  for (const option of options) {
    if (await confirm(`  ${option.label}?`, { defaultYes: preselected.includes(option.id) })) {
      chosen.push(option.id);
    }
  }
  return chosen;
}
