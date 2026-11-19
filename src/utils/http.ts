export interface LinkCheckResult {
  url: string;
  status: number;
  ok: boolean;
}

// SSRF protection — block private/reserved IP addresses
function isPrivateOrReservedHost(host: string): boolean {
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const a = parseInt(ipv4Match[1], 10);
    const b = parseInt(ipv4Match[2], 10);
    const c = parseInt(ipv4Match[3], 10);
    const d = parseInt(ipv4Match[4], 10);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0 && b === 0 && c === 0 && d === 0) return true;
  }
  if (host.toLowerCase() === 'localhost') return true;
  if (host === '[::1]' || host === '::1') return true;
  return false;
}

async function assertSafeTarget(url: string): Promise<void> {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (isPrivateOrReservedHost(host)) {
    throw new Error(`Blocked SSRF attempt to private host: ${host}`);
  }
}

// Rate limiting with promise chain for concurrent safety
let lastRequestTime = 0;
let rateLimitMs = 50;
let rateLimitChain: Promise<void> = Promise.resolve();

export function setRateLimit(ms: number) {
  rateLimitMs = Math.max(0, ms);
  lastRequestTime = 0;
  rateLimitChain = Promise.resolve();
}

function rateLimit(): Promise<void> {
  const previous = rateLimitChain;
  rateLimitChain = previous.then(async () => {
    const wait = rateLimitMs - (Date.now() - lastRequestTime);
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    lastRequestTime = Date.now();
  });
  return rateLimitChain;
}

export async function checkLink(
  url: string,
  timeout: number = 10000,
  context?: import('playwright').BrowserContext,
  retries: number = 1
): Promise<LinkCheckResult> {
  // Skip non-HTTP(S) URLs
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim());
  if (schemeMatch && !['http', 'https'].includes(schemeMatch[1].toLowerCase())) {
    return { url, status: 0, ok: true };
  }

  // SSRF protection
  await assertSafeTarget(url);

  // Normalize timeout (minimum 1000ms)
  const effectiveTimeout = Math.max(1000, Math.min(timeout > 0 ? timeout : 8000, 8000));

  // Retry count safety
  const maxRetries = Math.max(0, Number.isFinite(retries) ? Math.floor(retries) : 0);

  // Step 1: Try HEAD request
  let status = 0;
  let headOk = false;
  let headStatus = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await rateLimit();
    try {
      if (context) {
        const res = await context.request.fetch(url, {
          method: 'HEAD',
          maxRedirects: 20,
          timeout: effectiveTimeout,
        });
        status = res.status();
        headStatus = status;

        if (status > 0 && status < 400) {
          headOk = true;
        }
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), effectiveTimeout);

        try {
          const res = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Scanly-Crawler/1.0',
            },
          });
          status = res.status;
          headStatus = status;

          if (status > 0 && status < 400) {
            headOk = true;
          }
        } finally {
          clearTimeout(timer);
        }
      }
      break;
    } catch (err) {
      console.warn(`[checkLink] HEAD failed for ${url} (attempt ${attempt + 1}/${maxRetries + 1}):`, err instanceof Error ? err.message : String(err));
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
    }
  }

  if (headOk) {
    return { url, status: headStatus, ok: true };
  }

  // Step 2: Fallback to GET request
  let gotGetStatus = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await rateLimit();
    try {
      if (context) {
        const res = await context.request.fetch(url, {
          method: 'GET',
          maxRedirects: 20,
          timeout: effectiveTimeout,
        });
        status = res.status();
        gotGetStatus = true;

        try { await res.body(); } catch { /* ignore body read errors */ }
        await res.dispose();
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), effectiveTimeout);

        try {
          const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Scanly-Crawler/1.0',
            },
          });
          status = res.status;
          gotGetStatus = true;

          await res.body?.cancel();
        } finally {
          clearTimeout(timer);
        }
      }
      break;
    } catch (err) {
      console.warn(`[checkLink] GET failed for ${url} (attempt ${attempt + 1}/${maxRetries + 1}):`, err instanceof Error ? err.message : String(err));
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
    }
  }

  const finalStatus = gotGetStatus ? status : headStatus;
  return { url, status: finalStatus, ok: finalStatus > 0 && finalStatus < 400 };
}

export async function closeBrowser(browser: import('playwright').Browser) {
  await browser.close();
}
