import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} projectPath
 * @param {{ permission: string }} step
 */
export async function androidPermission(projectPath, step) {
  const manifestPath = path.join(
    projectPath,
    'android',
    'app',
    'src',
    'main',
    'AndroidManifest.xml',
  );
  if (!fs.existsSync(manifestPath)) {
    return {
      status: 'skipped',
      detail: 'AndroidManifest.xml not found (no android/ folder?)',
    };
  }

  const permission = step.permission;
  let content = fs.readFileSync(manifestPath, 'utf8');
  if (content.includes(permission)) {
    return {
      status: 'already-applied',
      detail: `${permission} already in AndroidManifest.xml`,
    };
  }

  const tag = `    <uses-permission android:name="${permission}" />\n`;
  if (/<manifest\b[^>]*>/.test(content)) {
    content = content.replace(/<manifest\b[^>]*>/, (match) => `${match}\n${tag}`);
  } else {
    return {
      status: 'failed',
      detail: 'Could not locate <manifest> in AndroidManifest.xml',
    };
  }

  fs.writeFileSync(manifestPath, content, 'utf8');
  return {
    status: 'applied',
    detail: `Added ${permission} to AndroidManifest.xml`,
  };
}
