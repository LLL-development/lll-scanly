import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base';
import { getImages } from '../utils/dom';

export class MissingAltChecker implements Checker {
  name = 'Missing Alt Text';
  severity: IssueSeverity = 'error';

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

      const images = await getImages(page);

      for (const img of images) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        if (img.role === 'presentation' || img.role === 'none') continue;
        if (img.ariaHidden === 'true') continue;

        if (!img.alt || img.alt.trim() === '') {
          issues.push({
            type: 'missing-alt',
            severity: 'error',
            url,
            element: `<img src="${img.src || 'unknown'}">`,
            message: 'Image is missing alt text',
            suggestion: `Add descriptive alt text: <img src="${img.src}" alt="description">`,
          });
        } else if (img.alt.trim().toLowerCase() === 'image' || img.alt.trim().toLowerCase() === 'photo' || img.alt.trim().toLowerCase() === 'picture') {
          issues.push({
            type: 'poor-alt',
            severity: 'warning',
            url,
            element: `<img src="${img.src}" alt="${img.alt}">`,
            message: `Alt text is too generic: "${img.alt}"`,
            suggestion: 'Use descriptive alt text that explains the image content',
          });
        }
      }

      await context.close();
    } catch (err) {
      if (err instanceof Error && err.message === 'Scan aborted by user') {
        throw err;
      }
      issues.push({
        type: 'missing-alt',
        severity: 'error',
        url,
        message: `Failed to load page: ${url}`,
      });
    } finally {
      await browser.close();
    }

    return issues;
  }
}
