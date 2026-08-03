import path from 'node:path';
import { loadCatalog } from './catalog.js';
import {
  askProjectName,
  selectPackages,
  isValidProjectName,
  resolveReactNativeVersion,
  closePrompts,
} from './prompt.js';
import { createReactNativeProject, readProjectVersions } from './createProject.js';
import { resolveSelectedPackages } from './resolveVersions.js';
import { installPackages } from './installPackages.js';
import { runSetupSteps } from './setup/registry.js';
import { collectBrandingOptions, applyBranding, SPLASH_NPM_BY_ID } from './branding/index.js';
import {
  collectFirebaseOptions,
  applyFirebase,
} from './firebase/index.js';
import {
  collectNotificationOptions,
  ensureFirebaseAppSelected,
  applyNotifications,
  NOTIFICATION_PACKAGE_IDS,
} from './notifications/index.js';
import { printReport } from './report.js';
import { platformLabel } from './platform.js';

/**
 * Full create-react-native-setup pipeline.
 */
export async function run(options = {}) {
  const started = Date.now();
  const cwd = options.cwd || process.cwd();

  console.log(`\ncreate-react-native-setup (${platformLabel()})\n`);
  if (!options.yes) {
    console.log('── Configuration ──────────────────────────────────────────');
    console.log('Answer the questions below. Project creation starts only after this.\n');
  }

  const catalog = loadCatalog(options.configPath);
  let projectName = options.projectName;
  if (!projectName) {
    projectName = await askProjectName();
  } else if (!isValidProjectName(projectName)) {
    throw new Error(
      `Invalid project name "${projectName}". Use letters, numbers, underscore, or hyphen; start with a letter.`,
    );
  }

  const requestedVersion = await resolveReactNativeVersion({
    requested: options.rnVersion,
    yes: Boolean(options.yes),
  });

  let selected = await selectPackages(catalog, { yes: Boolean(options.yes) });

  // Notifications group Yes currently selects both packages via catalog.
  // Replace those with the multi-select (or --notifications flag) result.
  const wantsNotifications =
    selected.some((pkg) => NOTIFICATION_PACKAGE_IDS.includes(pkg.id)) ||
    Boolean(options.notificationIds?.length);
  selected = selected.filter((pkg) => !NOTIFICATION_PACKAGE_IDS.includes(pkg.id));

  const { packageIds: notificationPackageIds } = await collectNotificationOptions({
    yes: Boolean(options.yes),
    notificationIds: options.notificationIds,
    notificationsGroupSelected: wantsNotifications,
  });
  for (const id of notificationPackageIds) {
    const pkg = catalog.packageById.get(id);
    if (pkg) selected.push(pkg);
  }
  selected = ensureFirebaseAppSelected(selected, catalog, notificationPackageIds);

  const firebaseSelected = selected.some((pkg) => pkg.id === 'firebase-app');
  const firebasePaths = await collectFirebaseOptions({
    yes: Boolean(options.yes),
    googleServicesPath: options.googleServicesPath,
    googleServiceInfoPath: options.googleServiceInfoPath,
    firebaseSelected,
  });

  const branding = await collectBrandingOptions({
    yes: Boolean(options.yes),
    iconPath: options.iconPath,
    splashPath: options.splashPath,
    splashPackage: options.splashPackage,
    splashBackground: options.splashBackground,
  });

  closePrompts();

  console.log('\n── Summary ────────────────────────────────────────────────');
  console.log(`  Project:        ${projectName}`);
  console.log(`  React Native:   ${requestedVersion}`);
  console.log(
    `  Packages:       ${selected.length ? selected.map((p) => p.id).join(', ') : '(none)'}`,
  );
  if (firebasePaths.googleServicesPath || firebasePaths.googleServiceInfoPath) {
    console.log('  Firebase:       config path(s) provided');
  }
  if (branding.iconPath) {
    console.log(`  App icon:       ${branding.iconPath}`);
  }
  if (branding.splashPath) {
    console.log(
      `  Splash:         ${branding.splashPackage || 'native'} @ ${branding.splashBackground || '#ffffff'}`,
    );
    console.log(`  Splash image:   ${branding.splashPath}`);
  }
  console.log(
    options.dryRun
      ? '\nStarting dry-run (no files will be written)...\n'
      : '\nStarting setup automatically...\n',
  );

  let projectPath = path.join(cwd, projectName);
  let reactNativeVersion = requestedVersion;
  let reactVersion;
  let packageManager = 'npm';

  if (options.dryRun) {
    console.log(
      `[dry-run] Would create React Native ${reactNativeVersion} project at ${projectPath}`,
    );
  } else {
    console.log(`Creating React Native project "${projectName}"...\n`);
    const created = await createReactNativeProject(projectName, cwd, {
      dryRun: false,
      version: requestedVersion,
    });
    projectPath = created.projectPath;
    const versions = readProjectVersions(projectPath);
    reactNativeVersion = versions.reactNative || created.reactNativeVersion;
    reactVersion = versions.react || created.reactVersion;
  }

  const context = {
    reactNative: reactNativeVersion,
    react: reactVersion || '19.0.0',
  };

  const splashNpm = branding.splashPackage
    ? SPLASH_NPM_BY_ID[branding.splashPackage]
    : null;

  console.log('Resolving compatible package versions...\n');
  const { resolved, skipped } = await resolveSelectedPackages([...selected], context);

  if (splashNpm) {
    const splashResolved = await resolveSelectedPackages(
      [{ id: 'splash-lib', npm: [splashNpm], peers: [] }],
      context,
    );
    for (const item of splashResolved.resolved) {
      if (!resolved.some((r) => r.name === item.name)) {
        resolved.push(item);
      }
    }
    for (const item of splashResolved.skipped) {
      skipped.push(item);
    }
  }

  for (const item of resolved) {
    console.log(`  ✓ ${item.name}@${item.version}`);
  }
  for (const item of skipped) {
    console.log(`  ✗ skip ${item.name}: ${item.reason}`);
  }

  const installResult = await installPackages(projectPath, resolved, {
    dryRun: Boolean(options.dryRun),
  });
  packageManager = installResult.packageManager;

  if (!options.dryRun && resolved.length) {
    console.log(`\nInstalled ${resolved.length} package(s) with ${packageManager}.\n`);
  } else if (options.dryRun && resolved.length) {
    console.log(`\n[dry-run] Would install with ${packageManager}:`);
    console.log(`  ${installResult.command}\n`);
  }

  console.log('Running setup steps...\n');
  const setup = await runSetupSteps(selected, projectPath, {
    dryRun: Boolean(options.dryRun),
    openBrowser: options.openBrowser,
  });

  if (firebasePaths.googleServicesPath || firebasePaths.googleServiceInfoPath) {
    console.log('Applying Firebase config...\n');
    setup.push(
      ...(await applyFirebase(projectPath, projectName, firebasePaths, {
        dryRun: Boolean(options.dryRun),
        includeMessagingManual: notificationPackageIds.includes('firebase-messaging'),
      })),
    );
  }

  if (notificationPackageIds.length) {
    console.log('Applying notification setup...\n');
    setup.push(
      ...(await applyNotifications(projectPath, projectName, {
        packageIds: notificationPackageIds,
        dryRun: Boolean(options.dryRun),
      })),
    );
  }

  if (branding.iconPath || branding.splashPath) {
    console.log('Applying app icon and splash screen...\n');
    setup.push(
      ...(await applyBranding(projectPath, branding, {
        dryRun: Boolean(options.dryRun),
      })),
    );
  }

  const report = {
    projectName,
    projectPath,
    reactNativeVersion,
    reactVersion,
    packageManager,
    dryRun: Boolean(options.dryRun),
    installed: resolved,
    skipped,
    setup,
    durationMs: Date.now() - started,
    selectedPackageIds: selected.map((p) => p.id),
  };

  printReport(report);
  return report;
}
