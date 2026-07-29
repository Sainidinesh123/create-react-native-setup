import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * @param {string} question
 * @param {{ defaultYes?: boolean }} [opts]
 */
export async function askYesNo(question, opts = {}) {
  const defaultYes = opts.defaultYes !== false;
  const suffix = defaultYes ? 'Y/n' : 'y/N';
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(`${question} (${suffix}): `)).trim().toLowerCase();
    if (!answer) {
      return defaultYes;
    }
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * @param {string} [initial]
 */
export async function askProjectName(initial) {
  if (initial && isValidProjectName(initial)) {
    return initial;
  }
  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      const name = (await rl.question('Project name: ')).trim();
      if (isValidProjectName(name)) {
        return name;
      }
      console.log(
        'Invalid name. Use letters, numbers, underscore, or hyphen; must start with a letter.',
      );
    }
  } finally {
    rl.close();
  }
}

export function isValidProjectName(name) {
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/.test(name);
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
