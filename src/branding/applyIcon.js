import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { findAppIconSet, findAndroidResDir } from './nativePaths.js';

export const ANDROID_ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

/**
 * Slots used when the asset catalog has no usable Contents.json.
 * Mirrors the default React Native template (iPhone + App Store marketing).
 */
const IOS_FALLBACK_SLOTS = [
  { idiom: 'iphone', size: '20x20', scale: '2x' },
  { idiom: 'iphone', size: '20x20', scale: '3x' },
  { idiom: 'iphone', size: '29x29', scale: '2x' },
  { idiom: 'iphone', size: '29x29', scale: '3x' },
  { idiom: 'iphone', size: '40x40', scale: '2x' },
  { idiom: 'iphone', size: '40x40', scale: '3x' },
  { idiom: 'iphone', size: '60x60', scale: '2x' },
  { idiom: 'iphone', size: '60x60', scale: '3x' },
  { idiom: 'ios-marketing', size: '1024x1024', scale: '1x' },
];

function pixelSize(size, scale) {
  const width = Number(String(size).split('x')[0]);
  const factor = Number(String(scale ?? '1').replace('x', '')) || 1;
  return Math.round(width * factor);
}

/** Xcode ignores images that no Contents.json entry points at, so names are derived per slot. */
function iconFileName({ idiom, size, scale }) {
  const width = String(size).split('x')[0];
  const scaleSuffix = String(scale) === '1x' ? '' : `@${scale}`;
  const idiomSuffix = idiom === 'iphone' || idiom === 'ios-marketing' ? '' : `-${idiom}`;
  return `icon-${width}${scaleSuffix}${idiomSuffix}.png`;
}

/**
 * Resize `iconPath` into every Android mipmap and iOS AppIcon slot.
 * @param {string} projectPath
 * @param {string} iconPath
 * @param {{ dryRun?: boolean }} [options]
 */
export async function applyIcon(projectPath, iconPath, options = {}) {
  if (options.dryRun) {
    return {
      status: 'skipped',
      detail: `dry-run: would generate app icons from ${iconPath}`,
    };
  }

  const resDir = findAndroidResDir(projectPath);
  const appIconSet = findAppIconSet(projectPath);

  if (!resDir && !appIconSet) {
    return {
      status: 'failed',
      detail: 'No android res/ or iOS AppIcon.appiconset found in the project',
    };
  }

  const written = [];
  try {
    if (resDir) {
      for (const [folder, size] of Object.entries(ANDROID_ICON_SIZES)) {
        const dir = path.join(resDir, folder);
        fs.mkdirSync(dir, { recursive: true });
        for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
          await sharp(iconPath)
            .resize(size, size, { fit: 'cover' })
            .png()
            .toFile(path.join(dir, name));
          written.push(`${folder}/${name}`);
        }
      }
    }

    if (appIconSet) {
      const images = readIconSlots(appIconSet);
      for (const image of images) {
        const size = pixelSize(image.size, image.scale);
        if (!size) continue;
        image.filename = image.filename || iconFileName(image);
        await sharp(iconPath)
          .resize(size, size, { fit: 'cover' })
          .flatten({ background: '#ffffff' })
          .png()
          .toFile(path.join(appIconSet, image.filename));
        written.push(`AppIcon.appiconset/${image.filename}`);
      }
      writeIconContents(appIconSet, images);
    }
  } catch (error) {
    return { status: 'failed', detail: `Icon generation failed: ${error.message}` };
  }

  return {
    status: 'applied',
    detail: `Generated ${written.length} app icon file(s) from ${path.basename(iconPath)}`,
  };
}

function readIconSlots(appIconSet) {
  const contentsPath = path.join(appIconSet, 'Contents.json');
  if (!fs.existsSync(contentsPath)) {
    return IOS_FALLBACK_SLOTS.map((slot) => ({ ...slot }));
  }
  try {
    const contents = JSON.parse(fs.readFileSync(contentsPath, 'utf8'));
    const images = (contents.images || []).filter((image) => image.size && image.scale);
    return images.length ? images : IOS_FALLBACK_SLOTS.map((slot) => ({ ...slot }));
  } catch {
    return IOS_FALLBACK_SLOTS.map((slot) => ({ ...slot }));
  }
}

function writeIconContents(appIconSet, images) {
  const contentsPath = path.join(appIconSet, 'Contents.json');
  const contents = { images, info: { author: 'xcode', version: 1 } };
  fs.writeFileSync(contentsPath, `${JSON.stringify(contents, null, 2)}\n`, 'utf8');
}
