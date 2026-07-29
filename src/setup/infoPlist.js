import fs from 'node:fs';
import path from 'node:path';

function findInfoPlist(iosDir) {
  const stack = [iosDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'Pods' || entry.name === 'build') continue;
        stack.push(full);
      } else if (entry.name === 'Info.plist') {
        return full;
      }
    }
  }
  return null;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} projectPath
 * @param {{ key: string, value: string }} step
 */
export async function infoPlist(projectPath, step) {
  const iosDir = path.join(projectPath, 'ios');
  if (!fs.existsSync(iosDir)) {
    return { status: 'skipped', detail: 'No ios/ directory' };
  }

  const plistPath = findInfoPlist(iosDir);
  if (!plistPath) {
    return { status: 'failed', detail: 'Could not find Info.plist under ios/' };
  }

  let content = fs.readFileSync(plistPath, 'utf8');
  if (content.includes(`<key>${step.key}</key>`)) {
    return {
      status: 'already-applied',
      detail: `${step.key} already present in Info.plist`,
    };
  }

  const entry = `\t<key>${step.key}</key>\n\t<string>${escapeXml(step.value)}</string>\n`;
  if (content.includes('</dict>')) {
    content = content.replace('</dict>', `${entry}</dict>`);
  } else {
    return { status: 'failed', detail: 'Malformed Info.plist (no </dict>)' };
  }

  fs.writeFileSync(plistPath, content, 'utf8');
  return {
    status: 'applied',
    detail: `Added ${step.key} to ${path.relative(projectPath, plistPath)}`,
  };
}
