import fs from 'node:fs';
import path from 'node:path';
import spawn from 'cross-spawn';
import { getLatestReactNativeVersion } from './resolveVersions.js';

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv }} [opts]
 */
export function runCommand(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts.cwd || process.cwd(),
      env: opts.env || process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

function coerceInstalledVersion(value) {
  if (!value) return undefined;
  const str = String(value);
  const at = str.lastIndexOf('@');
  if (str.startsWith('npm:') && at > 4) {
    return str.slice(at + 1);
  }
  return str.replace(/^[\^~>=<\s]*/, '');
}

/**
 * Create a React Native project with the latest stable CLI template.
 */
export async function createReactNativeProject(name, cwd, options = {}) {
  const projectPath = path.join(cwd, name);
  const run = options.run || runCommand;
  const getRnVersion = options.getRnVersion || getLatestReactNativeVersion;

  if (!options.dryRun && fs.existsSync(projectPath)) {
    throw new Error(`Directory already exists: ${projectPath}`);
  }

  if (options.dryRun) {
    const reactNativeVersion = await getRnVersion();
    return {
      projectPath,
      reactNativeVersion,
      reactVersion: undefined,
      dryRun: true,
    };
  }

  await run(
    'npx',
    [
      '--yes',
      '@react-native-community/cli@latest',
      'init',
      name,
      '--skip-install',
      '--pm',
      'npm',
    ],
    { cwd },
  );

  await run('npm', ['install'], { cwd: projectPath });

  const pkg = JSON.parse(
    fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'),
  );

  return {
    projectPath,
    reactNativeVersion: coerceInstalledVersion(pkg.dependencies?.['react-native']),
    reactVersion: coerceInstalledVersion(pkg.dependencies?.react),
    dryRun: false,
  };
}

export function readProjectVersions(projectPath) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'),
  );
  return {
    reactNative: coerceInstalledVersion(pkg.dependencies?.['react-native']),
    react: coerceInstalledVersion(pkg.dependencies?.react),
  };
}
