import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  findAndroidResDir,
  findAndroidStyles,
  findAssetCatalog,
  findLaunchScreen,
} from './nativePaths.js';

export const ANDROID_SPLASH_SIZES = {
  'drawable-mdpi': 200,
  'drawable-hdpi': 300,
  'drawable-xhdpi': 400,
  'drawable-xxhdpi': 600,
  'drawable-xxxhdpi': 800,
};

export const IOS_SPLASH_SCALES = [
  { suffix: '', size: 256, scale: '1x' },
  { suffix: '@2x', size: 512, scale: '2x' },
  { suffix: '@3x', size: 768, scale: '3x' },
];

const SPLASH_BACKGROUND = '#ffffff';

/**
 * Configure a native splash screen from `splashPath` — no runtime dependency is added.
 * Android uses a layer-list windowBackground; iOS uses a generated LaunchScreen storyboard.
 * Logo is centered on a solid background (no crop / stretch).
 * @param {string} projectPath
 * @param {string} splashPath
 * @param {{ dryRun?: boolean, background?: string }} [options]
 */
export async function applySplash(projectPath, splashPath, options = {}) {
  if (options.dryRun) {
    return {
      status: 'skipped',
      detail: `dry-run: would configure native splash screen from ${splashPath}`,
    };
  }

  const background = options.background || SPLASH_BACKGROUND;
  const resDir = findAndroidResDir(projectPath);
  const assetCatalog = findAssetCatalog(projectPath);

  if (!resDir && !assetCatalog) {
    return {
      status: 'failed',
      detail: 'No android res/ or iOS Images.xcassets found in the project',
    };
  }

  const applied = [];
  try {
    if (resDir) {
      await writeAndroidSplash(resDir, splashPath, background);
      applied.push('Android drawables');
      const stylesPath = findAndroidStyles(projectPath);
      if (stylesPath && addWindowBackground(stylesPath)) {
        applied.push('AppTheme windowBackground');
      }
    }
    if (assetCatalog) {
      await writeIosSplash(assetCatalog, splashPath, background);
      applied.push('iOS Splash.imageset');
      const launchScreen = findLaunchScreen(projectPath);
      if (launchScreen) {
        fs.writeFileSync(launchScreen, splashStoryboard(background), 'utf8');
        applied.push('LaunchScreen.storyboard');
      }
    }
  } catch (error) {
    return { status: 'failed', detail: `Splash generation failed: ${error.message}` };
  }

  return {
    status: 'applied',
    detail: `Configured splash screen (${applied.join(', ')}) from ${path.basename(splashPath)}`,
  };
}

async function writeAndroidSplash(resDir, splashPath, background = SPLASH_BACKGROUND) {
  for (const [folder, size] of Object.entries(ANDROID_SPLASH_SIZES)) {
    const dir = path.join(resDir, folder);
    fs.mkdirSync(dir, { recursive: true });
    await sharp(splashPath)
      .resize(size, size, { fit: 'contain', background })
      .flatten({ background })
      .png()
      .toFile(path.join(dir, 'splash_image.png'));
  }

  const drawableDir = path.join(resDir, 'drawable');
  fs.mkdirSync(drawableDir, { recursive: true });
  fs.writeFileSync(
    path.join(drawableDir, 'splash.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape android:shape="rectangle">
            <solid android:color="${background}" />
        </shape>
    </item>
    <item>
        <bitmap
            android:src="@drawable/splash_image"
            android:gravity="center" />
    </item>
</layer-list>
`,
    'utf8',
  );
}

/** @returns {boolean} whether styles.xml was modified. */
function addWindowBackground(stylesPath) {
  const content = fs.readFileSync(stylesPath, 'utf8');
  if (content.includes('android:windowBackground')) {
    return false;
  }
  const themeTag = /<style name="AppTheme"[^>]*>/;
  if (!themeTag.test(content)) {
    return false;
  }
  const updated = content.replace(
    themeTag,
    (match) =>
      `${match}\n        <item name="android:windowBackground">@drawable/splash</item>`,
  );
  fs.writeFileSync(stylesPath, updated, 'utf8');
  return true;
}

async function writeIosSplash(assetCatalog, splashPath, background = SPLASH_BACKGROUND) {
  const imageSet = path.join(assetCatalog, 'Splash.imageset');
  fs.mkdirSync(imageSet, { recursive: true });

  for (const { suffix, size } of IOS_SPLASH_SCALES) {
    await sharp(splashPath)
      .resize(size, size, { fit: 'contain', background })
      .flatten({ background })
      .png()
      .toFile(path.join(imageSet, `splash${suffix}.png`));
  }

  const contents = {
    images: IOS_SPLASH_SCALES.map(({ suffix, scale }) => ({
      idiom: 'universal',
      filename: `splash${suffix}.png`,
      scale,
    })),
    info: { author: 'xcode', version: 1 },
  };
  fs.writeFileSync(
    path.join(imageSet, 'Contents.json'),
    `${JSON.stringify(contents, null, 2)}\n`,
    'utf8',
  );
}

/** Centered logo on solid background — aspect-fit, no crop/stretch. */
function splashStoryboard(background = SPLASH_BACKGROUND) {
  const red = parseInt(background.slice(1, 3), 16) / 255;
  const green = parseInt(background.slice(3, 5), 16) / 255;
  const blue = parseInt(background.slice(5, 7), 16) / 255;
  return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="15702" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina4_7" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="15704"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <!--View Controller-->
        <scene sceneID="EHf-IW-A2E">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="375" height="667"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFit" horizontalHuggingPriority="251" verticalHuggingPriority="251" image="Splash" translatesAutoresizingMaskIntoConstraints="NO" id="SPL-as-h01">
                                <rect key="frame" x="93.5" y="239.5" width="188" height="188"/>
                            </imageView>
                        </subviews>
                        <color key="backgroundColor" red="${red}" green="${green}" blue="${blue}" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
                        <constraints>
                            <constraint firstItem="SPL-as-h01" firstAttribute="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="SPL-cx-001"/>
                            <constraint firstItem="SPL-as-h01" firstAttribute="centerY" secondItem="Ze5-6b-2t3" secondAttribute="centerY" id="SPL-cy-002"/>
                            <constraint firstItem="SPL-as-h01" firstAttribute="width" secondItem="Ze5-6b-2t3" secondAttribute="width" multiplier="0.5" id="SPL-wd-003"/>
                            <constraint firstItem="SPL-as-h01" firstAttribute="height" secondItem="SPL-as-h01" secondAttribute="width" multiplier="1:1" id="SPL-ar-004"/>
                        </constraints>
                        <viewLayoutGuide key="safeArea" id="Bcu-3y-fUS"/>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="52" y="375"/>
        </scene>
    </scenes>
    <resources>
        <image name="Splash" width="256" height="256"/>
    </resources>
</document>
`;
}
