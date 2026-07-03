import { Command } from 'commander';
import { Scanner } from './scanner.js';
import { reportText } from './reporters/text.js';
import { reportJson } from './reporters/json.js';
import { reportHtml } from './reporters/html.js';
import { loadConfig } from './config.js';

const program = new Command();

program
  .name('scanly')
  .description('Scanly — Website Content Checker for pre-deployment validation')
  .version('1.0.0');

program
  .argument('[url]', 'URL to scan')
  .option('-c, --config <path>', 'Path to config file')
  .option('-f, --format <format>', 'Report format: text, json, html', 'text')
  .option('-o, --output <path>', 'Output file path')
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

    const maxPages = parseInt(opts?.maxPages || config.maxPages || '50', 10);
    const timeout = parseInt(opts?.timeout || config.timeout || '30000', 10);
    const format = opts?.format || config.reportFormat || 'text';
    const output = opts?.output || config.reportOutput;

    console.log(`\nScanning: ${targetUrl}`);
    console.log(`Format: ${format} | Max pages: ${maxPages} | Timeout: ${timeout}ms\n`);

    const scanner = new Scanner();
    const result = await scanner.scan(targetUrl, { maxPages, timeout });

    let report: string;
    switch (format) {
      case 'json':
        report = reportJson(result);
        break;
      case 'html':
        report = reportHtml(result);
        break;
      default:
        report = reportText(result);
    }

    if (output) {
      const fs = await import('node:fs');
      const pathMod = await import('node:path');
      const outputPath = pathMod.resolve(output);
      fs.writeFileSync(outputPath, report, 'utf-8');
      console.log(`Report written to: ${outputPath}\n`);
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
