import fs from 'node:fs';
import path from 'node:path';

function insertPluginLast(content, plugin) {
  if (content.includes(plugin)) {
    return content;
  }
  const pluginsIdx = content.search(/plugins\s*:\s*\[/);
  if (pluginsIdx === -1) {
    return content.replace(
      /module\.exports\s*=\s*\{/,
      (match) => `${match}\n  plugins: ['${plugin}'],`,
    );
  }
  let i = content.indexOf('[', pluginsIdx);
  let depth = 0;
  for (; i < content.length; i += 1) {
    if (content[i] === '[') depth += 1;
    if (content[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        const before = content.slice(0, i).replace(/\s*$/, '');
        const needsComma =
          /['"\w\]]$/.test(before.trim()) && !before.trim().endsWith(',');
        const insertion = `${needsComma ? ',' : ''}\n    '${plugin}',\n  `;
        return before + insertion + content.slice(i);
      }
    }
  }
  return content;
}

/**
 * @param {string} projectPath
 * @param {{ plugin: string, position?: 'last' }} step
 */
export async function babelPlugin(projectPath, step) {
  const candidates = ['babel.config.js', 'babel.config.cjs', '.babelrc', '.babelrc.js'];
  let filePath;
  for (const name of candidates) {
    const full = path.join(projectPath, name);
    if (fs.existsSync(full)) {
      filePath = full;
      break;
    }
  }
  if (!filePath) {
    return { status: 'failed', detail: 'No babel.config.js / .babelrc found' };
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const plugin = step.plugin;
  if (content.includes(plugin)) {
    return {
      status: 'already-applied',
      detail: `${plugin} already present in ${path.basename(filePath)}`,
    };
  }

  if (/plugins\s*:\s*\[/.test(content)) {
    if (step.position === 'last') {
      content = insertPluginLast(content, plugin);
    } else {
      content = content.replace(/plugins\s*:\s*\[/, (match) => `${match}\n    '${plugin}',`);
    }
  } else if (/module\.exports\s*=\s*\{/.test(content)) {
    content = content.replace(
      /module\.exports\s*=\s*\{/,
      (match) => `${match}\n  plugins: ['${plugin}'],`,
    );
  } else {
    try {
      const json = JSON.parse(content);
      json.plugins = json.plugins || [];
      if (step.position === 'last') {
        json.plugins.push(plugin);
      } else {
        json.plugins.unshift(plugin);
      }
      content = `${JSON.stringify(json, null, 2)}\n`;
    } catch {
      return {
        status: 'failed',
        detail: `Could not modify ${path.basename(filePath)} automatically`,
      };
    }
  }

  if (step.position === 'last' && !content.includes(plugin)) {
    content = insertPluginLast(fs.readFileSync(filePath, 'utf8'), plugin);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return {
    status: 'applied',
    detail: `Added ${plugin} to ${path.basename(filePath)}`,
  };
}
