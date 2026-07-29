import fs from 'node:fs';
import path from 'node:path';

/**
 * Detect package manager from lockfiles in the project.
 * @param {string} projectPath
 * @returns {'npm' | 'yarn' | 'pnpm'}
 */
export function detectPackageManager(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  return 'npm';
}

/**
 * @param {'npm'|'yarn'|'pnpm'} pm
 * @param {{ name: string, version: string }[]} packages
 */
export function buildInstallArgs(pm, packages) {
  const specs = packages.map((p) => `${p.name}@${p.version}`);
  if (pm === 'yarn' || pm === 'pnpm') {
    return ['add', ...specs];
  }
  return ['install', ...specs];
}

export function installCommand(pm) {
  if (pm === 'yarn') return 'yarn';
  if (pm === 'pnpm') return 'pnpm';
  return 'npm';
}
