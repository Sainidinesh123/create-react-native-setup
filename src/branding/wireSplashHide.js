import fs from 'node:fs';
import path from 'node:path';

/**
 * Prefer App.js / App.tsx for splash hide(); fall back to index.
 * @returns {{ filePath: string, kind: 'app' | 'entry' } | null}
 */
export function findHideTarget(projectPath) {
  for (const name of ['App.tsx', 'App.jsx', 'App.js', 'App.ts']) {
    const full = path.join(projectPath, name);
    if (fs.existsSync(full)) {
      return { filePath: full, kind: 'app' };
    }
  }
  for (const name of ['index.js', 'index.tsx', 'index.ts']) {
    const full = path.join(projectPath, name);
    if (fs.existsSync(full)) {
      return { filePath: full, kind: 'entry' };
    }
  }
  return null;
}

/**
 * Idempotent BootSplash / SplashScreen hide() wiring in App or entry.
 * @param {string} projectPath
 * @param {'bootsplash' | 'splash-screen'} mode
 * @param {{ dryRun?: boolean }} [options]
 */
export async function wireSplashHide(projectPath, mode, options = {}) {
  const target = findHideTarget(projectPath);
  if (!target) {
    return { status: 'failed', detail: 'No App.js/tsx or index.js entry found for hide()' };
  }

  const importLine =
    mode === 'bootsplash'
      ? "import BootSplash from 'react-native-bootsplash';"
      : "import SplashScreen from 'react-native-splash-screen';";
  const hideCall =
    mode === 'bootsplash'
      ? 'BootSplash.hide({ fade: true });'
      : 'SplashScreen.hide();';
  const marker = mode === 'bootsplash' ? 'BootSplash.hide' : 'SplashScreen.hide';

  if (options.dryRun) {
    return {
      status: 'skipped',
      detail: `[dry-run] Would add ${marker}() in ${path.basename(target.filePath)}`,
    };
  }

  let content = fs.readFileSync(target.filePath, 'utf8');
  if (content.includes(marker)) {
    return {
      status: 'already-applied',
      detail: `${marker}() already present in ${path.basename(target.filePath)}`,
    };
  }

  if (!content.includes(importLine.split(' from ')[0])) {
    content = `${importLine}\n${content}`;
  }

  if (target.kind === 'app') {
    content = injectAppHide(content, hideCall, mode);
  } else {
    content = `${content.trimEnd()}\n\n// Hide splash once JS has loaded\n${hideCall}\n`;
  }

  fs.writeFileSync(target.filePath, content, 'utf8');
  return {
    status: 'applied',
    detail: `Added ${marker}() to ${path.basename(target.filePath)}`,
  };
}

function injectAppHide(content, hideCall, mode) {
  if (/useEffect\s*\(/.test(content) && content.includes(hideCall.replace(';', ''))) {
    return content;
  }

  const needsUseEffectImport =
    !/import\s+\{[^}]*\buseEffect\b[^}]*\}\s+from\s+['"]react['"]/.test(content);
  let next = content;
  if (needsUseEffectImport) {
    if (/import\s+React\s*,\s*\{([^}]*)\}\s+from\s+['"]react['"]/.test(next)) {
      next = next.replace(
        /import\s+React\s*,\s*\{([^}]*)\}\s+from\s+['"]react['"]/,
        (full, inner) =>
          inner.includes('useEffect')
            ? full
            : `import React, { ${inner.trim() ? `${inner.trim()}, ` : ''}useEffect } from 'react'`,
      );
    } else if (/import\s+\{([^}]*)\}\s+from\s+['"]react['"]/.test(next)) {
      next = next.replace(
        /import\s+\{([^}]*)\}\s+from\s+['"]react['"]/,
        (full, inner) =>
          inner.includes('useEffect')
            ? full
            : `import { ${inner.trim() ? `${inner.trim()}, ` : ''}useEffect } from 'react'`,
      );
    } else {
      next = `import { useEffect } from 'react';\n${next}`;
    }
  }

  const effect = `
  useEffect(() => {
    ${hideCall}
  }, []);
`;

  // Function component body: insert after the opening brace of the default export function.
  const fnMatch = next.match(
    /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)|(function\s+App\s*\([^)]*\)\s*\{)/,
  );
  if (fnMatch) {
    const idx = fnMatch.index + fnMatch[0].length;
    return `${next.slice(0, idx)}${effect}${next.slice(idx)}`;
  }

  // Arrow component: const App = () => { ... }
  const arrow = next.match(/(const\s+App\s*=\s*\([^)]*\)\s*=>\s*\{)/);
  if (arrow) {
    const idx = arrow.index + arrow[0].length;
    return `${next.slice(0, idx)}${effect}${next.slice(idx)}`;
  }

  return `${next.trimEnd()}\n\n// ${mode} splash hide\n${hideCall}\n`;
}
