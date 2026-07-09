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

function escapeTsvField(value: string): string {
  const needsQuotes = value.includes('\t') || value.includes('"') || value.includes('\n') || value.includes('\r');
  if (!needsQuotes) return value;
  return '"' + value.replace(/"/g, '""') + '"';
}

function formatTsvRow(fields: string[]): string {
  return fields.map(escapeTsvField).join('\t');
}

export function reportCsv(result: ScanResult, lang = 'en'): string {
  const isMultiPage = result.pages && result.pages.length > 1;

  if (isMultiPage) {
    return reportCsvMultiPage(result, lang);
  }

  const header = 'Severity,Type,Message,Element,URL,Suggestion';
  const rows = result.issues.map(issue => {
    return formatCsvRow([
      issue.severity,
      issue.type,
      translateMessage(lang, issue.type, issue.message),
      issue.element || '',
      issue.url,
      translateSuggestion(lang, issue.suggestion || ''),
    ]);
  });

  return [header, ...rows].join('\n');
}

function reportCsvMultiPage(result: ScanResult, lang: string): string {
  const tsvParts: string[] = [];

  // Sheet 1: All issues combined
  tsvParts.push('\x00All Issues');
  tsvParts.push(formatTsvRow(['Severity', 'Type', 'Message', 'Element', 'URL', 'Suggestion']));
  for (const issue of result.issues) {
    tsvParts.push(formatTsvRow([
      issue.severity,
      issue.type,
      translateMessage(lang, issue.type, issue.message),
      issue.element || '',
      issue.url,
      translateSuggestion(lang, issue.suggestion || ''),
    ]));
  }

  // Sheet 2+: One sheet per page
  for (let i = 0; i < result.pages.length; i++) {
    const page = result.pages[i];
    tsvParts.push(`\x00Page ${i + 1}`);
    tsvParts.push(formatTsvRow(['Severity', 'Type', 'Message', 'Element', 'URL', 'Suggestion']));
    for (const issue of page.issues) {
      tsvParts.push(formatTsvRow([
        issue.severity,
        issue.type,
        translateMessage(lang, issue.type, issue.message),
        issue.element || '',
        issue.url,
        translateSuggestion(lang, issue.suggestion || ''),
      ]));
    }
  }

  return tsvParts.join('\n');
}
