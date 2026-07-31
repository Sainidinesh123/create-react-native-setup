import fs from 'node:fs';
import path from 'node:path';

export function formatDuration(ms) {
  if (ms == null) return 'n/a';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(0);
  return `${m}m ${s}s`;
}

export function collectManualActions(report) {
  const items = [];
  for (const step of report.setup || []) {
    if (step.manualAction) {
      items.push(step.manualAction);
    }
    if (step.status === 'failed') {
      items.push(`Fix failed setup ${step.packageId}/${step.type}: ${step.detail}`);
    }
    if (
      step.type === 'podInstall' &&
      step.status === 'skipped' &&
      /not macOS/i.test(step.detail || '')
    ) {
      items.push('On macOS: cd ios && pod install');
    }
  }
  for (const pkg of report.skipped || []) {
    items.push(`Review skipped package ${pkg.name}: ${pkg.reason}`);
  }
  return [...new Set(items)];
}

export function formatReport(report) {
  const lines = [];
  lines.push('');
  lines.push('══════════════════════════════════════════════════');
  lines.push(' create-react-native-setup report');
  lines.push('══════════════════════════════════════════════════');
  lines.push(` Project:      ${report.projectName}`);
  lines.push(` Path:         ${report.projectPath}`);
  lines.push(` React Native: ${report.reactNativeVersion || 'n/a'}`);
  lines.push(` Package mgr:  ${report.packageManager || 'n/a'}`);
  lines.push(` Dry run:      ${report.dryRun ? 'yes' : 'no'}`);
  lines.push(` Duration:     ${formatDuration(report.durationMs)}`);
  lines.push('');

  lines.push(' Installed packages');
  if (!report.installed?.length) {
    lines.push('   (none)');
  } else {
    for (const pkg of report.installed) {
      lines.push(`   • ${pkg.name}@${pkg.version}`);
      if (pkg.reason) lines.push(`     └ ${pkg.reason}`);
    }
  }
  lines.push('');

  lines.push(' Skipped packages');
  if (!report.skipped?.length) {
    lines.push('   (none)');
  } else {
    for (const pkg of report.skipped) {
      lines.push(`   • ${pkg.name}`);
      lines.push(`     └ ${pkg.reason}`);
    }
  }
  lines.push('');

  lines.push(' Setup steps');
  if (!report.setup?.length) {
    lines.push('   (none)');
  } else {
    for (const step of report.setup) {
      lines.push(
        `   • [${step.status}] ${step.packageId}/${step.type}: ${step.detail}`,
      );
    }
  }
  lines.push('');

  lines.push(' Remaining manual actions');
  const manual = collectManualActions(report);
  if (!manual.length) {
    lines.push('   (none)');
  } else {
    for (const item of manual) {
      lines.push(`   • ${item}`);
    }
  }
  lines.push('══════════════════════════════════════════════════');
  lines.push('');
  return lines.join('\n');
}

export function writeReportFile(report) {
  if (report.dryRun) {
    return null;
  }
  const out = path.join(report.projectPath, 'create-react-native-setup-report.json');
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return out;
}

export function printReport(report) {
  const text = formatReport(report);
  console.log(text);
  const file = writeReportFile(report);
  if (file) {
    console.log(`Report written to ${file}`);
  }
  return text;
}
