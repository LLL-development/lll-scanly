import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base';
import { getImages } from '../utils/dom';

export class MissingAltChecker implements Checker {
  name = 'Missing Alt Text';
  severity: IssueSeverity = 'error';

  async scan(url: string, _maxPages?: number, timeout?: number, options?: { signal?: AbortSignal; page?: import('playwright').Page; context?: import('playwright').BrowserContext; maxDepth?: number; excludePatterns?: string[]; includePatterns?: string[] }): Promise<Issue[]> {
    const issues: Issue[] = [];
    const signal = options?.signal;
    const page = options?.page;

    if (signal?.aborted) {
      return issues;
    }

    if (!page) {
      issues.push({
        type: 'missing-alt',
        severity: 'error',
        url,
        message: 'No page context provided',
      });
      return issues;
    }

    try {
      const images = await getImages(page, url);

      for (let i = 0; i < images.length; i++) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        const img = images[i];
        if (img.role === 'presentation' || img.role === 'none') continue;
        if (img.ariaHidden === 'true') continue;

          const imgSrc = img.src || '';
          const rawSrc = img.rawSrc || imgSrc;

          if (!img.alt || img.alt.trim() === '') {
            issues.push({
              type: 'missing-alt',
              severity: 'error',
              url,
              element: `<img src="${rawSrc || 'unknown'}">`,
              message: 'Image is missing alt text',
              suggestion: `Add descriptive alt text: <img src="${rawSrc}" alt="description">`,
            });
          } else if (img.alt.trim().toLowerCase() === 'image' || img.alt.trim().toLowerCase() === 'photo' || img.alt.trim().toLowerCase() === 'picture') {
            issues.push({
              type: 'poor-alt',
              severity: 'warning',
              url,
              element: `<img src="${rawSrc}" alt="${img.alt}">`,
              message: `Alt text is too generic: "${img.alt}"`,
              suggestion: 'Use descriptive alt text that explains the image content',
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
