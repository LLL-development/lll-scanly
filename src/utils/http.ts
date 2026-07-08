import { chromium } from 'playwright';

export interface LinkCheckResult {
  url: string;
  status: number;
  ok: boolean;
}

// Rate limiting: track last request time
let lastRequestTime = 0;
let rateLimitMs = 100; // default 100ms between requests

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

export async function checkLink(url: string, timeout: number = 10000, context?: import('playwright').BrowserContext, retries: number = 2): Promise<LinkCheckResult> {
  // Rate limiting
  await rateLimit();
  
  // If a context is provided, create a temporary page from it to avoid navigating the main page
  if (context) {
    const tempPage = await context.newPage();
    try {
      let status = 0;
      let lastError: Error | null = null;
      
      // Retry logic for transient errors
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await tempPage.goto(url, { waitUntil: 'commit', timeout });
          status = res?.status() ?? 0;
          
          // Success or non-retryable error
          if (status > 0 || attempt === retries) {
            break;
          }
          
          // Retry on transient errors (status 0 = network error, 502, 503, 504)
          if (status === 0 || status === 502 || status === 503 || status === 504) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
            continue;
          }
          
          break; // Non-retryable error
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          }
        }
      }
      
      return { url, status, ok: status > 0 && status < 400 };
    } finally {
      await tempPage.close();
    }
  }

  // Fallback: launch a new browser if no context provided (for backward compatibility)
  const browser = await chromium.launch({ headless: true });
  try {
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    let status = 0;
    try {
      const res = await newPage.goto(url, { waitUntil: 'commit', timeout });
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
