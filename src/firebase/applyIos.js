import fs from 'node:fs';
import path from 'node:path';
import { findIosAppDir } from './copyConfig.js';

export const XCODE_MEMBERSHIP_ACTION =
  'In Xcode, add ios/<App>/GoogleService-Info.plist to the app target (File → Add Files to "<App>", "Copy items if needed" unchecked, target checked).';

function findAppDelegate(appDir) {
  for (const name of ['AppDelegate.swift', 'AppDelegate.mm', 'AppDelegate.m']) {
    const candidate = path.join(appDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function configureSwift(content) {
  if (content.includes('FirebaseApp.configure()')) {
    return { changed: false, content };
  }

  const imports = [...content.matchAll(/^import .+$/gm)];
  if (!imports.length) return { changed: false, content, error: 'No import block in AppDelegate' };

  const launch = content.match(
    /(func application\([\s\S]*?didFinishLaunchingWithOptions[\s\S]*?\) -> Bool \{\n)/,
  );
  if (!launch) {
    return { changed: false, content, error: 'No didFinishLaunchingWithOptions in AppDelegate' };
  }

  let next = content;
  if (!/^import FirebaseCore$/m.test(next)) {
    const last = imports[imports.length - 1];
    const end = last.index + last[0].length;
    next = `${next.slice(0, end)}\nimport FirebaseCore${next.slice(end)}`;
  }
  const body = next.match(
    /(func application\([\s\S]*?didFinishLaunchingWithOptions[\s\S]*?\) -> Bool \{\n)/,
  );
  next = next.replace(body[1], `${body[1]}    FirebaseApp.configure()\n`);
  return { changed: true, content: next };
}

function configureObjc(content) {
  if (content.includes('[FIRApp configure]')) {
    return { changed: false, content };
  }

  const launch = content.match(/(didFinishLaunchingWithOptions:[^\n]*\n\{?\n?)/);
  if (!launch) {
    return { changed: false, content, error: 'No didFinishLaunchingWithOptions in AppDelegate' };
  }

  let next = content;
  if (!next.includes('#import <Firebase.h>')) {
    next = next.replace(/(#import "AppDelegate\.h"\n)/, '$1#import <Firebase.h>\n');
  }
  const opening = next.match(/(didFinishLaunchingWithOptions:[^\n]*\n?\{\n)/);
  if (!opening) {
    return { changed: false, content, error: 'Could not locate the AppDelegate launch body' };
  }
  next = next.replace(opening[1], `${opening[1]}  [FIRApp configure];\n`);
  return { changed: true, content: next };
}

/**
 * Initialise Firebase in the iOS AppDelegate and report the Xcode step that
 * cannot be automated safely.
 * @param {string} projectPath
 * @param {string} projectName
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ status: string, detail: string, manualAction?: string }>}
 */
export async function applyFirebaseIos(projectPath, projectName, options = {}) {
  if (options.dryRun) {
    return {
      status: 'skipped',
      detail: '[dry-run] Would call FirebaseApp.configure() from the iOS AppDelegate',
      manualAction: XCODE_MEMBERSHIP_ACTION,
    };
  }

  const appDir = findIosAppDir(projectPath, projectName);
  if (!appDir) {
    return { status: 'failed', detail: 'Could not find the iOS app directory under ios/' };
  }

  const appDelegate = findAppDelegate(appDir);
  if (!appDelegate) {
    return {
      status: 'failed',
      detail: 'Could not find AppDelegate.swift/.mm under ios/',
      manualAction: XCODE_MEMBERSHIP_ACTION,
    };
  }

  const content = fs.readFileSync(appDelegate, 'utf8');
  const result = appDelegate.endsWith('.swift')
    ? configureSwift(content)
    : configureObjc(content);

  if (result.error) {
    return {
      status: 'failed',
      detail: result.error,
      manualAction: `Call FirebaseApp.configure() at the top of didFinishLaunchingWithOptions in ${path.relative(projectPath, appDelegate)}. ${XCODE_MEMBERSHIP_ACTION}`,
    };
  }
  if (!result.changed) {
    return {
      status: 'already-applied',
      detail: 'Firebase is already initialised in the AppDelegate',
      manualAction: XCODE_MEMBERSHIP_ACTION,
    };
  }

  fs.writeFileSync(appDelegate, result.content, 'utf8');
  return {
    status: 'applied',
    detail: `Initialised Firebase in ${path.relative(projectPath, appDelegate)}`,
    manualAction: XCODE_MEMBERSHIP_ACTION,
  };
}
