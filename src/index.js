import { parseArgs, printHelp } from './cliArgs.js';
import { assertBrandingFlagPaths } from './branding/index.js';
import { assertFirebaseFlagPaths } from './firebase/index.js';
import { run } from './run.js';

/**
 * CLI entry used by bin/create-react-native-setup.js
 * @param {string[]} argv
 */
export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return { help: true };
  }
  if (args.unknown.length) {
    console.warn(`Warning: ignoring unknown arguments: ${args.unknown.join(', ')}`);
  }

  assertBrandingFlagPaths({ iconPath: args.iconPath, splashPath: args.splashPath });
  assertFirebaseFlagPaths({
    googleServicesPath: args.googleServicesPath,
    googleServiceInfoPath: args.googleServiceInfoPath,
  });

  return run({
    projectName: args.projectName,
    yes: args.yes,
    configPath: args.configPath,
    dryRun: args.dryRun,
    rnVersion: args.rnVersion,
    iconPath: args.iconPath,
    splashPath: args.splashPath,
    googleServicesPath: args.googleServicesPath,
    googleServiceInfoPath: args.googleServiceInfoPath,
    notificationIds: args.notificationIds,
  });
}

export { run, parseArgs, printHelp };
