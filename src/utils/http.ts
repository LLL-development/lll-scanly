import { chromium } from 'playwright';

export interface LinkCheckResult {
  url: string;
  status: number;
  ok: boolean;
}

export async function checkLink(url: string, timeout: number = 10000): Promise<LinkCheckResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    let status = 0;
    try {
      const res = await page.goto(url, { waitUntil: 'commit', timeout });
      status = res?.status() ?? 0;
    } catch {
      status = 0;
    }

    return { url, status, ok: status > 0 && status < 400 };
  } catch {
    return { url, status: 0, ok: false };
  } finally {
    await browser.close();
  }
}

export async function closeBrowser(browser: import('playwright').Browser) {
  await browser.close();
}
