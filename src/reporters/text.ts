import type { ScanResult } from '../scanner.js';
import type { Issue } from '../checkers/base.js';

const COLORS: Record<string, string> = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function colorize(text: string, color: string): string {
  return `${COLORS[color] ?? ''}${text}${COLORS.reset}`;
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'error':
      return colorize('✕', 'red');
    case 'warning':
      return colorize('⚠', 'yellow');
    case 'info':
      return colorize('ℹ', 'cyan');
    default:
      return '·';
  }
}

export function reportText(result: ScanResult): string {
  const lines: string[] = [];
  const sep = '─'.repeat(60);

  lines.push('');
  lines.push(colorize('╔══════════════════════════════════════════════════════════╗', 'cyan'));
  lines.push(colorize('║', 'cyan') + colorize('  SCANLY — Website Content Checker', 'bold') + colorize('  ║', 'cyan'));
  lines.push(colorize('╚══════════════════════════════════════════════════════════╝', 'cyan'));
  lines.push('');
  lines.push(`  Target: ${colorize(result.url, 'blue')}`);
  lines.push(`  Date:   ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push(sep);
  lines.push('');

  if (result.jsErrors.length > 0) {
    lines.push(colorize('  JAVASCRIPT ERRORS', 'red'));
    lines.push('');
    for (const err of result.jsErrors.slice(0, 10)) {
      lines.push(colorize(`    ✕  ${err}`, 'red'));
    }
    if (result.jsErrors.length > 10) {
      lines.push(colorize(`    ... and ${result.jsErrors.length - 10} more`, 'dim'));
    }
    lines.push('');
  }

  if (result.consoleErrors.length > 0) {
    lines.push(colorize('  CONSOLE ERRORS', 'yellow'));
    lines.push('');
    for (const err of result.consoleErrors.slice(0, 10)) {
      lines.push(colorize(`    ⚠  ${err}`, 'yellow'));
    }
    if (result.consoleErrors.length > 10) {
      lines.push(colorize(`    ... and ${result.consoleErrors.length - 10} more`, 'dim'));
    }
    lines.push('');
  }

  if (result.failedResponses.length > 0) {
    lines.push(colorize('  FAILED RESOURCES', 'cyan'));
    lines.push('');
    for (const resp of result.failedResponses.slice(0, 10)) {
      lines.push(colorize(`    ℹ  ${resp.url} (HTTP ${resp.status})`, 'cyan'));
    }
    if (result.failedResponses.length > 10) {
      lines.push(colorize(`    ... and ${result.failedResponses.length - 10} more`, 'dim'));
    }
    lines.push('');
  }

  const { errors, warnings, info } = result.summary;

  if (result.summary.total === 0 && result.jsErrors.length === 0 && result.consoleErrors.length === 0 && result.failedResponses.length === 0) {
    lines.push(colorize('  ✓  No issues found! Your page is clean.', 'green'));
  } else {
    lines.push(colorize(`  Total: ${result.summary.total}  |  `, 'dim') + colorize(`${errors} errors`, 'red') + colorize('  |  ', 'dim') + colorize(`${warnings} warnings`, 'yellow') + colorize('  |  ', 'dim') + colorize(`${info} info`, 'cyan'));
    lines.push('');

    const grouped = new Map<string, Issue[]>();
    for (const issue of result.issues) {
      if (!grouped.has(issue.severity)) grouped.set(issue.severity, []);
      grouped.get(issue.severity)!.push(issue);
    }

    for (const [severity, issues] of grouped) {
      lines.push(colorize(`  ${severity.toUpperCase()} (${issues.length})`, severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : 'cyan'));
      lines.push('');

      for (const issue of issues) {
        lines.push(`    ${severityIcon(issue.severity)}  ${issue.message}`);
        if (issue.url) {
          lines.push(`         URL: ${issue.url}`);
        }
        if (issue.element) {
          const shortEl = issue.element.length > 80 ? issue.element.slice(0, 80) + '…' : issue.element;
          lines.push(`         Element: ${colorize(shortEl, 'dim')}`);
        }
        if (issue.suggestion) {
          lines.push(`         Fix: ${colorize(issue.suggestion, 'dim')}`);
        }
        lines.push('');
      }
    }
  }

  lines.push(sep);
  lines.push('');

  if (errors > 0) {
    lines.push(colorize('  ✕  Scan failed — fix the errors above.', 'red'));
  } else if (warnings > 0) {
    lines.push(colorize('  ⚠  Scan complete — review the warnings.', 'yellow'));
  } else {
    lines.push(colorize('  ✓  Scan complete — no issues found!', 'green'));
  }

  lines.push('');
  return lines.join('\n');
}
