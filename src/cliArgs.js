/**
 * Parse CLI arguments for create-rn-setup.
 * @param {string[]} argv
 */
export function parseArgs(argv = []) {
  const result = {
    yes: false,
    dryRun: false,
    help: false,
    unknown: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }
    if (arg === '--yes' || arg === '-y' || arg === '--default') {
      result.yes = true;
      continue;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    if (arg === '--config') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('--config requires a file path');
      }
      result.configPath = next;
      i += 1;
      continue;
    }
    if (arg.startsWith('--config=')) {
      result.configPath = arg.slice('--config='.length);
      if (!result.configPath) {
        throw new Error('--config requires a file path');
      }
      continue;
    }
    if (arg.startsWith('-')) {
      result.unknown.push(arg);
      continue;
    }
    if (!result.projectName) {
      result.projectName = arg;
      continue;
    }
    result.unknown.push(arg);
  }

  return result;
}

export function printHelp() {
  console.log(`
create-rn-setup — bootstrap a React Native app with optional packages

Usage:
  npx create-rn-setup [projectName] [options]
  node bin/create-rn-setup.js [projectName] [options]

Options:
  --yes, -y, --default   Install all default catalog packages without prompts
  --config <file>        Use a custom package catalog JSON
  --dry-run              Show what would happen without creating or installing
  --help, -h             Show this help

Examples:
  npx create-rn-setup MyApp
  npx create-rn-setup MyApp --yes
  npx create-rn-setup --dry-run --yes DemoApp
  npx create-rn-setup MyApp --config ./my-catalog.json
`.trim());
}
