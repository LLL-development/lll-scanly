import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base';
import { getImages } from '../utils/dom';

const SUPPORTED_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'avif'];

function getImageFormat(url: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'unknown';
}

export class FormatChecker implements Checker {
  name = 'Image Format';
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

      const images = await getImages(page);
      const seenUrls = new Set<string>();

      for (const img of images) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        if (!img.src || seenUrls.has(img.src)) continue;
        seenUrls.add(img.src);

        const format = getImageFormat(img.src);

        if (!SUPPORTED_FORMATS.includes(format)) {
          issues.push({
            type: 'unsupported-format',
            severity: 'warning',
            url,
            element: `<img src="${img.src}">`,
            message: `Image uses uncommon format: .${format}`,
            suggestion: 'Consider converting to WebP or PNG for better compatibility',
          });
        } else if (format === 'png' || format === 'jpg' || format === 'jpeg') {
          issues.push({
            type: 'format-mix',
            severity: 'info',
            url,
            element: `<img src="${img.src}">`,
            message: `Image uses ${format.toUpperCase()} — consider standardizing to WebP for better compression`,
            suggestion: 'Use WebP or AVIF for optimized image delivery',
          });
        }
      }

      await context.close();
    } catch (err) {
      if (err instanceof Error && err.message === 'Scan aborted by user') {
        throw err;
      }
      issues.push({
        type: 'format-check',
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
