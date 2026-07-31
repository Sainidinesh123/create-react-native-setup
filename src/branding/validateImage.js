import fs from 'node:fs';
import path from 'node:path';

export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/**
 * @param {string} imagePath
 * @returns {{ ok: true, absolutePath: string } | { ok: false, error: string }}
 */
export function validateImagePath(imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.trim()) {
    return { ok: false, error: 'Image path is required' };
  }

  const absolutePath = path.resolve(imagePath.trim().replace(/^~(?=\/)/, process.env.HOME || '~'));
  const extension = path.extname(absolutePath).toLowerCase();

  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      error: `Unsupported image type "${extension || 'none'}". Use ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    };
  }
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return { ok: false, error: `Image file not found: ${absolutePath}` };
  }

  return { ok: true, absolutePath };
}
