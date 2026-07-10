import type { ScanResult } from '../scanner.js';
import { translateMessage, translateSuggestion } from './html.js';

function escapeCsvField(value: string): string {
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r');
  if (!needsQuotes) return value;
  return '"' + value.replace(/"/g, '""') + '"';
}

function formatCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

export function reportCsv(result: ScanResult, lang = 'en'): string {
  const lines: string[] = [];

  // Summary section
  lines.push('LLL-Scanly Report');
  lines.push('');
  lines.push('URL,' + result.url);
  lines.push('Scan Date,' + new Date().toISOString());
  lines.push('Scan Mode,' + (result.scanMode || 'Quick Scan'));
  lines.push('Pages Scanned,' + result.pagesScanned);
  lines.push('');
  lines.push('Summary');
  lines.push('Total,Errors,Warnings,Info');
  lines.push(result.summary.total + ',' + result.summary.errors + ',' + result.summary.warnings + ',' + result.summary.info);
  lines.push('');
  lines.push('Issues');
  lines.push('Severity,Type,Message,Element,URL,Suggestion');

  // Single page or combined issues
  if (!result.pages || result.pages.length <= 1) {
    for (const issue of result.issues) {
      lines.push(formatCsvRow([
        issue.severity,
        issue.type,
        translateMessage(lang, issue.type, issue.message),
        issue.element || '',
        issue.url,
        translateSuggestion(lang, issue.suggestion || ''),
      ]));
    }
  } else {
    // Multi-page: include Page URL column
    for (const page of result.pages) {
      for (const issue of page.issues) {
        lines.push(formatCsvRow([
          issue.severity,
          issue.type,
          translateMessage(lang, issue.type, issue.message),
          issue.element || '',
          page.url,
          translateSuggestion(lang, issue.suggestion || ''),
        ]));
      }
    }
  }

  return lines.join('\n');
}
