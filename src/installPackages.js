import {
  buildInstallArgs,
  detectPackageManager,
  installCommand,
} from './packageManager.js';
import { runCommand } from './createProject.js';

/**
 * Install resolved packages into the project.
 */
export async function installPackages(projectPath, packages, options = {}) {
  if (!packages.length) {
    return {
      packageManager: options.pm || detectPackageManager(projectPath),
      installed: [],
    };
  }

  const pm = options.pm || detectPackageManager(projectPath);
  const command = installCommand(pm);
  const args = buildInstallArgs(pm, packages);

  if (options.dryRun) {
    return {
      packageManager: pm,
      installed: packages,
      command: `${command} ${args.join(' ')}`,
    };
  }

  const run = options.run || runCommand;
  await run(command, args, { cwd: projectPath });
  return { packageManager: pm, installed: packages };
}
