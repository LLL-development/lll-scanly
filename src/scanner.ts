import { Checker, Issue } from './checkers/base.js';
import { MissingAltChecker } from './checkers/missing-alt.js';
import { BrokenLinkChecker } from './checkers/broken-links.js';
import { EmptyPictureChecker } from './checkers/empty-pictures.js';
import { EmptyButtonChecker } from './checkers/empty-buttons.js';
import { FormatChecker } from './checkers/format-checker.js';
import { ErrorRenderChecker } from './checkers/error-render.js';

export interface ScanResult {
  url: string;
  issues: Issue[];
  jsErrors: string[];
  consoleErrors: string[];
  failedResponses: { url: string; status: number }[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface ScanProgress {
  isScanning: boolean;
  currentChecker: string;
  progress: number; // 0-100
  message: string;
}

export class Scanner {
  private checkers: Checker[] = [];
  private progressCallback: ((progress: number, message: string) => void) | null = null;
  private _aborted = false;
  private _abortController: AbortController | null = null;

  constructor() {
    this.registerDefaultCheckers();
  }

  private registerDefaultCheckers() {
    this.checkers = [
      new MissingAltChecker(),
      new BrokenLinkChecker(),
      new EmptyPictureChecker(),
      new EmptyButtonChecker(),
      new FormatChecker(),
      new ErrorRenderChecker(),
    ];
  }

  registerChecker(checker: Checker) {
    this.checkers.push(checker);
  }

  onProgress(callback: (progress: number, message: string) => void) {
    this.progressCallback = callback;
  }

  private updateProgress(progress: number, message: string) {
    if (this.progressCallback) {
      this.progressCallback(progress, message);
    }
  }

  async scan(
    url: string,
    options: { maxPages?: number; timeout?: number } = {}
  ): Promise<ScanResult> {
    const allIssues: Issue[] = [];
    const { maxPages = 50, timeout = 30000 } = options;
    this._aborted = false;
    this._abortController = new AbortController();

    this.updateProgress(0, 'Starting scan...');

    const browser = await import('playwright').then(m => m.chromium.launch({ headless: true }));
    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      const jsErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedResponses: { url: string; status: number }[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        jsErrors.push(err.message);
      });

      page.on('response', async response => {
        if (response.status() >= 400) {
          const reqUrl = response.url();
          if (!reqUrl.includes('data:') && !reqUrl.includes('blob:')) {
            failedResponses.push({ url: reqUrl, status: response.status() });
          }
        }
      });

      this.updateProgress(5, 'Loading page...');
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout });
      } catch {
        // Page may still have useful content even if timeout
      }

      this.updateProgress(15, 'Page loaded. Starting checks...');

      const totalCheckers = this.checkers.length;
      for (let i = 0; i < this.checkers.length; i++) {
        if (this._aborted) {
          throw new Error('Scan aborted by user');
        }
        const checker = this.checkers[i];
        const progress = 15 + Math.round(((i + 1) / totalCheckers) * 75);
        this.updateProgress(progress, `Running ${checker.name}...`);
        
        try {
          const issues = await checker.scan(url, maxPages, timeout, { signal: this._abortController.signal });
          allIssues.push(...issues);
        } catch (err) {
          if (this._aborted) {
            throw err;
          }
          allIssues.push({
            type: `checker-error:${checker.name}`,
            severity: 'error',
            url,
            message: `Checker "${checker.name}" failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      this.updateProgress(90, 'Finalizing results...');
      await context.close();

      const errors = allIssues.filter(i => i.severity === 'error').length;
      const warnings = allIssues.filter(i => i.severity === 'warning').length;
      const info = allIssues.filter(i => i.severity === 'info').length;

      this.updateProgress(100, 'Complete!');

      return {
        url,
        issues: allIssues,
        jsErrors,
        consoleErrors,
        failedResponses,
        summary: { total: allIssues.length, errors, warnings, info },
      };
    } catch (err) {
      this.updateProgress(100, 'Scan failed');
      return {
        url,
        issues: [{
          type: 'scan-failed',
          severity: 'error',
          url,
          message: `Failed to scan: ${err instanceof Error ? err.message : String(err)}`,
        }],
        jsErrors: [],
        consoleErrors: [],
        failedResponses: [],
        summary: { total: 1, errors: 1, warnings: 0, info: 0 },
      };
    } finally {
      this._abortController?.abort();
      this._abortController = null;
      await browser.close();
    }
  }

  getCheckers(): Checker[] {
    return this.checkers;
  }

  stop() {
    this._aborted = true;
  }
}
