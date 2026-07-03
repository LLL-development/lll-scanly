import type { Page } from 'playwright';
import { Checker, Issue, IssueSeverity } from './base';
import { getLinks } from '../utils/dom';
import { checkLink } from '../utils/http';

export class BrokenLinkChecker implements Checker {
  name = 'Broken Links';
  severity: IssueSeverity = 'error';

  async scan(url: string, maxPages: number = 50, timeout: number = 30000, options?: { signal?: AbortSignal }): Promise<Issue[]> {
    const issues: Issue[] = [];
    const visited = new Set<string>();
    const queue: string[] = [url];
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

      while (queue.length > 0 && visited.size < maxPages) {
        if (signal?.aborted) {
          throw new Error('Scan aborted by user');
        }
        const currentUrl = queue.shift()!;
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);

        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle', timeout });
        } catch {
          continue;
        }

        const links = await getLinks(page, currentUrl);

        for (const link of links) {
          if (visited.has(link)) continue;

          const result = await checkLink(link, timeout);
          if (!result.ok && result.status > 0) {
            issues.push({
              type: 'broken-link',
              severity: 'error',
              url: currentUrl,
              element: `<a href="${link}">`,
              message: `Broken link: ${link} (HTTP ${result.status})`,
              suggestion: 'Update or remove the broken link',
            });
          }
          if (result.ok && !visited.has(link)) {
            queue.push(link);
          }
        }
      }

      await context.close();
    } catch (err) {
      if (err instanceof Error && err.message === 'Scan aborted by user') {
        throw err;
      }
      issues.push({
        type: 'broken-link',
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
