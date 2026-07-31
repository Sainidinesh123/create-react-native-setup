import fs from 'node:fs';
import path from 'node:path';
import {
  GOOGLE_SERVICES_BASENAME,
  GOOGLE_SERVICE_INFO_BASENAME,
} from './validateConfig.js';

/**
 * The iOS app source directory, which is `ios/<ProjectName>` in the bare
 * template but may be named differently in an existing project.
 * @returns {string | null}
 */
export function findIosAppDir(projectPath, projectName) {
  const iosRoot = path.join(projectPath, 'ios');
  if (!fs.existsSync(iosRoot)) return null;

  const named = path.join(iosRoot, projectName || '');
  if (projectName && fs.existsSync(named) && fs.statSync(named).isDirectory()) {
    return named;
  }

  for (const entry of fs.readdirSync(iosRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'Pods' || entry.name === 'build') continue;
    if (entry.name.endsWith('.xcodeproj') || entry.name.endsWith('.xcworkspace')) continue;
    if (fs.existsSync(path.join(iosRoot, entry.name, 'Info.plist'))) {
      return path.join(iosRoot, entry.name);
    }
  }
  return null;
}

function copyInto(destinationDir, sourcePath, basename, projectPath, dryRun) {
  const destination = path.join(destinationDir, basename);
  const relative = path.relative(projectPath, destination);

  if (dryRun) {
    return { status: 'skipped', detail: `[dry-run] Would copy ${basename} to ${relative}` };
  }
  if (
    fs.existsSync(destination) &&
    fs.readFileSync(destination, 'utf8') === fs.readFileSync(sourcePath, 'utf8')
  ) {
    return { status: 'already-applied', detail: `${relative} is already up to date` };
  }

  fs.copyFileSync(sourcePath, destination);
  return { status: 'applied', detail: `Copied ${basename} to ${relative}` };
}

/**
 * @param {string} projectPath
 * @param {string} sourcePath absolute path to a validated google-services.json
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ status: string, detail: string }>}
 */
export async function copyGoogleServices(projectPath, sourcePath, options = {}) {
  const appDir = path.join(projectPath, 'android', 'app');
  if (!options.dryRun && !fs.existsSync(appDir)) {
    return { status: 'failed', detail: 'No android/app directory found' };
  }
  return copyInto(appDir, sourcePath, GOOGLE_SERVICES_BASENAME, projectPath, options.dryRun);
}

/**
 * @param {string} projectPath
 * @param {string} projectName
 * @param {string} sourcePath absolute path to a validated GoogleService-Info.plist
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ status: string, detail: string }>}
 */
export async function copyGoogleServiceInfo(projectPath, projectName, sourcePath, options = {}) {
  if (options.dryRun) {
    return {
      status: 'skipped',
      detail: `[dry-run] Would copy ${GOOGLE_SERVICE_INFO_BASENAME} to ios/${projectName}/`,
    };
  }

  const appDir = findIosAppDir(projectPath, projectName);
  if (!appDir) {
    return { status: 'failed', detail: 'Could not find the iOS app directory under ios/' };
  }
  return copyInto(appDir, sourcePath, GOOGLE_SERVICE_INFO_BASENAME, projectPath, false);
}
