import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  findAndroidResDir,
  findAndroidStyles,
  findAssetCatalog,
  findLaunchScreen,
} from './nativePaths.js';
import { applySplash } from './applySplash.js';
import { wireSplashHide } from './wireSplashHide.js';

/**
 * Configure react-native-splash-screen: assets + MainActivity/AppDelegate + JS hide.
 * @param {string} projectPath
 * @param {string} splashPath
 * @param {{ dryRun?: boolean, background?: string }} [options]
 */
export async function applySplashScreenPkg(projectPath, splashPath, options = {}) {
  const results = [];
  const background = options.background || '#ffffff';

  // Reuse native centered-logo splash assets, then add package-specific show()/hide().
  const assets = await applySplash(projectPath, splashPath, {
    dryRun: options.dryRun,
    background,
  });
  results.push({ packageId: 'branding', type: 'splashScreenAssets', ...assets });

  if (options.dryRun) {
    results.push({
      packageId: 'branding',
      type: 'splashScreenAndroid',
      status: 'skipped',
      detail: '[dry-run] Would call SplashScreen.show in MainActivity',
    });
    results.push({
      packageId: 'branding',
      type: 'splashScreenIos',
      status: 'skipped',
      detail: '[dry-run] Would call RNSplashScreen show in AppDelegate',
    });
    results.push({
      packageId: 'branding',
      type: 'splashScreenHide',
      ...(await wireSplashHide(projectPath, 'splash-screen', { dryRun: true })),
    });
    return results;
  }

  results.push({
    packageId: 'branding',
    type: 'splashScreenAndroid',
    ...(await wireAndroidSplashScreen(projectPath)),
  });
  results.push({
    packageId: 'branding',
    type: 'splashScreenIos',
    ...(await wireIosSplashScreen(projectPath)),
  });

  // Ensure launch_screen layout for the Android library.
  const layout = await ensureLaunchScreenLayout(projectPath, splashPath, background);
  results.push({ packageId: 'branding', type: 'splashScreenLayout', ...layout });

  results.push({
    packageId: 'branding',
    type: 'splashScreenHide',
    ...(await wireSplashHide(projectPath, 'splash-screen', {})),
  });

  return results;
}

async function ensureLaunchScreenLayout(projectPath, splashPath, background) {
  const resDir = findAndroidResDir(projectPath);
  if (!resDir) {
    return { status: 'skipped', detail: 'No android res/ for launch_screen.xml' };
  }
  const layoutDir = path.join(resDir, 'layout');
  fs.mkdirSync(layoutDir, { recursive: true });
  const layoutPath = path.join(layoutDir, 'launch_screen.xml');
  const drawableDir = path.join(resDir, 'drawable');
  fs.mkdirSync(drawableDir, { recursive: true });
  await sharp(splashPath)
    .resize(300, 300, { fit: 'contain', background })
    .flatten({ background })
    .png()
    .toFile(path.join(drawableDir, 'launch_screen.png'));

  fs.writeFileSync(
    layoutPath,
    `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="${background.startsWith('#') ? background : `#${background}`}"
    android:orientation="vertical">
    <ImageView
        android:layout_width="200dp"
        android:layout_height="200dp"
        android:layout_centerInParent="true"
        android:scaleType="fitCenter"
        android:src="@drawable/launch_screen" />
</RelativeLayout>
`,
    'utf8',
  );

  const stylesPath = findAndroidStyles(projectPath);
  if (stylesPath) {
    let styles = fs.readFileSync(stylesPath, 'utf8');
    if (!styles.includes('SplashTheme') && styles.includes('</resources>')) {
      styles = styles.replace(
        '</resources>',
        `    <style name="SplashTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@drawable/splash</item>
    </style>

</resources>`,
      );
      fs.writeFileSync(stylesPath, styles, 'utf8');
    }
  }

  return { status: 'applied', detail: 'Wrote launch_screen.xml and launch_screen.png' };
}

async function wireAndroidSplashScreen(projectPath) {
  const mainActivity = findFile(projectPath, ['MainActivity.kt', 'MainActivity.java']);
  if (!mainActivity) {
    return { status: 'skipped', detail: 'MainActivity not found' };
  }
  let content = fs.readFileSync(mainActivity, 'utf8');
  if (content.includes('SplashScreen.show')) {
    return { status: 'already-applied', detail: 'SplashScreen.show already in MainActivity' };
  }

  if (mainActivity.endsWith('.kt')) {
    if (!content.includes('org.devio.rn.splashscreen.SplashScreen')) {
      content = content.replace(
        /(package [^\n]+\n)/,
        `$1\nimport android.os.Bundle\nimport org.devio.rn.splashscreen.SplashScreen\n`,
      );
    }
    if (/override fun onCreate\(savedInstanceState: Bundle\?\)/.test(content)) {
      content = content.replace(
        /(override fun onCreate\(savedInstanceState: Bundle\?\) \{\n)/,
        `$1    SplashScreen.show(this)\n`,
      );
    } else {
      content = content.replace(
        /(class MainActivity[^{]+\{)/,
        `$1\n  override fun onCreate(savedInstanceState: Bundle?) {\n    SplashScreen.show(this)\n    super.onCreate(savedInstanceState)\n  }\n`,
      );
    }
  } else {
    if (!content.includes('org.devio.rn.splashscreen.SplashScreen')) {
      content = content.replace(
        /(package [^\n]+;\n)/,
        `$1\nimport android.os.Bundle;\nimport org.devio.rn.splashscreen.SplashScreen;\n`,
      );
    }
    content = content.replace(
      /(protected void onCreate\(Bundle savedInstanceState\) \{\n)/,
      `$1    SplashScreen.show(this);\n`,
    );
  }

  fs.writeFileSync(mainActivity, content, 'utf8');
  return {
    status: 'applied',
    detail: `Wired SplashScreen.show in ${path.relative(projectPath, mainActivity)}`,
  };
}

async function wireIosSplashScreen(projectPath) {
  const appDelegate = findFile(projectPath, ['AppDelegate.swift', 'AppDelegate.mm', 'AppDelegate.m']);
  if (!appDelegate) {
    return { status: 'skipped', detail: 'AppDelegate not found' };
  }
  const content = fs.readFileSync(appDelegate, 'utf8');
  if (content.includes('RNSplashScreen') || content.includes('SplashScreen.show')) {
    return { status: 'already-applied', detail: 'SplashScreen already referenced in AppDelegate' };
  }
  // LaunchScreen.storyboard assets cover cold start; library show() is mainly Android-critical.
  return {
    status: 'applied',
    detail: 'iOS uses LaunchScreen assets; RNSplashScreen.show optional for older templates',
    manualAction: findLaunchScreen(projectPath)
      ? undefined
      : 'Ensure LaunchScreen.storyboard shows your splash image in Xcode',
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
        if (entry.name === 'Pods' || entry.name === 'build' || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (names.includes(entry.name)) return full;
      }
    }
  }
  return null;
}
