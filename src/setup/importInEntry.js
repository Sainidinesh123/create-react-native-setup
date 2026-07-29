import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} projectPath
 * @param {{ import: string }} step
 */
export async function importInEntry(projectPath, step) {
  const candidates = ['index.js', 'index.tsx', 'index.ts'];
  let filePath;
  for (const name of candidates) {
    const full = path.join(projectPath, name);
    if (fs.existsSync(full)) {
      filePath = full;
      break;
    }
  }
  if (!filePath) {
    return { status: 'failed', detail: 'No index.js/ts/tsx entry file found' };
  }

  const moduleName = step.import;
  let content = fs.readFileSync(filePath, 'utf8');
  const already =
    content.includes(`'${moduleName}'`) || content.includes(`"${moduleName}"`);
  if (already) {
    return {
      status: 'already-applied',
      detail: `Import of ${moduleName} already present in ${path.basename(filePath)}`,
    };
  }

  content = `import '${moduleName}';\n` + content;
  fs.writeFileSync(filePath, content, 'utf8');
  return {
    status: 'applied',
    detail: `Added import '${moduleName}' to ${path.basename(filePath)}`,
  };
}
