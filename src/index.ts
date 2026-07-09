import { Command } from 'commander';
import { Scanner } from './scanner.js';
import { reportText } from './reporters/text.js';
import { reportJson } from './reporters/json.js';
import { reportHtml } from './reporters/html.js';
import { reportCsv } from './reporters/csv.js';
import { reportPdf } from './reporters/pdf.js';
import { loadConfig } from './config.js';

const program = new Command();

program
  .name('scanly')
  .description('Scanly — Website Content Checker for pre-deployment validation')
  .version('1.0.0');

program
  .argument('[url]', 'URL to scan')
  .option('-c, --config <path>', 'Path to config file')
  .option('-f, --format <format>', 'Report format: text, json, html, csv, pdf', 'text')
  .option('-o, --output <path>', 'Output file path')
  .option('--lang <language>', 'Report language: en, ja, zh, zh-TW, ko, ms', 'en')
  .option('--max-pages <number>', 'Maximum pages to crawl', '50')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .action(async (url?: string, opts?: any) => {
    const config = loadConfig(opts?.config);
    const targetUrl = url || config.targetUrl;

    if (!targetUrl) {
      console.error('Error: Please provide a URL or set targetUrl in config.');
      console.error('Usage: scanly https://example.com');
      process.exit(1);
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      console.error(`Error: Invalid URL: ${targetUrl}`);
      console.error('Please provide a valid URL (e.g., https://example.com)');
      process.exit(1);
    }

    const maxPages = parseInt(opts?.maxPages || String(config.maxPages) || '50', 10);
    const maxDepth = config.maxDepth || 5;
    const timeout = parseInt(opts?.timeout || String(config.timeout) || '30000', 10);
    const format = opts?.format || config.reportFormat || 'text';
    const output = opts?.output || config.reportOutput;
    const lang = opts?.lang || 'en';

    // Validate numeric inputs
    if (isNaN(maxPages) || maxPages < 1) {
      console.error('Error: maxPages must be a positive number');
      process.exit(1);
    }
    if (isNaN(maxDepth) || maxDepth < 1) {
      console.error('Error: maxDepth must be a positive number');
      process.exit(1);
    }
    if (isNaN(timeout) || timeout < 1000) {
      console.error('Error: timeout must be at least 1000ms');
      process.exit(1);
    }

    console.log(`\nScanning: ${targetUrl}`);
    console.log(`Format: ${format} | Language: ${lang} | Max pages: ${maxPages} | Max depth: ${maxDepth} | Timeout: ${timeout}ms\n`);

    const scanner = new Scanner(config);
    const result = await scanner.scan(targetUrl, { maxPages, timeout, maxDepth });

    let report: string | null;
    switch (format) {
      case 'json':
        report = reportJson(result);
        break;
      case 'html':
        report = reportHtml(result, lang);
        break;
      case 'csv':
        report = reportCsv(result, lang);
        break;
      case 'pdf':
        report = null;
        break;
      default:
        report = reportText(result);
    }

    if (output) {
      const fs = await import('node:fs');
      const pathMod = await import('node:path');
      const outputPath = pathMod.resolve(output);

      if (format === 'pdf') {
        const pdfBuffer = await reportPdf(result, lang);
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`Report written to: ${outputPath}\n`);
      } else if (format === 'csv') {
        const bom = '\uFEFF';
        fs.writeFileSync(outputPath, bom + report!, 'utf-8');
        console.log(`Report written to: ${outputPath}\n`);
      } else {
        fs.writeFileSync(outputPath, report!, 'utf-8');
        console.log(`Report written to: ${outputPath}\n`);
      }
    } else {
      console.log(report);
    }

    if (result.summary.errors > 0) {
      process.exit(1);
    }
  });

program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err?.code === 'commander.helpDisplayed') {
    process.exit(0);
  }
  throw err;
}
