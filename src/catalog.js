import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getDefaultCatalogPath() {
  return path.join(__dirname, '..', 'catalogs', 'default.json');
}

/**
 * @param {string} [configPath]
 */
export function loadCatalog(configPath) {
  const resolved = configPath
    ? path.resolve(process.cwd(), configPath)
    : getDefaultCatalogPath();

  if (!fs.existsSync(resolved)) {
    throw new Error(`Catalog not found: ${resolved}`);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid catalog JSON at ${resolved}: ${error.message}`);
  }

  return validateCatalog(raw, resolved);
}

/**
 * @param {any} raw
 * @param {string} source
 */
export function validateCatalog(raw, source = 'catalog') {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${source}: catalog must be an object`);
  }
  if (raw.version !== 1) {
    throw new Error(`${source}: unsupported catalog version (expected 1)`);
  }
  if (!Array.isArray(raw.packages) || raw.packages.length === 0) {
    throw new Error(`${source}: packages must be a non-empty array`);
  }
  if (!Array.isArray(raw.groups)) {
    throw new Error(`${source}: groups must be an array`);
  }

  const packageById = new Map();
  for (const pkg of raw.packages) {
    if (!pkg?.id || typeof pkg.id !== 'string') {
      throw new Error(`${source}: every package needs a string id`);
    }
    if (packageById.has(pkg.id)) {
      throw new Error(`${source}: duplicate package id "${pkg.id}"`);
    }
    if (!pkg.label || typeof pkg.label !== 'string') {
      throw new Error(`${source}: package "${pkg.id}" needs a label`);
    }
    if (!Array.isArray(pkg.npm) || pkg.npm.length === 0) {
      throw new Error(`${source}: package "${pkg.id}" needs a non-empty npm array`);
    }
    if (pkg.peers && !Array.isArray(pkg.peers)) {
      throw new Error(`${source}: package "${pkg.id}" peers must be an array`);
    }
    if (pkg.setup && !Array.isArray(pkg.setup)) {
      throw new Error(`${source}: package "${pkg.id}" setup must be an array`);
    }
    for (const step of pkg.setup || []) {
      if (!step?.type || typeof step.type !== 'string') {
        throw new Error(`${source}: package "${pkg.id}" has a setup step without type`);
      }
    }
    packageById.set(pkg.id, {
      ...pkg,
      default: Boolean(pkg.default),
      peers: pkg.peers || [],
      setup: pkg.setup || [],
    });
  }

  const groups = [];
  const referenced = new Set();
  for (const group of raw.groups) {
    if (!group?.id || typeof group.id !== 'string') {
      throw new Error(`${source}: every group needs a string id`);
    }
    if (!group.label || typeof group.label !== 'string') {
      throw new Error(`${source}: group "${group.id}" needs a label`);
    }
    if (!Array.isArray(group.packages)) {
      throw new Error(`${source}: group "${group.id}" packages must be an array`);
    }
    for (const packageId of group.packages) {
      if (!packageById.has(packageId)) {
        throw new Error(
          `${source}: group "${group.id}" references unknown package "${packageId}"`,
        );
      }
      referenced.add(packageId);
    }
    groups.push({
      ...group,
      default: Boolean(group.default),
      description: group.description || '',
    });
  }

  const packages = [...packageById.values()];
  const ungrouped = packages.filter((pkg) => !referenced.has(pkg.id));

  return {
    version: 1,
    source,
    groups,
    packages,
    packageById,
    ungrouped,
  };
}
