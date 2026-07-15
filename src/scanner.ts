import { Checker, Issue } from './checkers/base.js';
import { MissingAltChecker } from './checkers/missing-alt.js';
import { BrokenLinkChecker } from './checkers/broken-links.js';
import { EmptyPictureChecker } from './checkers/empty-pictures.js';
import { EmptyButtonChecker } from './checkers/empty-buttons.js';
import { FormatChecker } from './checkers/format-checker.js';
import { ErrorRenderChecker } from './checkers/error-render.js';
import type { ScanlyConfig } from './config.js';

export interface PageResult {
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
  pagesScanned: number;
  scanMode: string;
  pages: PageResult[];
}

export interface ScanProgress {
  isScanning: boolean;
  currentChecker: string;
  progress: number; // 0-100
  message: string;
}

export interface ScanEvent {
  type: 'crawl' | 'scan' | 'check' | 'issue' | 'complete' | 'error';
  message: string;
  data?: any;
  timestamp?: number;
}

export class Scanner {
  private checkers: Checker[] = [];
  private progressCallback: ((progress: number, message: string) => void) | null = null;
  private eventCallback: ((event: ScanEvent) => void) | null = null;
  private _aborted = false;
  private _abortController: AbortController | null = null;
  private _scanMode = 'Quick Scan';

  constructor(private config?: Partial<ScanlyConfig>) {
    this.registerDefaultCheckers();
    this._scanMode = (config && (config as any).scanMode) || 'Quick Scan';
  }

  private registerDefaultCheckers() {
    const allCheckers: Checker[] = [
      new MissingAltChecker(),
      new BrokenLinkChecker(),
      new EmptyPictureChecker(),
      new EmptyButtonChecker(),
      new FormatChecker(),
      new ErrorRenderChecker(),
    ];

    // Filter checkers based on config
    if (this.config?.checkers) {
      const checkerMap: Record<string, Checker> = {
        missingAlt: allCheckers[0],
        brokenLinks: allCheckers[1],
        emptyPictures: allCheckers[2],
        emptyButtons: allCheckers[3],
        formatCheck: allCheckers[4],
        errorRender: allCheckers[5],
      };

      this.checkers = Object.entries(this.config.checkers)
        .filter(([_, enabled]) => enabled)
        .map(([name, _]) => checkerMap[name])
        .filter((checker): checker is Checker => checker !== undefined);
    } else {
      this.checkers = allCheckers;
    }
  }

  registerChecker(checker: Checker) {
    this.checkers.push(checker);
  }

  onProgress(callback: (progress: number, message: string) => void) {
    this.progressCallback = callback;
  }

  onEvent(callback: (event: ScanEvent) => void) {
    this.eventCallback = callback;
  }

  private updateProgress(progress: number, message: string) {
    if (this.progressCallback) {
      this.progressCallback(progress, message);
    }
  }

  private emitEvent(type: ScanEvent['type'], message: string, data?: any) {
    if (this.eventCallback) {
      this.eventCallback({
        type,
        message,
        data,
        timestamp: Date.now()
      });
    }
  }

