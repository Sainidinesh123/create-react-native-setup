import fs from 'node:fs';
import path from 'node:path';

/**
 * The iOS app source directory, which is `ios/<ProjectName>` in the bare
 * template but may be named differently in an existing project.
 * @param {string} projectPath
 * @param {string} [projectName]
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

/** @returns {string | null} the app target entitlements file, when the template has one. */
export function findEntitlements(projectPath, projectName) {
  const appDir = findIosAppDir(projectPath, projectName);
  if (!appDir) return null;
  const entry = fs
    .readdirSync(appDir)
    .find((name) => name.endsWith('.entitlements'));
  return entry ? path.join(appDir, entry) : null;
}

/** @returns {string} `android/app/src/main/AndroidManifest.xml` (may not exist). */
export function androidManifestPath(projectPath) {
  return path.join(projectPath, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
}
