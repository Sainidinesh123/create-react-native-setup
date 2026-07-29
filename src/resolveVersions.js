import semver from 'semver';
import spawn from 'cross-spawn';

/**
 * @param {string[]} args
 * @returns {Promise<string>}
 */
export function runNpmView(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['view', ...args, '--json'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `npm view failed (${code})`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function defaultFetchVersions(packageName) {
  const raw = await runNpmView([packageName, 'versions']);
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function defaultFetchPeers(packageName, version) {
  try {
    const raw = await runNpmView([`${packageName}@${version}`, 'peerDependencies']);
    if (!raw || raw === 'null' || raw === 'undefined') {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function getLatestReactNativeVersion(fetchVersions = defaultFetchVersions) {
  const versions = await fetchVersions('react-native');
  const stable = versions
    .filter((v) => semver.valid(v) && !semver.prerelease(v))
    .sort(semver.rcompare);
  if (!stable.length) {
    throw new Error('Could not resolve a stable react-native version from npm');
  }
  return stable[0];
}

/**
 * Check whether peerDependencies are satisfied by installed RN/React.
 */
export function peersCompatible(peers, { reactNative, react }) {
  if (!peers || typeof peers !== 'object') {
    return true;
  }
  if (peers['react-native']) {
    const range = coercePeerRange(peers['react-native']);
    if (
      range &&
      reactNative &&
      !semver.satisfies(semver.coerce(reactNative), range, { includePrerelease: true })
    ) {
      return false;
    }
  }
  if (peers.react) {
    const range = coercePeerRange(peers.react);
    if (
      range &&
      react &&
      !semver.satisfies(semver.coerce(react), range, { includePrerelease: true })
    ) {
      return false;
    }
  }
  return true;
}

function coercePeerRange(range) {
  if (!range || range === '*') {
    return '*';
  }
  try {
    if (semver.validRange(range)) {
      return range;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resolve latest compatible stable version for a package.
 */
export async function resolveCompatibleVersion(packageName, context, deps = {}) {
  const fetchVersions = deps.fetchVersions || defaultFetchVersions;
  const fetchPeers = deps.fetchPeers || defaultFetchPeers;

  let versions;
  try {
    versions = await fetchVersions(packageName);
  } catch (error) {
    return {
      skipped: true,
      reason: `Failed to list versions for ${packageName}: ${error.message}`,
    };
  }

  const stable = versions
    .filter((v) => semver.valid(v) && !semver.prerelease(v))
    .sort(semver.rcompare);

  if (!stable.length) {
    return {
      skipped: true,
      reason: `No stable versions published for ${packageName}`,
    };
  }

  for (const version of stable) {
    const peers = await fetchPeers(packageName, version);
    if (peersCompatible(peers, context)) {
      return {
        version,
        reason:
          version === stable[0]
            ? 'latest stable compatible with React Native peers'
            : `latest stable (${stable[0]}) incompatible; selected ${version}`,
      };
    }
  }

  return {
    skipped: true,
    reason: `No stable version of ${packageName} is compatible with react-native@${context.reactNative}`,
  };
}

/**
 * Resolve npm packages for selected catalog entries (deduped).
 */
export async function resolveSelectedPackages(selectedPackages, context, deps = {}) {
  const installedNames = new Set();
  const resolved = [];
  const skipped = [];

  const queue = [];
  for (const entry of selectedPackages) {
    for (const name of entry.npm) {
      queue.push({ name, from: entry.id });
    }
    for (const peer of entry.peers || []) {
      queue.push({ name: peer, from: `${entry.id}:peer` });
    }
  }

  for (const item of queue) {
    if (installedNames.has(item.name)) {
      continue;
    }
    const result = await resolveCompatibleVersion(item.name, context, deps);
    if (result.skipped) {
      skipped.push({ name: item.name, from: item.from, reason: result.reason });
      continue;
    }
    installedNames.add(item.name);
    resolved.push({
      name: item.name,
      version: result.version,
      reason: result.reason,
      from: item.from,
    });
  }

  return { resolved, skipped };
}
