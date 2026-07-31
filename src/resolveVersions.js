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

/** @returns {Promise<Set<string>>} peer names the package marks as optional. */
export async function defaultFetchPeerMeta(packageName, version) {
  try {
    const raw = await runNpmView([`${packageName}@${version}`, 'peerDependenciesMeta']);
    if (!raw || raw === 'null' || raw === 'undefined') {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    return new Set(
      Object.entries(parsed || {})
        .filter(([, meta]) => meta?.optional)
        .map(([name]) => name),
    );
  } catch {
    return new Set();
  }
}

/**
 * Peers supplied by the React Native template (or that must never be added to a bare app).
 * Everything else a package requires has to be installed or the native build fails —
 * react-native-reanimated@4 needs react-native-worklets, for example.
 */
const TEMPLATE_PROVIDED_PEERS = new Set([
  'react',
  'react-native',
  'react-dom',
  'react-native-web',
  '@babel/core',
  '@react-native/metro-config',
  'expo',
]);

export async function defaultFetchLatest(packageName) {
  try {
    const raw = await runNpmView([packageName, 'dist-tags.latest']);
    const value = raw.replace(/^"|"$/g, '').trim();
    return semver.valid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Versions at or above this are npm placeholders (e.g. react-native@1000.0.0), never real releases. */
const PLACEHOLDER_VERSION_FLOOR = '1000.0.0';

/**
 * Stable versions, newest first, excluding anything above the `latest` dist-tag.
 */
function stableVersionsUpToLatest(versions, latest) {
  const stable = versions
    .filter((v) => semver.valid(v) && !semver.prerelease(v))
    .sort(semver.rcompare);
  const ceiling = latest && semver.valid(latest) ? latest : undefined;
  return stable.filter((v) =>
    ceiling ? semver.lte(v, ceiling) : semver.lt(v, PLACEHOLDER_VERSION_FLOOR),
  );
}

export async function getLatestReactNativeVersion(
  fetchVersions = defaultFetchVersions,
  fetchLatest = defaultFetchLatest,
) {
  const latest = await fetchLatest('react-native');
  if (latest && !semver.prerelease(latest)) {
    return latest;
  }
  const versions = await fetchVersions('react-native');
  const stable = stableVersionsUpToLatest(versions, latest);
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
 * @param {string} packageName
 * @param {{ reactNative?: string, react?: string }} context
 * @param {{ fetchVersions?: Function, fetchPeers?: Function, fetchLatest?: Function, range?: string }} deps
 */
export async function resolveCompatibleVersion(packageName, context, deps = {}) {
  const fetchVersions = deps.fetchVersions || defaultFetchVersions;
  const fetchPeers = deps.fetchPeers || defaultFetchPeers;
  const fetchLatest = deps.fetchLatest || defaultFetchLatest;

  let versions;
  try {
    versions = await fetchVersions(packageName);
  } catch (error) {
    return {
      skipped: true,
      reason: `Failed to list versions for ${packageName}: ${error.message}`,
    };
  }

  let stable = stableVersionsUpToLatest(versions, await fetchLatest(packageName));

  const range = coercePeerRange(deps.range);
  if (deps.range && range && range !== '*') {
    stable = stable.filter((version) => semver.satisfies(version, range));
  }

  if (!stable.length) {
    return {
      skipped: true,
      reason: deps.range
        ? `No stable version of ${packageName} matches ${deps.range}`
        : `No stable versions published for ${packageName}`,
    };
  }

  for (const version of stable) {
    const peers = await fetchPeers(packageName, version);
    if (peersCompatible(peers, context)) {
      return {
        version,
        peers,
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
  const fetchPeerMeta = deps.fetchPeerMeta || defaultFetchPeerMeta;
  const installedNames = new Set();
  const queuedNames = new Set();
  const resolved = [];
  const skipped = [];

  const queue = [];
  const enqueue = (item) => {
    if (queuedNames.has(item.name)) return;
    queuedNames.add(item.name);
    queue.push(item);
  };

  for (const entry of selectedPackages) {
    for (const name of entry.npm) {
      enqueue({ name, from: entry.id });
    }
    for (const peer of entry.peers || []) {
      if (typeof peer === 'string') {
        enqueue({ name: peer, from: `${entry.id}:peer` });
      } else if (peer?.name) {
        enqueue({ name: peer.name, from: `${entry.id}:peer`, range: peer.range });
      }
    }
  }

  while (queue.length) {
    const item = queue.shift();
    if (installedNames.has(item.name)) {
      continue;
    }
    const result = await resolveCompatibleVersion(item.name, context, {
      ...deps,
      range: item.range,
    });
    if (result.skipped) {
      skipped.push({ name: item.name, from: item.from, reason: result.reason });
      continue;
    }
    installedNames.add(item.name);
    resolved.push({
      name: item.name,
      version: result.version,
      reason: item.range ? `required peer of ${item.from}` : result.reason,
      from: item.from,
    });

    for (const peer of await requiredPeers(item.name, result, fetchPeerMeta)) {
      enqueue({ name: peer.name, from: item.name, range: peer.range });
    }
  }

  return { resolved, skipped };
}

/** Peers that must be installed alongside `packageName` for the native build to succeed. */
async function requiredPeers(packageName, result, fetchPeerMeta) {
  const candidates = Object.entries(result.peers || {}).filter(
    ([name]) => !TEMPLATE_PROVIDED_PEERS.has(name),
  );
  if (!candidates.length) {
    return [];
  }
  const optional = await fetchPeerMeta(packageName, result.version);
  return candidates
    .filter(([name]) => !optional.has(name))
    .map(([name, range]) => ({ name, range }));
}
