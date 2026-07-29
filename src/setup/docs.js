import { openUrl } from '../platform.js';

/**
 * @param {string} _projectPath
 * @param {{ url: string, open?: boolean }} step
 * @param {{ dryRun?: boolean, openBrowser?: boolean }} [options]
 */
export async function docs(_projectPath, step, options = {}) {
  const url = step.url;
  if (!url) {
    return { status: 'failed', detail: 'docs step missing url' };
  }

  let opened = false;
  if (!options.dryRun && options.openBrowser !== false && step.open === true) {
    opened = await openUrl(url);
  }

  return {
    status: 'applied',
    detail: opened ? `Opened docs: ${url}` : `Docs: ${url}`,
    manualAction: url,
  };
}
