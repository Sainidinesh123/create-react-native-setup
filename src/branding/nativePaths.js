import fs from 'node:fs';
import path from 'node:path';

/** @returns {string | null} `android/app/src/main/res` when present. */
export function findAndroidResDir(projectPath) {
  const resDir = path.join(projectPath, 'android', 'app', 'src', 'main', 'res');
  return fs.existsSync(resDir) ? resDir : null;
}

/** @returns {string | null} `android/app/src/main/res/values/styles.xml` when present. */
export function findAndroidStyles(projectPath) {
  const resDir = findAndroidResDir(projectPath);
  if (!resDir) return null;
  const styles = path.join(resDir, 'values', 'styles.xml');
  return fs.existsSync(styles) ? styles : null;
}

/**
 * Depth-limited search for a directory or file inside `ios/`.
 * @param {string} projectPath
 * @param {string} targetName
 * @returns {string | null}
 */
function findInIos(projectPath, targetName) {
  const iosRoot = path.join(projectPath, 'ios');
  if (!fs.existsSync(iosRoot)) return null;

  const queue = [iosRoot];
  while (queue.length) {
    const dir = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.name === targetName) {
        return full;
      }
      if (entry.isDirectory() && entry.name !== 'Pods' && entry.name !== 'build') {
        queue.push(full);
      }
    }
  }
  return null;
}

/** @returns {string | null} path to `AppIcon.appiconset`. */
export function findAppIconSet(projectPath) {
  return findInIos(projectPath, 'AppIcon.appiconset');
}

/** @returns {string | null} path to `Images.xcassets`. */
export function findAssetCatalog(projectPath) {
  return findInIos(projectPath, 'Images.xcassets');
}

/** @returns {string | null} path to `LaunchScreen.storyboard`. */
export function findLaunchScreen(projectPath) {
  return findInIos(projectPath, 'LaunchScreen.storyboard');
}
