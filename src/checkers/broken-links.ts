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

    if (signal?.aborted) {
      return issues;
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
      // Only check links on the current page, do not crawl further
      const links = await getLinks(page, url);
      const limitedLinks = links.slice(0, maxLinksPerPage);

      for (const link of limitedLinks) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }

        // Apply include/exclude patterns
        if (!shouldInclude(link, options?.includePatterns || [])) continue;
        if (shouldExclude(link, options?.excludePatterns || [])) continue;

        // Check if link is broken
        const result = await checkLink(link, Math.min(timeout || 12000, 8000), options?.context);
        if (!result.ok) {
          const statusMessage = result.status > 0 
            ? `Broken link: ${link} (HTTP ${result.status})`
            : `Broken link: ${link} (network error or timeout)`;
          issues.push({
            type: 'broken-link',
            severity: 'error',
            url,
            element: `<a href="${link}">`,
            message: statusMessage,
            suggestion: 'Update or remove the broken link',
          });
        }
      }

      if (links.length > maxLinksPerPage) {
        issues.push({
          type: 'broken-link',
          severity: 'info',
          url,
          message: `Only checked first ${maxLinksPerPage} of ${links.length} links on this page`,
          suggestion: 'Consider splitting pages with many links for more thorough checking',
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
