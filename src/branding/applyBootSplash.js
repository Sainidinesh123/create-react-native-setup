import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { wireSplashHide } from './wireSplashHide.js';

/**
 * Run the official BootSplash asset generator and wire native + JS init/hide.
 * @param {string} projectPath
 * @param {string} splashPath
 * @param {{ dryRun?: boolean, background?: string, logoWidth?: number }} [options]
 */
export async function applyBootSplash(projectPath, splashPath, options = {}) {
  const results = [];
  const background = options.background || '#ffffff';
  const logoWidth = options.logoWidth || 100;

  if (options.dryRun) {
    results.push({
      packageId: 'branding',
      type: 'bootsplashGenerate',
      status: 'skipped',
      detail: `[dry-run] Would run react-native-bootsplash generate with background ${background}`,
    });
    results.push({
      packageId: 'branding',
      type: 'bootsplashHide',
      ...(await wireSplashHide(projectPath, 'bootsplash', { dryRun: true })),
    });
    return results;
  }

  const generated = await runBootSplashGenerate(projectPath, splashPath, {
    background,
    logoWidth,
  });
  results.push({ packageId: 'branding', type: 'bootsplashGenerate', ...generated });

  results.push({
    packageId: 'branding',
    type: 'bootsplashAndroid',
    ...(await wireAndroidBootSplash(projectPath)),
  });
  results.push({
    packageId: 'branding',
    type: 'bootsplashIos',
    ...(await wireIosBootSplash(projectPath)),
  });
  results.push({
    packageId: 'branding',
    type: 'bootsplashHide',
    ...(await wireSplashHide(projectPath, 'bootsplash', {})),
  });

  return results;
}

function runBootSplashGenerate(projectPath, splashPath, { background, logoWidth }) {
  const localBin = path.join(
    projectPath,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'react-native-bootsplash.cmd' : 'react-native-bootsplash',
  );
  const useLocal = fs.existsSync(localBin);
  const command = useLocal ? localBin : 'npx';
  const args = useLocal
    ? [
        'generate',
        splashPath,
        '--platforms=android,ios',
        `--background=${background.replace(/^#/, '')}`,
        `--logo-width=${logoWidth}`,
      ]
    : [
        'react-native-bootsplash',
        'generate',
        splashPath,
        '--platforms=android,ios',
        `--background=${background.replace(/^#/, '')}`,
        `--logo-width=${logoWidth}`,
      ];

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectPath,
      shell: process.platform === 'win32',
      env: process.env,
    });
    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      resolve({ status: 'failed', detail: `BootSplash generate failed: ${error.message}` });
    });
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({
          status: 'failed',
          detail: `BootSplash generate exited ${code}: ${(stderr || 'unknown error').trim()}`,
        });
        return;
      }
      resolve({
        status: 'applied',
        detail: `Generated BootSplash assets (background ${background}, logo-width ${logoWidth})`,
      });
    });
  });
}

async function wireAndroidBootSplash(projectPath) {
  const mainActivity = findFile(projectPath, ['MainActivity.kt', 'MainActivity.java']);
  if (!mainActivity) {
    return { status: 'skipped', detail: 'MainActivity not found' };
  }
  let content = fs.readFileSync(mainActivity, 'utf8');
  if (content.includes('RNBootSplash.init')) {
    return { status: 'already-applied', detail: 'RNBootSplash.init already in MainActivity' };
  }

  if (mainActivity.endsWith('.kt')) {
    if (!content.includes('com.zoontek.rnbootsplash.RNBootSplash')) {
      content = content.replace(
        /(package [^\n]+\n)/,
        `$1\nimport android.os.Bundle\nimport com.zoontek.rnbootsplash.RNBootSplash\n`,
      );
    }
    if (/override fun onCreate\(savedInstanceState: Bundle\?\)/.test(content)) {
      content = content.replace(
        /(override fun onCreate\(savedInstanceState: Bundle\?\) \{\n)/,
        `$1    RNBootSplash.init(this, R.style.BootTheme)\n`,
      );
    } else {
      content = content.replace(
        /(class MainActivity[^{]+\{)/,
        `$1\n  override fun onCreate(savedInstanceState: Bundle?) {\n    RNBootSplash.init(this, R.style.BootTheme)\n    super.onCreate(savedInstanceState)\n  }\n`,
      );
    }
  } else {
    if (!content.includes('com.zoontek.rnbootsplash.RNBootSplash')) {
      content = content.replace(
        /(package [^\n]+;\n)/,
        `$1\nimport android.os.Bundle;\nimport com.zoontek.rnbootsplash.RNBootSplash;\n`,
      );
    }
    content = content.replace(
      /(protected void onCreate\(Bundle savedInstanceState\) \{\n)/,
      `$1    RNBootSplash.init(this, R.style.BootTheme);\n`,
    );
  }

  fs.writeFileSync(mainActivity, content, 'utf8');
  return {
    status: 'applied',
    detail: `Wired RNBootSplash.init in ${path.relative(projectPath, mainActivity)}`,
    manualAction:
      'Confirm BootTheme exists after generate; if missing, re-run bootsplash generate or check styles.xml',
  };
}

async function wireIosBootSplash(projectPath) {
  const appDelegate = findFile(projectPath, ['AppDelegate.swift', 'AppDelegate.mm', 'AppDelegate.m']);
  if (!appDelegate) {
    return {
      status: 'skipped',
      detail: 'AppDelegate not found',
      manualAction: 'Call RNBootSplash.initWithStoryboard("BootSplash", rootView:) in AppDelegate',
    };
  }
  let content = fs.readFileSync(appDelegate, 'utf8');
  if (content.includes('RNBootSplash') || content.includes('BootSplash')) {
    return { status: 'already-applied', detail: 'BootSplash already referenced in AppDelegate' };
  }

  if (appDelegate.endsWith('.swift')) {
    if (!/^import RNBootSplash$/m.test(content) && !content.includes('RNBootSplash')) {
      // Newer RN templates may use a module name that differs; leave a clear manualAction if insert fails.
      content = content.replace(/^(import .+\n)+/m, (block) => `${block}import RNBootSplash\n`);
    }
    return {
      status: 'manual',
      detail: 'BootSplash assets generated; AppDelegate init varies by RN template',
      manualAction:
        'In AppDelegate, call RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView) after creating the root view',
    };
  }

  return {
    status: 'manual',
    detail: 'BootSplash assets generated; Obj-C AppDelegate wiring left as manualAction',
    manualAction: '[RNBootSplash initWithStoryboard:@"BootSplash" rootView:rootView];',
  };
}

function findFile(projectPath, names) {
  const roots = [path.join(projectPath, 'android'), path.join(projectPath, 'ios')];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.name === 'Pods' || entry.name === 'build' || entry.name === 'node_modules') {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (names.includes(entry.name)) {
          return full;
        }
      }
    }
  }
  return null;
}
