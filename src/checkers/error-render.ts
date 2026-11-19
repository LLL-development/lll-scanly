import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base.js';
import { getImages, getIframes, getNoscriptCount } from '../utils/dom.js';

function isLikelyDynamicImage(url: string): boolean {
  if (url.startsWith('data:')) return false;
  if (url.split('#')[0].includes('?')) return true;
  if (url.includes('%')) {
    const pathPart = url.split(/[?#]/)[0].split('/').pop() || '';
    if (pathPart.length > 40 && /%2[Ff]|%3[Dd]|%26/i.test(pathPart)) return true;
  }
  const pathPart = url.split(/[?#]/)[0].split('/').pop() || '';
  const pathStem = pathPart.replace(/\.[^.]+$/, '');
  if (pathPart.length > 40 && /^[A-Za-z0-9+\/._=\-]+$/.test(pathPart) && !/[a-z]{4,}/i.test(pathPart) && !/^[0-9a-fA-F]+$/.test(pathStem)) return true;

  // Check if filename is a base64-encoded query string
  // (common in image optimization services like Astro, Next.js Image, etc.)
  const filename = url.split(/[?#]/)[0].split('/').pop() || '';
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  if (withoutExt.length >= 30 && /^[A-Za-z0-9+/\-_]+=*$/.test(withoutExt) && !/^[0-9a-fA-F]+$/.test(withoutExt)) {
    try {
      const b64 = withoutExt.replace(/-/g, '+').replace(/_/g, '/');
      const padLen = (4 - (b64.length % 4)) % 4;
      const decoded = atob(b64 + '='.repeat(padLen));
      if (/^[\x20-\x7E]+$/.test(decoded) && /[=&%]/.test(decoded)) {
        return true;
      }
    } catch {
      // not valid base64, skip
    }
  }

  return false;
}

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
      // Dedupe by rawSrc (SVG detection is rawSrc-based). Same src yields the
      // same verdict, so skipping later duplicates loses no information.
      const seen = new Map<string, number>();

      for (let i = 0; i < images.length; i++) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        const img = images[i];
        if (!img.src) continue;

        const rawSrc = img.rawSrc || img.src;
        if (seen.has(rawSrc)) {
          seen.set(rawSrc, (seen.get(rawSrc) ?? 0) + 1);
          continue;
        }
        seen.set(rawSrc, 1);
        const escapedSrc = rawSrc.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
        const isDynamic = isLikelyDynamicImage(rawSrc);

        let imgLoaded: boolean | 'unknown' = false;

        // Check image with a timeout to prevent hanging
        try {
          // Fast path for already-loaded images; otherwise wait for load/error
          // with a timeout so lazy/loading images are not falsely flagged.
          imgLoaded = await page.evaluate(async ({ src, rawSrc }: { src: string; rawSrc: string }): Promise<boolean | 'unknown'> => {
            const imgEl = Array.from(document.querySelectorAll('img')).find(el => el.getAttribute('src') === rawSrc) as HTMLImageElement | undefined;
            if (!imgEl) return false;

            // For SVG images, check if complete (naturalWidth may be 0 for SVG)
            const isSvg = rawSrc.toLowerCase().includes('.svg') || rawSrc.startsWith('data:image/svg');

            // Fast path: already loaded — no waiting
            if (imgEl.complete && imgEl.naturalWidth > 0) return true;
            if (isSvg) {
              if (imgEl.complete) return true;
            } else if (imgEl.complete && imgEl.naturalWidth === 0) {
              // Definitively failed (complete but no pixels)
              return false;
            }

            // Lazy image outside the viewport never fires load/error at all
            // (stays complete=false). Scroll it into view to trigger loading.
            // Only for not-yet-started lazy images, so we don't scroll wildly.
            if (!imgEl.complete && imgEl.loading === 'lazy' && !imgEl.currentSrc) {
              imgEl.scrollIntoView();
            }

            // Still loading (e.g. lazy image) — wait for load/error with timeout.
            // NOTE: do not bind named/arrow functions to variables here. esbuild
            // (tsx) injects a `__name` helper into such functions, which does not
            // exist in the browser and throws ReferenceError inside page.evaluate.
            // Inline anonymous arrows passed to setTimeout/addEventListener are safe.
            return await new Promise<boolean | 'unknown'>((resolve) => {
              let settled = false;
              const timer = setTimeout(() => {
                if (!settled) {
                  settled = true;
                  if (imgEl.complete && imgEl.naturalWidth > 0) resolve(true);
                  else if (imgEl.complete && imgEl.naturalWidth === 0 && !isSvg) resolve(false);
                  // Never started / still pending: not a confirmed failure.
                  else resolve('unknown');
                }
              }, 4000);
              imgEl.addEventListener('load', () => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  resolve(imgEl.naturalWidth > 0);
                }
              });
              imgEl.addEventListener('error', () => {
                if (!settled) {
                  settled = true;
                  clearTimeout(timer);
                  resolve(false);
                }
              });
            });
          }, { src: escapedSrc, rawSrc: rawSrc });

        } catch {
          // page.evaluate failed — treat as not loaded
          imgLoaded = false;
        }

        if (imgLoaded === 'unknown') {
          issues.push({
            type: 'error-render',
            severity: 'warning' as const,
            url,
            element: `<img src="${rawSrc}">`,
            message: `Image could not be verified in time: ${img.src}`,
            suggestion: 'Automatic verification did not complete. Please check manually in a browser that the image renders correctly.',
          });
        } else if (!imgLoaded) {
          if (isDynamic) {
            issues.push({
              type: 'error-render',
              severity: 'warning' as const,
              url,
              element: `<img src="${rawSrc}">`,
              message: `Dynamic image failed to fully decode in time: ${img.src}`,
              suggestion: 'This appears to be a dynamically generated image. Ensure the image generator endpoint is healthy and responding.',
            });
          } else {
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
      }

      if (signal?.aborted) {
        throw new Error('Scan aborted by user');
      }

      const iframes = await getIframes(page, url);
      for (const iframeSrc of iframes) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }

        let isPartytown = false;
        try {
          const u = new URL(iframeSrc, url);
          isPartytown = u.pathname.includes('/~partytown/') || /partytown-sandbox/i.test(u.pathname);
        } catch {
          // malformed URL, don't skip
        }
        if (isPartytown) continue;

        const iframeExists = await page.evaluate((iframeSrc: string) => {
          const el = Array.from(document.querySelectorAll('iframe')).find(f => f.getAttribute('src') === iframeSrc);
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
        message: `Error render check failed: ${err instanceof Error ? err.message : String(err)}`,
        suggestion: 'Check page accessibility and network connectivity',
      });
      return issues;
    }

    return issues;
  }
}
