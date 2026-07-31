import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import semver from 'semver';
import {
  defaultFetchVersions,
  defaultFetchLatest,
  getLatestReactNativeVersion,
} from './resolveVersions.js';

/**
 * All prompts share one readline interface and a line queue.
 * Readline emits every buffered line as soon as input arrives, so lines that are not
 * claimed by a pending question would otherwise be discarded — that silently truncates
 * the flow whenever stdin is a pipe rather than a terminal.
 */
let sharedInterface;
let pendingLines = [];
let lineWaiter;
let inputClosed = false;

function promptInterface() {
  if (!sharedInterface) {
    pendingLines = [];
    inputClosed = false;
    sharedInterface = readline.createInterface({ input, output });
    sharedInterface.on('line', (line) => {
      if (lineWaiter) {
        const resolve = lineWaiter;
        lineWaiter = undefined;
        resolve(line);
      } else {
        pendingLines.push(line);
      }
    });
    sharedInterface.on('close', () => {
      inputClosed = true;
      if (lineWaiter) {
        const resolve = lineWaiter;
        lineWaiter = undefined;
        resolve(undefined);
      }
    });
  }
  return sharedInterface;
}

/** Release stdin once all questions have been asked. */
export function closePrompts() {
  sharedInterface?.close();
  sharedInterface = undefined;
  lineWaiter = undefined;
  pendingLines = [];
  inputClosed = false;
}

function nextLine() {
  if (pendingLines.length) {
    return Promise.resolve(pendingLines.shift());
  }
  if (inputClosed) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    lineWaiter = resolve;
  });
}

/**
 * @param {string} question
 */
export async function askText(question) {
  promptInterface();
  output.write(question);
  const line = await nextLine();
  if (line === undefined) {
    throw new Error('Input ended before the prompt was answered');
  }
  return line.trim();
}

/**
 * @param {string} question
 * @param {{ defaultYes?: boolean }} [opts]
 */
export async function askYesNo(question, opts = {}) {
  const defaultYes = opts.defaultYes !== false;
  const suffix = defaultYes ? 'Y/n' : 'y/N';
  const answer = (await askText(`${question} (${suffix}): `)).toLowerCase();
  if (!answer) {
    return defaultYes;
  }
  return answer === 'y' || answer === 'yes';
}

/**
 * @param {string} [initial]
 */
export async function askProjectName(initial) {
  if (initial && isValidProjectName(initial)) {
    return initial;
  }
  while (true) {
    const name = await askText('Project name: ');
    if (isValidProjectName(name)) {
      return name;
    }
    console.log(
      'Invalid name. Use letters, numbers, underscore, or hyphen; must start with a letter.',
    );
  }
}

export function isValidProjectName(name) {
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/.test(name);
}

/**
 * Decide which React Native version to scaffold.
 * Uses `requested` when given, otherwise prompts (unless `yes`), defaulting to latest.
 * @param {{
 *   requested?: string,
 *   yes?: boolean,
 *   fetchVersions?: (name: string) => Promise<string[]>,
 *   fetchLatest?: (name: string) => Promise<string | undefined>,
 *   askText?: (question: string) => Promise<string>,
 * }} options
 * @returns {Promise<string>}
 */
export async function resolveReactNativeVersion(options = {}) {
  const fetchVersions = options.fetchVersions || defaultFetchVersions;
  const fetchLatest = options.fetchLatest || defaultFetchLatest;
  const ask = options.askText || askText;

  const latest = await getLatestReactNativeVersion(fetchVersions, fetchLatest);

  const requested = options.requested?.trim();
  if (requested) {
    if (requested.toLowerCase() === 'latest') {
      return latest;
    }
    await assertVersionPublished(requested, fetchVersions);
    return requested;
  }

  if (options.yes) {
    return latest;
  }

  while (true) {
    const answer = await ask(`React Native version (blank for latest ${latest}): `);
    if (!answer || answer.toLowerCase() === 'latest') {
      return latest;
    }
    try {
      await assertVersionPublished(answer, fetchVersions);
      return answer;
    } catch (error) {
      console.log(error.message);
    }
  }
}

async function assertVersionPublished(version, fetchVersions) {
  if (!semver.valid(version)) {
    throw new Error(`"${version}" is not a valid version. Use e.g. 0.86.2 or "latest".`);
  }
  const versions = await fetchVersions('react-native');
  if (!versions.includes(version)) {
    throw new Error(`react-native@${version} is not published on npm.`);
  }
}

/**
 * Select packages via group prompts (or defaults when yes=true).
 * @param {any} catalog
 * @param {{ yes?: boolean, ask?: typeof askYesNo }} options
 */
export async function selectPackages(catalog, options = {}) {
  const ask = options.ask || askYesNo;
  const selectedIds = new Set();

  if (options.yes) {
    for (const group of catalog.groups) {
      if (group.default) {
        for (const id of group.packages) {
          selectedIds.add(id);
        }
      }
    }
    for (const pkg of catalog.ungrouped) {
      if (pkg.default) {
        selectedIds.add(pkg.id);
      }
    }
    for (const pkg of catalog.packages) {
      if (pkg.default) {
        selectedIds.add(pkg.id);
      }
    }
    return [...selectedIds].map((id) => catalog.packageById.get(id));
  }

  for (const group of catalog.groups) {
    const ok = await ask(`Install ${group.label} packages?`, {
      defaultYes: group.default,
    });
    if (ok) {
      for (const id of group.packages) {
        selectedIds.add(id);
      }
    }
  }

  for (const pkg of catalog.ungrouped) {
    const ok = await ask(`Install ${pkg.label}?`, { defaultYes: pkg.default });
    if (ok) {
      selectedIds.add(pkg.id);
    }
  }

  return [...selectedIds].map((id) => catalog.packageById.get(id));
}
