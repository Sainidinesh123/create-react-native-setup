import path from 'node:path';
import fs from 'node:fs';
import { isMacOS } from '../platform.js';
import { runCommand } from '../createProject.js';

/**
 * @param {string} projectPath
 * @param {object} [_step]
 * @param {{ dryRun?: boolean, run?: typeof runCommand }} [options]
 */
export async function podInstall(projectPath, _step = {}, options = {}) {
  const iosPath = path.join(projectPath, 'ios');
  if (!fs.existsSync(iosPath)) {
    return { status: 'skipped', detail: 'No ios/ directory' };
  }
  if (!isMacOS()) {
    return {
      status: 'skipped',
      detail: 'pod install skipped (not macOS). Run on macOS when building iOS.',
    };
  }
  if (options.dryRun) {
    return { status: 'skipped', detail: 'pod install skipped (dry-run)' };
  }

  const run = options.run || runCommand;
  try {
    await run('pod', ['install'], { cwd: iosPath });
    return { status: 'applied', detail: 'pod install completed in ios/' };
  } catch (error) {
    return {
      status: 'failed',
      detail: `pod install failed: ${error.message}`,
    };
  }
}
