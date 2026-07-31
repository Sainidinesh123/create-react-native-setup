import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
);
export const GOOGLE_SERVICES_FIXTURE = path.join(FIXTURES_DIR, 'google-services.json');
export const GOOGLE_SERVICE_INFO_FIXTURE = path.join(FIXTURES_DIR, 'GoogleService-Info.plist');

const ROOT_GRADLE = `buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 24
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
    }
}

apply plugin: "com.facebook.react.rootproject"
`;

const APP_GRADLE = `apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

android {
    namespace "com.demo"
    defaultConfig {
        applicationId "com.demo"
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

const MANIFEST = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
      android:name=".MainApplication"
      android:label="@string/app_name">
      <activity
        android:name=".MainActivity"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
    </application>
</manifest>
`;

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>Demo</string>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
</dict>
</plist>
`;

const APP_DELEGATE_SWIFT = `import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    self.moduleName = "Demo"
    self.dependencyProvider = RCTAppDependencyProvider()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
`;

/**
 * Minimal stand-in for a freshly created bare React Native project.
 * @param {{ name?: string, android?: boolean, ios?: boolean, typescript?: boolean }} [options]
 * @returns {string} project path
 */
export function fakeNativeProject(options = {}) {
  const { name = 'Demo', android = true, ios = true, typescript = false } = options;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crns-native-'));

  fs.writeFileSync(
    path.join(dir, 'package.json'),
    `${JSON.stringify({ name: name.toLowerCase(), version: '0.0.1' }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(dir, 'index.js'),
    `import { AppRegistry } from 'react-native';\nimport App from './App';\nimport { name as appName } from './app.json';\n\nAppRegistry.registerComponent(appName, () => App);\n`,
  );
  if (typescript) {
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{\n  "extends": "@react-native/typescript-config"\n}\n');
    fs.writeFileSync(path.join(dir, 'App.tsx'), 'export default function App() {}\n');
  } else {
    fs.writeFileSync(path.join(dir, 'App.js'), 'export default function App() {}\n');
  }

  if (android) {
    const appDir = path.join(dir, 'android', 'app');
    fs.mkdirSync(path.join(appDir, 'src', 'main'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'android', 'build.gradle'), ROOT_GRADLE);
    fs.writeFileSync(path.join(appDir, 'build.gradle'), APP_GRADLE);
    fs.writeFileSync(path.join(appDir, 'src', 'main', 'AndroidManifest.xml'), MANIFEST);
  }

  if (ios) {
    const iosApp = path.join(dir, 'ios', name);
    fs.mkdirSync(iosApp, { recursive: true });
    fs.writeFileSync(path.join(iosApp, 'Info.plist'), INFO_PLIST);
    fs.writeFileSync(path.join(iosApp, 'AppDelegate.swift'), APP_DELEGATE_SWIFT);
    fs.mkdirSync(path.join(dir, 'ios', `${name}.xcodeproj`), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'ios', `${name}.xcodeproj`, 'project.pbxproj'),
      '// !$*UTF8*$!\n{\n}\n',
    );
  }

  return dir;
}
