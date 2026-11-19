import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base.js';
import { getLinks, shouldExclude, shouldInclude } from '../utils/dom.js';
import { checkLink } from '../utils/http.js';

export class BrokenLinkChecker implements Checker {
  name = 'Broken Links';
  severity: IssueSeverity = 'error';

  async scan(url: string, _maxPages?: number, timeout?: number, options?: { signal?: AbortSignal; page?: import('playwright').Page; context?: import('playwright').BrowserContext; maxDepth?: number; excludePatterns?: string[]; includePatterns?: string[] }): Promise<Issue[]> {
    const issues: Issue[] = [];
    const maxLinksPerPage = 400;
    const signal = options?.signal;
    const page = options?.page;

    // MEDIUM #12: Abort at entry too (consistent with loop behavior)
    if (signal?.aborted) {
      throw new Error('Scan aborted by user');
    }

    if (!page) {
      issues.push({
        type: 'broken-link',
        severity: 'error',
        url,
        message: 'No page context provided',
      });
      return issues;
    }

    try {
      const links = await getLinks(page, url);

      // MEDIUM #8: Filter first, then slice
      const filteredLinks = links.filter(
        (link) => shouldInclude(link, options?.includePatterns || []) && !shouldExclude(link, options?.excludePatterns || [])
      );

      const limitedLinks = filteredLinks.slice(0, maxLinksPerPage);

      // Report if filtered links exceed limit (after filtering, not before)
      if (filteredLinks.length > maxLinksPerPage) {
        issues.push({
          type: 'broken-link',
          severity: 'info',
          url,
          message: `Only checked first ${maxLinksPerPage} of ${filteredLinks.length} links on this page`,
          suggestion: 'Consider splitting pages with many links for more thorough checking',
        });
      }

      for (const link of limitedLinks) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }

        // Check if link is broken
        const result = await checkLink(link, Math.min(timeout || 12000, 8000), options?.context);
        if (!result.ok) {
          // Definitely gone (404/410): report as error immediately, no re-verification.
          if (result.status === 404 || result.status === 410) {
            issues.push({
              type: 'broken-link',
              severity: 'error',
              url,
              element: `<a href="${link}">`,
              message: `Broken link: ${link} (HTTP ${result.status})`,
              suggestion: 'Update or remove the broken link',
            });
            continue;
          }

          // Otherwise (400/401/403/429/503 bot-block candidates, or status===0 network/timeout):
          // re-verify with a real browser page before deciding severity.
          const code = await this.verifyWithBrowser(link, options?.context, timeout, signal);

          if (code !== null && code < 400) {
            // Opened fine in a real browser -> false positive, do not report.
            continue;
          }

          // Could not confirm it opens: downgrade to warning instead of error.
          const blockStatuses = [400, 401, 403, 429, 503];
          if (result.status > 0 && blockStatuses.includes(result.status)) {
            issues.push({
              type: 'broken-link',
              severity: 'warning',
              url,
              element: `<a href="${link}">`,
              message: `Possible block: ${link} (HTTP ${result.status})`,
              suggestion: 'The response may have been blocked. Please verify the link manually in a browser.',
            });
          } else {
            // status === 0 (network error or timeout) and other non-ok cases.
            issues.push({
              type: 'broken-link',
              severity: 'warning',
              url,
              element: `<a href="${link}">`,
              message: `Broken link: ${link} (network error or timeout)`,
              suggestion: 'The response may have been blocked. Please verify the link manually in a browser.',
            });
          }
        }
      }
    } catch (err) {
      // MEDIUM #12: Consistent abort handling
      if (err instanceof Error && err.message === 'Scan aborted by user') {
        throw err;
      }
      // MEDIUM #2: Report errors instead of silently swallowing
      issues.push({
        type: 'broken-link',
        severity: 'error',
        url,
        message: `Link check failed: ${err instanceof Error ? err.message : String(err)}`,
        suggestion: 'Check page accessibility and network connectivity',
      });
    }

    return issues;
  }

  // Re-verify a non-ok link with a real browser page. Returns the HTTP status code
  // (0 if navigation produced no response), or null when re-verification could not run
  // (no context, page creation failure, or navigation error). Throws on user abort.
  private async verifyWithBrowser(
    link: string,
    context?: import('playwright').BrowserContext,
    timeout?: number,
    signal?: AbortSignal
  ): Promise<number | null> {
    if (!context) return null;

    let page: Page | undefined;
    try {
      page = await context.newPage();
      const resp = await page.goto(link, {
        waitUntil: 'domcontentloaded',
        timeout: Math.min(timeout || 12000, 8000),
      });
      if (signal?.aborted) {
        throw new Error('Scan aborted by user');
      }
      return resp ? resp.status() : 0;
    } catch (err) {
      if (err instanceof Error && err.message === 'Scan aborted by user') {
        throw err;
      }
      return null;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {
          // ignore close failures
        }
      }
    }
  }
}
