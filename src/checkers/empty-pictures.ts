import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base';
import { getImages } from '../utils/dom';
import { checkLink } from '../utils/http';

export class EmptyPictureChecker implements Checker {
  name = 'Empty Pictures';
  severity: IssueSeverity = 'error';

  async scan(url: string, _maxPages?: number, timeout: number = 30000, options?: { signal?: AbortSignal }): Promise<Issue[]> {
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
      await page.goto(url, { waitUntil: 'networkidle', timeout });

      const images = await getImages(page);

      for (const img of images) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        if (!img.src || img.src.trim() === '' || img.src === '#') {
          issues.push({
            type: 'empty-picture',
            severity: 'error',
            url,
            element: `<img src="${img.src || 'empty'}">`,
            message: 'Image has empty or missing src attribute',
            suggestion: 'Provide a valid image source or remove the empty img tag',
          });
          continue;
        }

        const result = await checkLink(img.src, timeout);
        if (!result.ok && result.status > 0) {
          issues.push({
            type: 'broken-picture',
            severity: 'error',
            url,
            element: `<img src="${img.src}">`,
            message: `Image source is broken: ${img.src} (HTTP ${result.status})`,
            suggestion: 'Fix the image path or upload the missing image',
          });
        }
      }

      await context.close();
    } catch (err) {
      if (err instanceof Error && err.message === 'Scan aborted by user') {
        throw err;
      }
      issues.push({
        type: 'empty-picture',
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
