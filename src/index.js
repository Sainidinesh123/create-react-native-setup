import { parseArgs, printHelp } from './cliArgs.js';
import { run } from './run.js';

/**
 * CLI entry used by bin/create-rn-setup.js
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

  return run({
    projectName: args.projectName,
    yes: args.yes,
    configPath: args.configPath,
    dryRun: args.dryRun,
  });
}

export { run, parseArgs, printHelp };
