import path from 'node:path';
import { loadCatalog } from './catalog.js';
import { askProjectName, selectPackages, isValidProjectName } from './prompt.js';
import { createReactNativeProject, readProjectVersions } from './createProject.js';
import { resolveSelectedPackages, getLatestReactNativeVersion } from './resolveVersions.js';
import { installPackages } from './installPackages.js';
import { runSetupSteps } from './setup/registry.js';
import { printReport } from './report.js';
import { platformLabel } from './platform.js';

/**
 * Full create-rn-setup pipeline.
 */
export async function run(options = {}) {
  const started = Date.now();
  const cwd = options.cwd || process.cwd();

  console.log(`\ncreate-rn-setup (${platformLabel()})\n`);

  const catalog = loadCatalog(options.configPath);
  let projectName = options.projectName;
  if (!projectName) {
    projectName = await askProjectName();
  } else if (!isValidProjectName(projectName)) {
    throw new Error(
      `Invalid project name "${projectName}". Use letters, numbers, underscore, or hyphen; start with a letter.`,
    );
  }

  const selected = await selectPackages(catalog, { yes: Boolean(options.yes) });
  console.log(
    selected.length
      ? `\nSelected ${selected.length} package group entry(ies).\n`
      : '\nNo optional packages selected.\n',
  );

  let projectPath = path.join(cwd, projectName);
  let reactNativeVersion;
  let reactVersion;
  let packageManager = 'npm';

  if (options.dryRun) {
    reactNativeVersion = await getLatestReactNativeVersion();
    console.log(
      `[dry-run] Would create React Native ${reactNativeVersion} project at ${projectPath}`,
    );
  } else {
    console.log(`Creating React Native project "${projectName}"...\n`);
    const created = await createReactNativeProject(projectName, cwd, {
      dryRun: false,
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

  console.log('Resolving compatible package versions...\n');
  const { resolved, skipped } = await resolveSelectedPackages(selected, context);

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
