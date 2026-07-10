import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base.js';
import { getImages, getIframes, getNoscriptCount } from '../utils/dom.js';

export class ErrorRenderChecker implements Checker {
  name = 'Error Rendering';
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
        type: 'error-render',
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
        if (!img.src) continue;

        const rawSrc = img.rawSrc || img.src;
        const escapedSrc = rawSrc.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
        
        const imgLoaded = await page.evaluate((src: string) => {
          const el = document.querySelector(`img[src="${src}"]`);
          if (!el) return false;
          const imgEl = el as HTMLImageElement;
          return imgEl.naturalWidth > 0 && imgEl.complete;
        }, escapedSrc);

        if (!imgLoaded) {
          issues.push({
            type: 'error-render',
            severity: 'error',
            url,
            element: `<img src="${rawSrc}">`,
            message: `Image failed to render: ${img.src}`,
            suggestion: 'Fix the image path or ensure the file exists',
          });
        }
      }

      if (signal?.aborted) {
        throw new Error('Scan aborted by user');
      }

      const iframes = await getIframes(page, url);
      for (const iframeSrc of iframes) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        
        const escapedIframeSrc = iframeSrc.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
        
        const iframeExists = await page.evaluate((src: string) => {
          const el = document.querySelector(`iframe[src="${src}"]`);
          return el !== null;
        }, escapedIframeSrc);

        if (!iframeExists) {
          issues.push({
            type: 'error-render',
            severity: 'error',
            url,
            element: `<iframe src="${iframeSrc}">`,
            message: `Iframe not found in DOM: ${iframeSrc}`,
            suggestion: 'Fix the iframe source URL',
          });
        }
      }

      if (signal?.aborted) {
        throw new Error('Scan aborted by user');
      }

      const noScriptCount = await getNoscriptCount(page);
      if (noScriptCount > 10) {
        issues.push({
          type: 'error-render',
          severity: 'warning',
          url,
          message: `Page contains ${noScriptCount} noscript tags — consider reducing noscript usage`,
          suggestion: 'Use progressive enhancement instead of heavy noscript reliance',
        });
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
