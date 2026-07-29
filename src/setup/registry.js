import { babelPlugin } from './babelPlugin.js';
import { importInEntry } from './importInEntry.js';
import { androidPermission } from './androidPermission.js';
import { infoPlist } from './infoPlist.js';
import { podInstall } from './podInstall.js';
import { docs } from './docs.js';

/** @type {Record<string, Function>} */
const handlers = {
  babelPlugin,
  importInEntry,
  androidPermission,
  infoPlist,
  podInstall,
  docs,
};

/**
 * @param {string} type
 * @param {Function} handler
 */
export function registerSetupHandler(type, handler) {
  handlers[type] = handler;
}

export function getSetupHandler(type) {
  return handlers[type];
}

/**
 * @param {Array<{ id: string, setup: object[] }>} selectedPackages
 * @param {string} projectPath
 * @param {{ dryRun?: boolean }} [options]
 */
export async function runSetupSteps(selectedPackages, projectPath, options = {}) {
  const results = [];
  let needsPods = false;

  for (const pkg of selectedPackages) {
    for (const step of pkg.setup || []) {
      if (step.type === 'podInstall') {
        needsPods = true;
        continue;
      }
      const handler = handlers[step.type];
      if (!handler) {
        results.push({
          packageId: pkg.id,
          type: step.type,
          status: 'failed',
          detail: `Unknown setup type "${step.type}". Register a handler or fix the catalog.`,
        });
        continue;
      }
      if (options.dryRun) {
        results.push({
          packageId: pkg.id,
          type: step.type,
          status: 'skipped',
          detail: `dry-run: would run ${step.type}`,
          manualAction: step.url,
        });
        continue;
      }
      try {
        const outcome = await handler(projectPath, step, options);
        results.push({
          packageId: pkg.id,
          type: step.type,
          ...outcome,
        });
      } catch (error) {
        results.push({
          packageId: pkg.id,
          type: step.type,
          status: 'failed',
          detail: error.message,
        });
      }
    }
  }

  if (!options.dryRun && (needsPods || selectedPackages.length > 0)) {
    const hasNativeHint = selectedPackages.some((pkg) =>
      (pkg.setup || []).some((s) =>
        ['androidPermission', 'infoPlist', 'podInstall', 'importInEntry', 'babelPlugin'].includes(
          s.type,
        ),
      ),
    );
    if (needsPods || hasNativeHint) {
      const outcome = await podInstall(projectPath, {}, options);
      results.push({
        packageId: '*',
        type: 'podInstall',
        ...outcome,
      });
    }
  } else if (options.dryRun && selectedPackages.length > 0) {
    results.push({
      packageId: '*',
      type: 'podInstall',
      status: 'skipped',
      detail: 'dry-run: would run pod install on macOS if ios/ exists',
    });
  }

  return results;
}
