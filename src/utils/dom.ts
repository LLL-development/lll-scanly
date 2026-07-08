import type { Page } from 'playwright';

export interface ButtonInfo {
  tag: string;
  text: string;
  hasIcon: boolean;
  outerHTML: string;
}

export async function getImages($page: Page, baseUrl: string): Promise<Array<{ src: string; alt: string; role: string | null; ariaHidden: string | null; rawSrc: string }>> {
  return await $page.evaluate(({ base }) => {
    const images: Array<{ src: string; alt: string; role: string | null; ariaHidden: string | null; rawSrc: string }> = [];
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
          const resolved = new URL(href, base).href;
          if (!resolved.startsWith('javascript:') && !resolved.startsWith('#') && !resolved.startsWith('data:')) {
            links.push(resolved);
          }
        } catch {
          // skip invalid URLs
        }
      }
    });
    return links;
  }, baseUrl);
}

export async function getButtons($page: Page): Promise<ButtonInfo[]> {
  return await $page.evaluate(() => {
    const buttons: ButtonInfo[] = [];

    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim() ?? '';
      const hasIcon = btn.querySelectorAll('i, svg, img, .icon').length > 0;
      buttons.push({
        tag: 'button',
        text,
        hasIcon,
        outerHTML: btn.outerHTML || '',
      });
    });

    document.querySelectorAll('input[type="submit"], input[type="button"]').forEach(input => {
      const value = input.getAttribute('value') ?? '';
      buttons.push({
        tag: 'input',
        text: value,
        hasIcon: false,
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
  return await $page.evaluate(() => {
    return [];
  });
}

/**
 * Check if a URL matches any of the provided glob patterns
 * Supports * (matches any characters) and ? (matches single character)
 */
export function matchesPattern(url: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true; // No patterns = match all
  
  const urlPath = new URL(url).pathname;
  
  return patterns.some(pattern => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*') // * matches any characters
      .replace(/\?/g, '.'); // ? matches single character
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(urlPath);
  });
}

/**
 * Check if a URL should be excluded based on exclude patterns
 */
export function shouldExclude(url: string, excludePatterns: string[]): boolean {
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
