import type { ScanResult } from '../scanner.js';
import { reportHtml } from './html.js';

export async function reportPdf(result: ScanResult, lang = 'en'): Promise<Buffer> {
  const playwright = await import('playwright');
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const html = reportHtml(result, lang);

  try {
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      width: '210mm',
      height: '297mm',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      displayHeaderFooter: false,
    });

    return pdfBuffer;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}
