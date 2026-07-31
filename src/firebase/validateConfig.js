import fs from 'node:fs';
import path from 'node:path';

export const GOOGLE_SERVICES_BASENAME = 'google-services.json';
export const GOOGLE_SERVICE_INFO_BASENAME = 'GoogleService-Info.plist';

function validateConfigPath(configPath, expectedBasename) {
  if (typeof configPath !== 'string' || !configPath.trim()) {
    return { ok: false, error: `${expectedBasename} path is required` };
  }

  const absolutePath = path.resolve(
    configPath.trim().replace(/^~(?=\/)/, process.env.HOME || '~'),
  );

  if (path.basename(absolutePath) !== expectedBasename) {
    return {
      ok: false,
      error: `Expected a file named ${expectedBasename}, got "${path.basename(absolutePath)}"`,
    };
  }
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return { ok: false, error: `File not found: ${absolutePath}` };
  }

  return { ok: true, absolutePath };
}

/** @returns {{ ok: true, absolutePath: string } | { ok: false, error: string }} */
export function validateGoogleServicesPath(configPath) {
  return validateConfigPath(configPath, GOOGLE_SERVICES_BASENAME);
}

/** @returns {{ ok: true, absolutePath: string } | { ok: false, error: string }} */
export function validateGoogleServiceInfoPath(configPath) {
  return validateConfigPath(configPath, GOOGLE_SERVICE_INFO_BASENAME);
}
