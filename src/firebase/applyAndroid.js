import fs from 'node:fs';
import path from 'node:path';

export const GOOGLE_SERVICES_CLASSPATH = 'com.google.gms:google-services:4.4.2';
const PLUGIN_ID = 'com.google.gms.google-services';

function addClasspath(rootGradlePath) {
  const content = fs.readFileSync(rootGradlePath, 'utf8');
  if (content.includes('com.google.gms:google-services')) {
    return { changed: false, content };
  }

  const anchor = /(\n(\s*)classpath\(?["'][^\n]*react-native-gradle-plugin[^\n]*\)?\n)/;
  const match = content.match(anchor);
  if (!match) {
    return { changed: false, content, error: 'Could not find the buildscript dependencies block' };
  }

  const indent = match[2];
  const line = `${indent}classpath("${GOOGLE_SERVICES_CLASSPATH}")\n`;
  return { changed: true, content: content.replace(anchor, `${match[1]}${line}`) };
}

function addAppPlugin(appGradlePath) {
  const content = fs.readFileSync(appGradlePath, 'utf8');
  if (content.includes(PLUGIN_ID)) {
    return { changed: false, content };
  }

  const anchor = /(apply plugin: ["']com\.facebook\.react["']\n)/;
  if (!anchor.test(content)) {
    return { changed: false, content, error: 'Could not find the React Native plugin apply line' };
  }
  return { changed: true, content: content.replace(anchor, `$1apply plugin: "${PLUGIN_ID}"\n`) };
}

/**
 * Wire the Google Services Gradle plugin into the Android project.
 * @param {string} projectPath
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ status: string, detail: string }>}
 */
export async function applyGoogleServicesGradle(projectPath, options = {}) {
  if (options.dryRun) {
    return {
      status: 'skipped',
      detail: '[dry-run] Would add the Google Services Gradle plugin',
    };
  }

  const rootGradle = path.join(projectPath, 'android', 'build.gradle');
  const appGradle = path.join(projectPath, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(rootGradle) || !fs.existsSync(appGradle)) {
    return { status: 'failed', detail: 'Could not find the Android Gradle files' };
  }

  const root = addClasspath(rootGradle);
  const app = addAppPlugin(appGradle);
  const errors = [root.error, app.error].filter(Boolean);
  if (errors.length) {
    return { status: 'failed', detail: errors.join('; ') };
  }

  if (root.changed) fs.writeFileSync(rootGradle, root.content, 'utf8');
  if (app.changed) fs.writeFileSync(appGradle, app.content, 'utf8');

  if (!root.changed && !app.changed) {
    return { status: 'already-applied', detail: 'Google Services Gradle plugin already wired' };
  }
  return {
    status: 'applied',
    detail: 'Added the Google Services classpath and app plugin to Gradle',
  };
}