  /**
    * Crawl pages using BFS (Breadth-First Search)
    */
  private async crawlPages(
    startUrl: string,
    maxPages: number,
    maxDepth: number,
    timeout: number,
    browser: import('playwright').Browser,
    context: import('playwright').BrowserContext
  ): Promise<string[]> {
    this.emitEvent('crawl', `Starting crawl from: ${startUrl}`);
    this.updateProgress(5, 'Discovering pages...');

    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
    const discoveredPages: string[] = [];

    try {
      while (queue.length > 0 && visited.size < maxPages) {
        if (this._aborted) {
          throw new Error('Scan aborted by user');
        }

        const { url: currentUrl, depth } = queue.shift()!;
        
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);
        discoveredPages.push(currentUrl);

        this.emitEvent('crawl', `Discovered: ${currentUrl}`, { 
          url: currentUrl, 
          depth,
          total: discoveredPages.length 
        });

        // Only crawl further if within depth limit
        if (depth < maxDepth && discoveredPages.length < maxPages) {
          let page: import('playwright').Page | null = null;
          try {
            console.log(`[CRAWL] Loading: ${currentUrl}`);
            page = await context.newPage();
            await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout });
            console.log(`[CRAWL] Loaded: ${currentUrl}`);
            
            // Get all links from the page
            const links = await page.evaluate(() => {
              const anchors = document.querySelectorAll('a[href]');
              return Array.from(anchors).map(a => (a as HTMLAnchorElement).href).filter(href => href);
            });

            for (const link of links) {
              if (visited.has(link)) continue;
              if (discoveredPages.length >= maxPages) break;

              // Only include same-origin links
              try {
                const currentOrigin = new URL(currentUrl).origin;
                const linkOrigin = new URL(link).origin;
                
                if (currentOrigin === linkOrigin) {
                  queue.push({ url: link, depth: depth + 1 });
                }
              } catch {
                // Invalid URL, skip
              }
            }

          } catch (err) {
            // Failed to load page, continue with others
            console.error(`Failed to crawl ${currentUrl}:`, err);
          } finally {
            if (page) {
              await page.close();
            }
          }
        }
      }

      this.emitEvent('crawl', `Crawl complete. Found ${discoveredPages.length} pages`, { 
        total: discoveredPages.length 
      });

    } catch (err) {
      if (this._aborted) {
        throw err;
      }
      throw err;
    }

    return discoveredPages;
  }

  /**
    * Scan a single page with all checkers
    */
  private async scanPage(
    pageUrl: string,
    pageNumber: number,
    totalPages: number,
    timeout: number,
    browser: import('playwright').Browser
  ): Promise<Issue[]> {
    this.emitEvent('scan', `Page ${pageNumber}/${totalPages}: ${pageUrl}`, { 
      url: pageUrl, 
      current: pageNumber, 
      total: totalPages 
    });

    this.updateProgress(
      10 + Math.round((pageNumber / totalPages) * 80),
      `Scanning page ${pageNumber}/${totalPages}...`
    );

    let context: import('playwright').BrowserContext | null = null;
    let page: import('playwright').Page | null = null;
    
    try {
      context = await browser.newContext();
      page = await context.newPage();
      
      const consoleErrors: string[] = [];
      const jsErrors: string[] = [];
      const failedResponses: { url: string; status: number }[] = [];
      
      // Set up error handlers
      const onConsole = (msg: import('playwright').ConsoleMessage) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      };
      const onPageError = (err: Error) => {
        jsErrors.push(err.message);
      };
      const onResponse = async (response: import('playwright').Response) => {
        if (response.status() >= 400) {
          const reqUrl = response.url();
          if (!reqUrl.includes('data:') && !reqUrl.includes('blob:')) {
            failedResponses.push({ url: reqUrl, status: response.status() });
          }
        }
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);
      page.on('response', onResponse);

      // Navigate to page with domcontentloaded for reliability
      // networkidle can hang on pages with infinite polling/WebSockets
      const pageTimeout = Math.min(timeout, 30000);
      console.log(`[SCAN] Loading: ${pageUrl}`);
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: pageTimeout });
        console.log(`[SCAN] Loaded: ${pageUrl}`);
      } catch {
        console.error(`[SCAN] Failed to load: ${pageUrl}`);
        // Page may still have useful content even if timeout
      }

      if (this._aborted) {
        throw new Error('Scan aborted by user');
      }

      // Run all checkers sequentially with generous timeouts
      const checkerTimeout = Math.min(timeout, 15000);
      const allIssues: Issue[] = [];

      for (let i = 0; i < this.checkers.length; i++) {
        if (this._aborted) {
          throw new Error('Scan aborted by user');
        }

        const checker = this.checkers[i];
        this.emitEvent('check', `Running: ${checker.name}...`, { checker: checker.name, page: pageUrl });

        try {
          const issues = await checker.scan(pageUrl, undefined, checkerTimeout, {
            signal: this._abortController?.signal,
            page: page,
            context: context,
            maxDepth: 5,
            excludePatterns: this.config?.excludePatterns || [],
            includePatterns: this.config?.includePatterns || [],
          });

          for (const issue of issues) {
            this.emitEvent('issue', `${issue.type}: ${issue.message}`, { issue });
          }

          allIssues.push(...issues);
        } catch (err) {
          if (this._aborted) {
            throw err;
          }
          allIssues.push({
            type: `checker-error:${checker.name}`,
            severity: 'error',
            url: pageUrl,
            message: `Checker "${checker.name}" failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      return allIssues;

    } finally {
      // Close page first, then context, handling cases where either may be undefined
      if (page) {
        try { await page.close(); } catch { /* ignore */ }
      }
      if (context) {
        try { await context.close(); } catch { /* ignore */ }
      }
    }
  }

  async scan(
    url: string,
    options: { maxPages?: number; timeout?: number; maxDepth?: number } = {}
  ): Promise<ScanResult> {
    const allIssues: Issue[] = [];
    const allJsErrors: string[] = [];
    const allConsoleErrors: string[] = [];
    const allFailedResponses: { url: string; status: number }[] = [];
    const pages: PageResult[] = [];
    
    const { maxPages = 1, timeout = 30000, maxDepth = 5 } = options;
    const excludePatterns = this.config?.excludePatterns || [];
    const includePatterns = this.config?.includePatterns || [];
    
    this._aborted = false;
    this._abortController = new AbortController();

    this.updateProgress(0, 'Starting scan...');
    this.emitEvent('scan', 'Initializing scan...', { url });

    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const crawlContext = await browser.newContext();

    try {
      let pagesToScan: string[] = [url];

      // Step 1: Crawl pages if multi-page mode
      if (maxPages > 1) {
        pagesToScan = await this.crawlPages(url, maxPages, maxDepth, timeout, browser, crawlContext);
      }

      // Step 2: Scan each page with its own isolated context
      const totalPages = pagesToScan.length;
      this.emitEvent('scan', `Starting to scan ${totalPages} page(s)...`, { total: totalPages });

      for (let i = 0; i < pagesToScan.length; i++) {
        if (this._aborted) {
          throw new Error('Scan aborted by user');
        }

        const pageUrl = pagesToScan[i];
        const pageIssues = await this.scanPage(pageUrl, i + 1, totalPages, timeout, browser);
        
        allIssues.push(...pageIssues);

        const pageErrors = pageIssues.filter(issue => issue.severity === 'error').length;
        const pageWarnings = pageIssues.filter(issue => issue.severity === 'warning').length;
        const pageInfo = pageIssues.filter(issue => issue.severity === 'info').length;

        pages.push({
          url: pageUrl,
          issues: pageIssues,
          jsErrors: [],
          consoleErrors: [],
          failedResponses: [],
          summary: { total: pageIssues.length, errors: pageErrors, warnings: pageWarnings, info: pageInfo },
        });
      }

      this.updateProgress(95, 'Finalizing results...');
      this.emitEvent('complete', `Scan complete. Found ${allIssues.length} issues across ${totalPages} pages`, { 
        totalPages,
        totalIssues: allIssues.length 
      });

      const errors = allIssues.filter(i => i.severity === 'error').length;
      const warnings = allIssues.filter(i => i.severity === 'warning').length;
      const info = allIssues.filter(i => i.severity === 'info').length;

      this.updateProgress(100, 'Complete!');

      return {
        url,
        issues: allIssues,
        jsErrors: allJsErrors,
        consoleErrors: allConsoleErrors,
        failedResponses: allFailedResponses,
        summary: { total: allIssues.length, errors, warnings, info },
        pagesScanned: totalPages,
        scanMode: this._scanMode,
        pages,
      };

    } catch (err) {
      this.updateProgress(100, 'Scan failed');
      this.emitEvent('error', `Scan failed: ${err instanceof Error ? err.message : String(err)}`);

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
        pagesScanned: 0,
        scanMode: this._scanMode,
        pages: [],
      };
    } finally {
      // Only abort if the scan was actually aborted by the user
      if (this._aborted) {
        this._abortController?.abort();
      }
      this._abortController = null;
      // Close browser and context to free resources
      try {
        await crawlContext.close();
      } catch { /* ignore */ }
      try {
        await browser.close();
      } catch { /* ignore */ }
    }
  }

  getCheckers(): Checker[] {
    return this.checkers;
  }

  stop() {
    this._aborted = true;
  }
}