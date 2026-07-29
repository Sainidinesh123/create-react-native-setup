import os from 'node:os';

export function isMacOS() {
  return process.platform === 'darwin';
}

export function isWindows() {
  return process.platform === 'win32';
}

export function platformLabel() {
  if (isWindows()) return 'Windows';
  if (isMacOS()) return 'macOS';
  return 'Linux';
}

/**
 * Open a URL in the default browser when possible (best-effort).
 * @param {string} url
 */
export async function openUrl(url) {
  const { default: spawn } = await import('cross-spawn');
  let command;
  let args;
  if (isWindows()) {
    command = 'cmd';
    args = ['/c', 'start', '', url];
  } else if (isMacOS()) {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
      windowsHide: true,
    });
    child.on('error', () => resolve(false));
    child.unref();
    resolve(true);
  });
}

export function homeDir() {
  return os.homedir();
}
