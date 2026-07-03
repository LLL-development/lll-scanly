import type { Page } from 'playwright';

export interface ButtonInfo {
  tag: string;
  text: string;
  hasIcon: boolean;
  outerHTML: string;
}

export async function getImages($page: Page): Promise<Array<{ src: string; alt: string; role: string | null; ariaHidden: string | null }>> {
  return await $page.evaluate(() => {
    const images: Array<{ src: string; alt: string; role: string | null; ariaHidden: string | null }> = [];
    document.querySelectorAll('img').forEach(img => {
      images.push({
        src: img.getAttribute('src') ?? '',
        alt: img.getAttribute('alt') ?? '',
        role: img.getAttribute('role'),
        ariaHidden: img.getAttribute('aria-hidden'),
      });
    });
    return images;
  });
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
