export interface LinkCheckResult {
  url: string;
  status: number;
  ok: boolean;
}

// Rate limiting: track last request time
let lastRequestTime = 0;
let rateLimitMs = 50; // default 50ms between requests

export function setRateLimit(ms: number) {
  rateLimitMs = ms;
  lastRequestTime = 0; // Reset
}

async function rateLimit(): Promise<void> {
  const delayMs = rateLimitMs;
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < delayMs) {
    await new Promise(resolve => setTimeout(resolve, delayMs - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
}

export async function checkLink(url: string, timeout: number = 10000, _context?: import('playwright').BrowserContext, retries: number = 1): Promise<LinkCheckResult> {
  // Rate limiting
  await rateLimit();

  // Use native fetch for fast HTTP-only link checking
  // This avoids launching a browser for each link check
  let status = 0;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(timeout, 8000));
      
      const res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Scanly-Crawler/1.0',
        },
      });
      clearTimeout(timer);
      status = res.status;
      break;
    } catch {
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      status = 0;
    }
  }
  
  return { url, status, ok: status > 0 && status < 400 };
}

export async function closeBrowser(browser: import('playwright').Browser) {
  await browser.close();
}
