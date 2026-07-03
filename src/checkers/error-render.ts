import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base';
import { getImages, getIframes, getNoscriptCount } from '../utils/dom';

export class ErrorRenderChecker implements Checker {
  name = 'Error Rendering';
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
        if (!img.src) continue;

        const imgLoaded = await page.evaluate((src) => {
          const el = document.querySelector(`img[src="${src}"]`);
          if (!el) return false;
          const imgEl = el as HTMLImageElement;
          return imgEl.naturalWidth > 0 && !imgEl.complete === false;
        }, img.src);

        if (!imgLoaded) {
          issues.push({
            type: 'error-render',
            severity: 'error',
            url,
            element: `<img src="${img.src}">`,
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
        const iframeExists = await page.evaluate((src) => {
          const el = document.querySelector(`iframe[src="${src}"]`);
          return el !== null;
        }, iframeSrc);

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
      issues.push({
        type: 'error-render',
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
