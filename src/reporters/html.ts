import type { ScanResult } from '../scanner.js';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function reportHtml(result: ScanResult): string {
  const issuesHtml = result.issues
    .map(issue => {
      const severityClass = issue.severity;
      return `
        <tr class="issue-row ${severityClass}">
          <td><span class="badge badge-${severityClass}">${issue.severity.toUpperCase()}</span></td>
          <td class="issue-type">${escapeHtml(issue.type)}</td>
          <td class="issue-message">${escapeHtml(issue.message)}</td>
          <td class="issue-element">${escapeHtml(issue.element || '')}</td>
          <td class="issue-url"><a href="${escapeHtml(issue.url)}" target="_blank">${escapeHtml(issue.url)}</a></td>
          ${issue.suggestion ? `<td class="issue-suggestion">${escapeHtml(issue.suggestion)}</td>` : ''}
        </tr>`;
    })
    .join('');

  const jsErrorsHtml = result.jsErrors
    .map(err => `<tr><td class="error-type">JS Error</td><td class="error-msg">${escapeHtml(err)}</td></tr>`)
    .join('');

  const consoleErrorsHtml = result.consoleErrors
    .map(err => `<tr><td class="error-type">Console Error</td><td class="error-msg">${escapeHtml(err)}</td></tr>`)
    .join('');

  const failedResponsesHtml = result.failedResponses
    .map(resp => `<tr><td class="error-type">Failed Resource</td><td class="error-msg">${escapeHtml(resp.url)} (HTTP ${resp.status})</td></tr>`)
    .join('');

  const { errors, warnings, info } = result.summary;
  const statusColor = errors > 0 ? '#dc2626' : warnings > 0 ? '#f59e0b' : '#16a34a';
  const statusText = errors > 0 ? 'Issues Found' : warnings > 0 ? 'Warnings Only' : 'All Clear';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scanly Report — ${escapeHtml(result.url)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    header { text-align: center; margin-bottom: 2rem; }
    header h1 { font-size: 1.5rem; color: #fff; margin-bottom: 0.5rem; }
    header .url { color: #888; font-size: 0.9rem; word-break: break-all; }
    .summary { display: flex; gap: 1rem; justify-content: center; margin: 1.5rem 0; flex-wrap: wrap; }
    .stat { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 1rem 1.5rem; text-align: center; min-width: 120px; }
    .stat .count { font-size: 2rem; font-weight: 700; }
    .stat .label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }
    .stat.errors .count { color: #dc2626; }
    .stat.warnings .count { color: #f59e0b; }
    .stat.info .count { color: #06b6d4; }
    .stat.total .count { color: #fff; }
    .status { text-align: center; padding: 0.75rem; border-radius: 6px; font-weight: 600; margin-bottom: 1.5rem; font-size: 0.9rem; }
    .status.fail { background: rgba(220,38,38,0.15); color: #dc2626; }
    .status.warn { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .status.pass { background: rgba(22,163,74,0.15); color: #16a34a; }
    table { width: 100%; border-collapse: collapse; background: #111; border-radius: 8px; overflow: hidden; margin-bottom: 1.5rem; }
    th { background: #1a1a1a; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: #888; letter-spacing: 0.05em; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #222; font-size: 0.85rem; vertical-align: top; }
    tr.issue-row.error { border-left: 3px solid #dc2626; }
    tr.issue-row.warning { border-left: 3px solid #f59e0b; }
    tr.issue-row.info { border-left: 3px solid #06b6d4; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
    .badge-error { background: rgba(220,38,38,0.2); color: #dc2626; }
    .badge-warning { background: rgba(245,158,11,0.2); color: #f59e0b; }
    .badge-info { background: rgba(6,182,212,0.2); color: #06b6d4; }
    .issue-element { font-family: monospace; font-size: 0.8rem; color: #aaa; max-width: 300px; word-break: break-all; }
    .issue-url { color: #60a5fa; word-break: break-all; }
    .issue-suggestion { color: #86efac; }
    .issue-type { color: #aaa; font-family: monospace; font-size: 0.8rem; }
    .error-type { color: #aaa; font-family: monospace; font-size: 0.8rem; }
    .error-msg { color: #f87171; word-break: break-all; }
    .section-title { font-size: 1rem; font-weight: 600; margin: 1.5rem 0 0.75rem; color: #fff; }
    footer { text-align: center; margin-top: 2rem; color: #555; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Scanly Report</h1>
      <p class="url">${escapeHtml(result.url)}</p>
      <p style="color:#666;font-size:0.8rem;margin-top:0.25rem;">Generated: ${new Date().toLocaleString()}</p>
    </header>
    <div class="summary">
      <div class="stat total"><div class="count">${result.summary.total}</div><div class="label">Total</div></div>
      <div class="stat errors"><div class="count">${errors}</div><div class="label">Errors</div></div>
      <div class="stat warnings"><div class="count">${warnings}</div><div class="label">Warnings</div></div>
      <div class="stat info"><div class="count">${info}</div><div class="label">Info</div></div>
    </div>
    <div class="status ${errors > 0 ? 'fail' : warnings > 0 ? 'warn' : 'pass'}">${statusText}</div>

    ${result.jsErrors.length > 0 ? `
    <div class="section-title" style="color:#dc2626;">JavaScript Errors (${result.jsErrors.length})</div>
    <table><thead><tr><th>Type</th><th>Message</th></tr></thead><tbody>${jsErrorsHtml}</tbody></table>` : ''}

    ${result.consoleErrors.length > 0 ? `
    <div class="section-title" style="color:#f59e0b;">Console Errors (${result.consoleErrors.length})</div>
    <table><thead><tr><th>Type</th><th>Message</th></tr></thead><tbody>${consoleErrorsHtml}</tbody></table>` : ''}

    ${result.failedResponses.length > 0 ? `
    <div class="section-title" style="color:#06b6d4;">Failed Resources (${result.failedResponses.length})</div>
    <table><thead><tr><th>Type</th><th>Details</th></tr></thead><tbody>${failedResponsesHtml}</tbody></table>` : ''}

    ${result.issues.length > 0 ? `
    <table>
      <thead>
        <tr><th>Severity</th><th>Type</th><th>Message</th><th>Element</th><th>URL</th><th>Suggestion</th></tr>
      </thead>
      <tbody>${issuesHtml}</tbody>
    </table>` : '<p style="text-align:center;color:#16a34a;padding:2rem;">No issues found — everything looks good!</p>'}
    <footer>Powered by Scanly — Website Content Checker</footer>
  </div>
</body>
</html>`;
}
