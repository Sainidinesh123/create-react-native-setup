import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { wireSplashHide } from './wireSplashHide.js';
import { findAndroidResDir, findAndroidStyles } from './nativePaths.js';
import { androidManifestPath } from '../nativePaths.js';

/**
 * Run the official BootSplash asset generator and fully wire native + JS.
 * Guarantees BootTheme / Manifest / MainActivity even if CLI generate is partial.
 * @param {string} projectPath
 * @param {string} splashPath
 * @param {{ dryRun?: boolean, background?: string, logoWidth?: number }} [options]
 */
export async function applyBootSplash(projectPath, splashPath, options = {}) {
  const results = [];
  const background = normalizeHex(options.background || '#ffffff');
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
      type: 'bootsplashAndroid',
      status: 'skipped',
      detail: '[dry-run] Would ensure BootTheme, colors, drawable, Manifest, MainActivity',
    });
    results.push({
      packageId: 'branding',
      type: 'bootsplashIos',
      status: 'skipped',
      detail: '[dry-run] Would wire RNBootSplash in AppDelegate',
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
    ...(await wireAndroidBootSplash(projectPath, splashPath, background, logoWidth)),
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

function normalizeHex(value) {
  const raw = String(value || '#ffffff').trim();
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : '#ffffff';
}

function runBootSplashGenerate(projectPath, splashPath, { background, logoWidth }) {
  const cliJs = path.join(projectPath, 'node_modules', 'react-native-bootsplash', 'cli.js');
  const localBin = path.join(
    projectPath,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'react-native-bootsplash.cmd' : 'react-native-bootsplash',
  );
  const bg = background.replace(/^#/, '');
  const absSplash = path.isAbsolute(splashPath) ? splashPath : path.resolve(projectPath, splashPath);

  /** @type {string} */
  let command;
  /** @type {string[]} */
  let args;

  if (fs.existsSync(cliJs)) {
    command = process.execPath;
    args = [
      cliJs,
      'generate',
      absSplash,
      '--platforms=android,ios',
      `--background=${bg}`,
      `--logo-width=${logoWidth}`,
      '--flavor=main',
    ];
  } else if (fs.existsSync(localBin)) {
    command = localBin;
    args = [
      'generate',
      absSplash,
      '--platforms=android,ios',
      `--background=${bg}`,
      `--logo-width=${logoWidth}`,
      '--flavor=main',
    ];
  } else {
    command = 'npx';
    args = [
      '--yes',
      'react-native-bootsplash',
      'generate',
      absSplash,
      '--platforms=android,ios',
      `--background=${bg}`,
      `--logo-width=${logoWidth}`,
      '--flavor=main',
    ];
  }

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectPath,
      shell: process.platform === 'win32',
      env: process.env,
    });
    let stderr = '';
    let stdout = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', (error) => {
      resolve({ status: 'failed', detail: `BootSplash generate failed: ${error.message}` });
    });
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({
          status: 'failed',
          detail: `BootSplash generate exited ${code}: ${(stderr || stdout || 'unknown error').trim()}`,
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

/**
 * Full Android wiring so R.style.BootTheme always resolves.
 * @param {string} projectPath
 * @param {string} splashPath
 * @param {string} background
 * @param {number} logoWidth
 */
export async function wireAndroidBootSplash(
  projectPath,
  splashPath,
  background = '#ffffff',
  logoWidth = 100,
) {
  const parts = [];

  const colors = ensureBootSplashColors(projectPath, background);
  parts.push(`colors:${colors.status}`);

  const logo = await ensureBootSplashLogo(projectPath, splashPath, logoWidth);
  parts.push(`logo:${logo.status}`);

  const styles = ensureBootTheme(projectPath);
  parts.push(`styles:${styles.status}`);

  const manifest = ensureManifestBootTheme(projectPath);
  parts.push(`manifest:${manifest.status}`);

  const activity = ensureMainActivityBootSplash(projectPath);
  parts.push(`mainActivity:${activity.status}`);

  const failed = [colors, logo, styles, manifest, activity].filter((r) => r.status === 'failed');
  if (failed.length) {
    return {
      status: 'failed',
      detail: `Android BootSplash wiring incomplete (${parts.join(', ')}): ${failed
        .map((f) => f.detail)
        .join('; ')}`,
    };
  }

  return {
    status: 'applied',
    detail: `Android BootSplash wired (${parts.join(', ')})`,
  };
}

function ensureBootSplashColors(projectPath, background) {
  const resDir = findAndroidResDir(projectPath);
  if (!resDir) {
    return { status: 'failed', detail: 'android res/ not found' };
  }
  const valuesDir = path.join(resDir, 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  const colorsPath = path.join(valuesDir, 'colors.xml');
  const hex = normalizeHex(background);

  if (!fs.existsSync(colorsPath)) {
    fs.writeFileSync(
      colorsPath,
      `<resources>\n    <color name="bootsplash_background">${hex}</color>\n</resources>\n`,
      'utf8',
    );
    return { status: 'applied', detail: 'created colors.xml with bootsplash_background' };
  }

  let content = fs.readFileSync(colorsPath, 'utf8');
  if (/name="bootsplash_background"/.test(content)) {
    content = content.replace(
      /<color name="bootsplash_background">[^<]*<\/color>/,
      `<color name="bootsplash_background">${hex}</color>`,
    );
    fs.writeFileSync(colorsPath, content, 'utf8');
    return { status: 'already-applied', detail: 'bootsplash_background updated' };
  }

  if (!content.includes('</resources>')) {
    return { status: 'failed', detail: 'colors.xml missing </resources>' };
  }
  content = content.replace(
    '</resources>',
    `    <color name="bootsplash_background">${hex}</color>\n</resources>`,
  );
  fs.writeFileSync(colorsPath, content, 'utf8');
  return { status: 'applied', detail: 'added bootsplash_background' };
}

async function ensureBootSplashLogo(projectPath, splashPath, logoWidth) {
  const resDir = findAndroidResDir(projectPath);
  if (!resDir) {
    return { status: 'failed', detail: 'android res/ not found' };
  }

  const dens = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  const existing = dens.some((d) =>
    fs.existsSync(path.join(resDir, `drawable-${d}`, 'bootsplash_logo.png')),
  );
  if (
    existing ||
    fs.existsSync(path.join(resDir, 'drawable', 'bootsplash_logo.png')) ||
    fs.existsSync(path.join(resDir, 'drawable', 'bootsplash_logo.xml'))
  ) {
    return { status: 'already-applied', detail: 'bootsplash_logo already present' };
  }

  if (!splashPath || !fs.existsSync(splashPath)) {
    return { status: 'failed', detail: 'splash image missing and logo was not generated' };
  }

  try {
    const scale = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
    for (const d of dens) {
      const dir = path.join(resDir, `drawable-${d}`);
      fs.mkdirSync(dir, { recursive: true });
      const size = Math.round(logoWidth * scale[d]);
      await sharp(splashPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(dir, 'bootsplash_logo.png'));
    }
    return { status: 'applied', detail: 'wrote bootsplash_logo drawables' };
  } catch (error) {
    return { status: 'failed', detail: `logo generation failed: ${error.message}` };
  }
}

/**
 * Ensure R.style.BootTheme exists — root fix for Unresolved reference 'BootTheme'.
 */
export function ensureBootTheme(projectPath) {
  const stylesPath = findAndroidStyles(projectPath);
  if (!stylesPath) {
    const resDir = findAndroidResDir(projectPath);
    if (!resDir) {
      return { status: 'failed', detail: 'styles.xml not found' };
    }
    const valuesDir = path.join(resDir, 'values');
    fs.mkdirSync(valuesDir, { recursive: true });
    const created = path.join(valuesDir, 'styles.xml');
    fs.writeFileSync(created, defaultStylesXml(), 'utf8');
    return { status: 'applied', detail: 'created styles.xml with BootTheme' };
  }

  let content = fs.readFileSync(stylesPath, 'utf8');

  // Normalize obsolete v6 parent themes written by older CLI snippets / mistaken generate.
  if (/parent="Theme\.BootSplash\.EdgeToEdge"/.test(content) ||
      /parent="Theme\.BootSplash\.TransparentStatus"/.test(content)) {
    content = content
      .replace(/parent="Theme\.BootSplash\.EdgeToEdge"/g, 'parent="Theme.BootSplash"')
      .replace(/parent="Theme\.BootSplash\.TransparentStatus"/g, 'parent="Theme.BootSplash"');
    fs.writeFileSync(stylesPath, content, 'utf8');
  }

  if (/style\s+name="BootTheme"/.test(content)) {
    // Make sure required items exist and parent is valid
    if (
      !content.includes('bootSplashBackground') ||
      !content.includes('bootSplashLogo') ||
      !content.includes('postBootSplashTheme') ||
      /parent="Theme\.BootSplash\.(EdgeToEdge|TransparentStatus)"/.test(content)
    ) {
      content = content.replace(
        /<style\s+name="BootTheme"[^>]*>[\s\S]*?<\/style>/,
        bootThemeBlock(),
      );
      fs.writeFileSync(stylesPath, content, 'utf8');
      return { status: 'applied', detail: 'replaced incomplete/obsolete BootTheme style' };
    }
    return { status: 'already-applied', detail: 'BootTheme already defined' };
  }

  if (!content.includes('</resources>')) {
    return { status: 'failed', detail: 'styles.xml missing </resources>' };
  }

  content = content.replace('</resources>', `\n${bootThemeBlock()}\n</resources>`);
  fs.writeFileSync(stylesPath, content, 'utf8');
  return { status: 'applied', detail: 'inserted BootTheme into styles.xml' };
}

function bootThemeBlock() {
  // v7+: Theme.BootSplash is edge-to-edge by default; Theme.BootSplash.EdgeToEdge was removed.
  return `    <style name="BootTheme" parent="Theme.BootSplash">
        <item name="bootSplashBackground">@color/bootsplash_background</item>
        <item name="bootSplashLogo">@drawable/bootsplash_logo</item>
        <item name="postBootSplashTheme">@style/AppTheme</item>
    </style>`;
}

function defaultStylesXml() {
  return `<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    </style>

${bootThemeBlock()}
</resources>
`;
}

export function ensureManifestBootTheme(projectPath) {
  const manifestPath = androidManifestPath(projectPath);
  if (!fs.existsSync(manifestPath)) {
    return { status: 'failed', detail: 'AndroidManifest.xml not found' };
  }

  let content = fs.readFileSync(manifestPath, 'utf8');
  if (!/<activity\b[^>]*android:name="\.MainActivity"/.test(content)) {
    return { status: 'failed', detail: 'MainActivity not found in AndroidManifest.xml' };
  }

  const activityMatch = content.match(/<activity\b[^>]*android:name="\.MainActivity"[^>]*>/);
  if (activityMatch && /android:theme="@style\/BootTheme"/.test(activityMatch[0])) {
    return { status: 'already-applied', detail: 'MainActivity already uses BootTheme' };
  }

  content = content.replace(/<activity\b([^>]*android:name="\.MainActivity"[^>]*)>/, (full, attrs) => {
    if (/android:theme=/.test(attrs)) {
      const nextAttrs = attrs.replace(/android:theme="[^"]*"/, 'android:theme="@style/BootTheme"');
      return `<activity${nextAttrs}>`;
    }
    return `<activity${attrs} android:theme="@style/BootTheme">`;
  });

  fs.writeFileSync(manifestPath, content, 'utf8');
  return { status: 'applied', detail: 'set MainActivity theme to @style/BootTheme' };
}

export function ensureMainActivityBootSplash(projectPath) {
  const mainActivity = findFile(projectPath, ['MainActivity.kt', 'MainActivity.java']);
  if (!mainActivity) {
    return { status: 'failed', detail: 'MainActivity not found' };
  }

  let content = fs.readFileSync(mainActivity, 'utf8');

  // Avoid android.R shadowing app R
  if (/import\s+android\.R\b/.test(content)) {
    content = content.replace(/import\s+android\.R\s*;?\n/, '');
  }

  if (mainActivity.endsWith('.kt')) {
    if (!content.includes('import android.os.Bundle')) {
      content = content.replace(/(package [^\n]+\n)/, '$1\nimport android.os.Bundle\n');
    }
    if (!content.includes('com.zoontek.rnbootsplash.RNBootSplash')) {
      content = content.replace(
        /(package [^\n]+\n(?:import [^\n]+\n)*)/,
        (block) => `${block}import com.zoontek.rnbootsplash.RNBootSplash\n`,
      );
    }

    if (content.includes('RNBootSplash.init')) {
      fs.writeFileSync(mainActivity, content, 'utf8');
      return { status: 'already-applied', detail: 'RNBootSplash.init already present' };
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
    if (!content.includes('import android.os.Bundle')) {
      content = content.replace(/(package [^\n]+;\n)/, '$1\nimport android.os.Bundle;\n');
    }
    if (!content.includes('com.zoontek.rnbootsplash.RNBootSplash')) {
      content = content.replace(
        /(package [^\n]+;\n(?:import [^\n]+;\n)*)/,
        (block) => `${block}import com.zoontek.rnbootsplash.RNBootSplash;\n`,
      );
    }
    if (content.includes('RNBootSplash.init')) {
      fs.writeFileSync(mainActivity, content, 'utf8');
      return { status: 'already-applied', detail: 'RNBootSplash.init already present' };
    }
    if (/protected void onCreate\(Bundle savedInstanceState\) \{/.test(content)) {
      content = content.replace(
        /(protected void onCreate\(Bundle savedInstanceState\) \{\n)/,
        `$1    RNBootSplash.init(this, R.style.BootTheme);\n`,
      );
    } else {
      content = content.replace(
        /(public class MainActivity[^{]+\{)/,
        `$1\n  @Override\n  protected void onCreate(Bundle savedInstanceState) {\n    RNBootSplash.init(this, R.style.BootTheme);\n    super.onCreate(savedInstanceState);\n  }\n`,
      );
    }
  }

  fs.writeFileSync(mainActivity, content, 'utf8');
  return {
    status: 'applied',
    detail: `Wired RNBootSplash.init in ${path.relative(projectPath, mainActivity)}`,
  };
}

export async function wireIosBootSplash(projectPath) {
  const appDelegate = findFile(projectPath, ['AppDelegate.swift', 'AppDelegate.mm', 'AppDelegate.m']);
  if (!appDelegate) {
    return {
      status: 'skipped',
      detail: 'AppDelegate not found',
      manualAction: 'Call RNBootSplash.initWithStoryboard("BootSplash", rootView:) in AppDelegate',
    };
  }

  let content = fs.readFileSync(appDelegate, 'utf8');
  if (content.includes('RNBootSplash.initWithStoryboard') || content.includes('initWithStoryboard')) {
    return { status: 'already-applied', detail: 'BootSplash already initialized in AppDelegate' };
  }

  if (appDelegate.endsWith('.swift')) {
    if (!content.includes('import RNBootSplash')) {
      if (/^import .+$/m.test(content)) {
        content = content.replace(/^(import .+\n)+/m, (block) => `${block}import RNBootSplash\n`);
      } else {
        content = `import RNBootSplash\n${content}`;
      }
    }

    // RN 0.76+ / factory delegate style
    if (/func customize\(_ rootView: RCTRootView\)/.test(content)) {
      content = content.replace(
        /(func customize\(_ rootView: RCTRootView\) \{\n)/,
        `$1    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)\n`,
      );
    } else if (/override func customize\(_ rootView: RCTRootView\)/.test(content)) {
      content = content.replace(
        /(override func customize\(_ rootView: RCTRootView\) \{\n(?:\s*super\.customize\(rootView\)\n)?)/,
        (match) => {
          if (match.includes('super.customize')) {
            return `${match}    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)\n`;
          }
          return `override func customize(_ rootView: RCTRootView) {\n    super.customize(rootView)\n    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)\n`;
        },
      );
    } else if (/class ReactNativeDelegate[^{]*\{/.test(content)) {
      content = content.replace(
        /(class ReactNativeDelegate[^{]*\{)/,
        `$1\n  override func customize(_ rootView: RCTRootView) {\n    super.customize(rootView)\n    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)\n  }\n`,
      );
    } else if (/RCTAppDelegate/.test(content) && /didFinishLaunchingWithOptions/.test(content)) {
      // Older RCTAppDelegate template — init after super returns when root view exists is harder;
      // inject customize override on AppDelegate when possible.
      content = content.replace(
        /(class AppDelegate:[^{]+\{)/,
        `$1\n  override func customize(_ rootView: RCTRootView!) {\n    super.customize(rootView)\n    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)\n  }\n`,
      );
    } else {
      fs.writeFileSync(appDelegate, content, 'utf8');
      return {
        status: 'manual',
        detail: 'Could not locate a known AppDelegate hook for BootSplash',
        manualAction:
          'In AppDelegate, call RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView) after creating the root view',
      };
    }

    fs.writeFileSync(appDelegate, content, 'utf8');
    return {
      status: 'applied',
      detail: `Wired RNBootSplash in ${path.relative(projectPath, appDelegate)}`,
    };
  }

  // Obj-C++
  if (!content.includes('RNBootSplash.h') && !content.includes('RNBootSplash/RNBootSplash')) {
    content = content.replace(
      /(#import\s+"AppDelegate\.h"\n)/,
      `$1\n#import "RNBootSplash.h"\n`,
    );
  }
  if (/RCTRootView \*rootView/.test(content) || /rootViewController/.test(content)) {
    if (!content.includes('initWithStoryboard')) {
      content = content.replace(
        /(return\s+\[super\s+application:[^;]+;)/,
        `[RNBootSplash initWithStoryboard:@"BootSplash" rootView:rootView];\n  $1`,
      );
    }
  }

  fs.writeFileSync(appDelegate, content, 'utf8');
  if (content.includes('initWithStoryboard')) {
    return { status: 'applied', detail: 'Wired RNBootSplash in Obj-C AppDelegate' };
  }
  return {
    status: 'manual',
    detail: 'Obj-C AppDelegate pattern not fully detected',
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
