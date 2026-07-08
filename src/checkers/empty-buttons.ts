import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base';
import { getButtons } from '../utils/dom';

export class EmptyButtonChecker implements Checker {
  name = 'Empty Buttons';
  severity: IssueSeverity = 'warning';

  async scan(url: string, _maxPages?: number, timeout?: number, options?: { signal?: AbortSignal; page?: import('playwright').Page; context?: import('playwright').BrowserContext; maxDepth?: number; excludePatterns?: string[]; includePatterns?: string[] }): Promise<Issue[]> {
    const issues: Issue[] = [];
    const signal = options?.signal;
    const page = options?.page;

    if (signal?.aborted) {
      return issues;
    }

    if (!page) {
      issues.push({
        type: 'empty-button',
        severity: 'warning',
        url,
        message: 'No page context provided',
      });
      return issues;
    }

    try {
      const buttons = await getButtons(page);

      for (const btn of buttons) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        
        const btnIndex = buttons.indexOf(btn);
        const ariaLabel = await page.evaluate(({ tag, index }: { tag: string; index: number }) => {
          let el: Element | null = null;
          if (tag === 'button') {
            const buttons = document.querySelectorAll('button');
            el = buttons[index] || null;
          } else {
            const inputs = document.querySelectorAll('input[type="submit"], input[type="button"]');
            el = inputs[index] || null;
          }
          return el?.getAttribute('aria-label') ?? '';
        }, { tag: btn.tag, index: btnIndex });

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
    } catch (err) {
      if (err instanceof Error && err.message === 'Scan aborted by user') {
        throw err;
      }
      return issues;
    }

    return issues;
  }
}
