import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base.js';
import { getImages } from '../utils/dom.js';
import { checkLink } from '../utils/http.js';

export class EmptyPictureChecker implements Checker {
  name = 'Empty Pictures';
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
        type: 'empty-picture',
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
        const imgSrc = img.src || '';
        const rawSrc = img.rawSrc || imgSrc;

        if (!imgSrc || imgSrc.trim() === '' || imgSrc === '#') {
          issues.push({
            type: 'empty-picture',
            severity: 'error',
            url,
            element: `<img src="${rawSrc || 'empty'}">`,
            message: 'Image has empty or missing src attribute',
            suggestion: 'Provide a valid image source or remove the empty img tag',
          });
          continue;
        }

        const result = await checkLink(imgSrc, timeout, options?.context);
        if (!result.ok) {
          issues.push({
            type: 'broken-picture',
            severity: 'error',
            url,
            element: `<img src="${rawSrc}">`,
            message: `Image source is broken: ${imgSrc} (HTTP ${result.status})`,
            suggestion: 'Fix the image path or upload the missing image',
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
