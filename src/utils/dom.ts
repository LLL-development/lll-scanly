import type { Page } from 'playwright';

export interface ButtonInfo {
  tag: string;
  text: string;
  hasIcon: boolean;
  ariaLabel: string;
  title: string;
  ariaLabelledby: string;
  outerHTML: string;
}

export async function getImages($page: Page, baseUrl: string): Promise<Array<{ src: string; alt: string; hasAltAttr: boolean; role: string | null; ariaHidden: string | null; rawSrc: string }>> {
  return await $page.evaluate(({ base }) => {
    const images: Array<{ src: string; alt: string; hasAltAttr: boolean; role: string | null; ariaHidden: string | null; rawSrc: string }> = [];
    document.querySelectorAll('img').forEach(img => {
      const rawSrc = img.getAttribute('src') ?? '';
      let resolvedSrc = rawSrc;
      if (rawSrc) {
        try {
          resolvedSrc = new URL(rawSrc, base).href;
        } catch {
          resolvedSrc = rawSrc;
        }
      }
      images.push({
        src: resolvedSrc,
        alt: img.getAttribute('alt') ?? '',
        hasAltAttr: img.hasAttribute('alt'),
        role: img.getAttribute('role'),
        ariaHidden: img.getAttribute('aria-hidden'),
        rawSrc: rawSrc,
      });
    });
    return images;
  }, { base: baseUrl });
}

export async function getLinks($page: Page, baseUrl: string): Promise<string[]> {
  return await $page.evaluate((base) => {
    const links: string[] = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href) {
        try {
          const resolved = new URL(href, base);
          // This collection feeds native HTTP HEAD checks, not browser navigation
          // or app/deep-link handlers. Only supported network protocols belong here.
          if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
            links.push(resolved.href);
          }
          links.push(resolved);
        } catch {
          // skip invalid URLs
        }
      }
    });
    // Deduplicate links (MEDIUM #11)
    return [...new Set(links)];
  }, baseUrl);
}

export async function getButtons($page: Page): Promise<ButtonInfo[]> {
  return await $page.evaluate(() => {
    const buttons: ButtonInfo[] = [];

    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim() ?? '';
      const hasIcon = btn.querySelectorAll('i, svg, img, .icon').length > 0;
      const labelledbyIds = btn.getAttribute('aria-labelledby');
      let ariaLabelledby = '';
      if (labelledbyIds) {
        ariaLabelledby = labelledbyIds
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter((t) => t !== '')
          .join(' ');
      }
      buttons.push({
        tag: 'button',
        text,
        hasIcon,
        ariaLabel: btn.getAttribute('aria-label') ?? '',
        title: btn.getAttribute('title') ?? '',
        ariaLabelledby,
        outerHTML: btn.outerHTML || '',
      });
    });

    document.querySelectorAll('input[type="submit"], input[type="button"]').forEach(input => {
      const value = input.getAttribute('value') ?? '';
      buttons.push({
        tag: 'input',
        text: value,
        hasIcon: false,
        ariaLabel: input.getAttribute('aria-label') ?? '',
        title: input.getAttribute('title') ?? '',
        ariaLabelledby: '',
        outerHTML: input.outerHTML || '',
      });
    });

    return buttons;
  });
}

export async function getIframes($page: Page, baseUrl: string): Promise<string[]> {
  return await $page.evaluate((base) => {
    const iframes: string[] = [];
    document.querySelectorAll('iframe[src]').forEach(iframe => {
      const src = iframe.getAttribute('src');
      if (src) {
        try {
          iframes.push(new URL(src, base).href);
        } catch {
          iframes.push(src);
        }
      }
    });
    return iframes;
  }, baseUrl);
}

export async function getNoscriptCount($page: Page): Promise<number> {
  return await $page.evaluate(() => {
    return document.querySelectorAll('noscript').length;
  });
}

export async function getConsoleErrors($page: Page): Promise<string[]> {
  // Stub — not yet implemented. Console errors should be captured
  // via page.on('console', ...) / page.on('pageerror', ...) in scanner.ts. (MEDIUM #17)
  return [];
}

/**
 * Check if a URL matches any of the provided glob patterns
 * Supports * (matches any characters) and ? (matches single character)
 */
export function matchesPattern(url: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true; // No patterns = match all

  const parsed = new URL(url);
  // Match against pathname + search + hash (MEDIUM #9)
  const target = parsed.pathname + parsed.search + parsed.hash;

  return patterns.some(pattern => {
    // Convert glob pattern to regex (MEDIUM #14: ReDoS protection)
    // Collapse consecutive * into single .*
    let regexStr = '';
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === '*') {
        // Collapse consecutive * into single .*
        while (i < pattern.length && pattern[i] === '*') i++;
        i--; // step back one since loop will increment
        regexStr += '.*';
      } else if (ch === '?') {
        regexStr += '.';
      } else if (/[.+^${}()|[\]\\]/.test(ch)) {
        regexStr += '\\' + ch;
      } else {
        regexStr += ch;
      }
    }
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(target);
  });
}

/**
 * Check if a URL should be excluded based on exclude patterns
 */
export function shouldExclude(url: string, excludePatterns: string[]): boolean {
  if (excludePatterns.length === 0) return false;
  return matchesPattern(url, excludePatterns);
}

/**
 * Check if a URL should be included based on include patterns
 * If no include patterns, all URLs are included (unless excluded)
 */
export function shouldInclude(url: string, includePatterns: string[]): boolean {
  if (includePatterns.length === 0) return true;
  return matchesPattern(url, includePatterns);
}
