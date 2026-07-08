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

  async scan(url: string, _maxPages?: number, timeout?: number, options?: { signal?: AbortSignal; page?: import('playwright').Page; context?: import('playwright').BrowserContext; maxDepth?: number; excludePatterns?: string[]; includePatterns?: string[] }): Promise<Issue[]> {
    const issues: Issue[] = [];
    const signal = options?.signal;
    const page = options?.page;

    if (signal?.aborted) {
      return issues;
    }

    if (!page) {
      issues.push({
        type: 'format-check',
        severity: 'warning',
        url,
        message: 'No page context provided',
      });
      return issues;
    }

    try {
      const images = await getImages(page, url);
      const seenUrls = new Set<string>();

      for (let i = 0; i < images.length; i++) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        const img = images[i];
        if (!img.src || seenUrls.has(img.src)) {
          if (img.src) seenUrls.add(img.src);
          continue;
        }
        seenUrls.add(img.src);

        const rawSrc = img.rawSrc || img.src;
        const format = getImageFormat(img.src);

        if (format === 'unknown') continue;

        if (!SUPPORTED_FORMATS.includes(format)) {
          issues.push({
            type: 'unsupported-format',
            severity: 'warning',
            url,
            element: `<img src="${rawSrc}">`,
            message: `Image uses uncommon format: .${format}`,
            suggestion: 'Consider converting to WebP or PNG for better compatibility',
          });
        } else if (format === 'png' || format === 'jpg' || format === 'jpeg') {
          issues.push({
            type: 'format-mix',
            severity: 'info',
            url,
            element: `<img src="${rawSrc}">`,
            message: `Image uses ${format.toUpperCase()} — consider standardizing to WebP for better compression`,
            suggestion: 'Use WebP or AVIF for optimized image delivery',
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
