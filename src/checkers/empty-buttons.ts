import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base';
import { getButtons } from '../utils/dom';

export class EmptyButtonChecker implements Checker {
  name = 'Empty Buttons';
  severity: IssueSeverity = 'warning';

  async scan(url: string, _maxPages?: number, _timeout?: number, options?: { signal?: AbortSignal }): Promise<Issue[]> {
    const issues: Issue[] = [];
    const signal = options?.signal;

    if (signal?.aborted) {
      return issues;
    }

    signal?.addEventListener('abort', () => {
      throw new Error('Scan aborted by user');
    });

    const browser = await import('playwright').then(m => m.chromium.launch({ headless: true }));
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const buttons = await getButtons(page);

      for (const btn of buttons) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        const ariaLabel = await page.evaluate((tag: string) => {
          if (tag === 'button') {
            const el = document.querySelector('button');
            return el?.getAttribute('aria-label') ?? '';
          } else {
            const el = document.querySelector('input[type="submit"], input[type="button"]');
            return el?.getAttribute('aria-label') ?? '';
          }
        }, btn.tag);

        if (!btn.text && !btn.hasIcon && !ariaLabel.trim()) {
          issues.push({
            type: 'empty-button',
            severity: 'warning',
            url,
            element: btn.outerHTML,
            message: 'Button has no visible text, aria-label, title, or icon',
            suggestion: 'Add text content, aria-label, or an icon inside the button',
          });
        }
      }

      await context.close();
    } catch (err) {
      if (err instanceof Error && err.message === 'Scan aborted by user') {
        throw err;
      }
      issues.push({
        type: 'empty-button',
        severity: 'warning',
        url,
        message: `Failed to load page: ${url}`,
      });
    } finally {
      await browser.close();
    }

    return issues;
  }
}
