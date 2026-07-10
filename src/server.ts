import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import api from './api.js';
import { reportHtml } from './reporters/html.js';
import { reportCsv } from './reporters/csv.js';
import { reportPdf } from './reporters/pdf.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const ALLOWED_ORIGINS = [
  'https://lll-scanly.pages.dev',
  'http://localhost:4000',
  'http://localhost:5173',
  'https://lll-scanly-api.onrender.com',
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.some(allowed => {
    try {
      const allowedUrl = new URL(allowed);
      const originUrl = new URL(origin);
      if (originUrl.host === allowedUrl.host && originUrl.protocol === allowedUrl.protocol) {
        return true;
      }
      // Allow Cloudflare Pages preview URLs: <branch>--<project>.pages.dev
      if (allowedUrl.host === 'lll-scanly.pages.dev') {
        const previewPattern = /^[^-]+-lll-scanly\.pages\.dev$/;
        return previewPattern.test(originUrl.host);
      }
      // Allow Render URLs: <name>-<user>.onrender.com
      if (allowedUrl.host === 'scanly-api.onrender.com') {
        const renderPattern = /^scanly-api-[a-z0-9-]+\.onrender\.com$/;
        return renderPattern.test(originUrl.host);
      }
      return false;
    } catch {
      return false;
    }
  });
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);

  // API routes
  if (url.pathname === '/api/scan' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const parsed = JSON.parse(body);
    const { scanUrl, maxPages, timeout, scanId, scanMode } = parsed;

    if (!scanUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL is required' }));
      return;
    }

    const maxDepth = parseInt(parsed.maxDepth || '5', 10);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const result = await api.scan(scanUrl, parseInt(maxPages || '1', 10), parseInt(timeout || '60000', 10), maxDepth, scanMode);
    res.end(JSON.stringify(result));
    return;
  }

  if (url.pathname === '/api/status' && req.method === 'GET') {
    const activeScans = api.getActiveScans();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      scanning: api.isBusy(), 
      activeScans: activeScans,
      activeCount: activeScans.length
    }));
    return;
  }

  if (url.pathname === '/api/result' && req.method === 'GET') {
    const scanId = url.searchParams.get('scanId');
    const result = api.getResult(scanId || '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (url.pathname === '/api/progress' && req.method === 'GET') {
    const scanId = url.searchParams.get('scanId');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(api.getProgress(scanId || '')));
    return;
  }

  if (url.pathname === '/api/stop' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const { scanId } = JSON.parse(body || '{}');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const result = await api.stop(scanId || '');
    res.end(JSON.stringify(result));
    return;
  }

  if (url.pathname === '/api/events' && req.method === 'GET') {
    const scanId = url.searchParams.get('scanId');
    const since = parseInt(url.searchParams.get('since') || '0', 10);
    const events = api.getEvents(scanId || '', since);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events, count: events.length }));
    return;
  }

  if (url.pathname === '/api/download' && req.method === 'GET') {
    const format = url.searchParams.get('format');
    const scanId = url.searchParams.get('scanId');
    const lang = url.searchParams.get('lang') || 'en';

    if (!['pdf', 'csv'].includes(format || '')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid format. Use "pdf" or "csv".' }));
      return;
    }

    if (!scanId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'scanId is required' }));
      return;
    }

    const result = api.getResult(scanId);
    if (!result || Object.keys(result).length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No scan result found for this scanId' }));
      return;
    }

    try {
      if (format === 'csv') {
        const csvContent = reportCsv(result, lang);
        const bom = '\uFEFF';
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="scanly-report-${scanId}.csv"`,
        });
        res.end(bom + csvContent);
        return;
      }

      if (format === 'pdf') {
        const pdfBuffer = await reportPdf(result, lang);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="scanly-report-${scanId}.pdf"`,
          'Content-Length': pdfBuffer.length,
        });
        res.end(pdfBuffer);
        return;
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Failed to generate ${format} report: ${err instanceof Error ? err.message : String(err)}` }));
      return;
    }
  }

  // Serve static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const fullPath = `.${filePath}`;
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    if (['.png', '.jpg', '.svg', '.webp'].includes(ext)) {
      const content = readFileSync(fullPath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } else {
      const content = readFileSync(fullPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = parseInt(process.env.PORT || '4000', 10);

server.listen(PORT, () => {
  console.log(`\n  Scanly API running on port ${PORT}\n`);
});

process.on('SIGINT', () => {
  console.log('\n  Shutting down Scanly...');
  api.stop('').then(() => {
    server.close(() => process.exit(0));
  }).catch(() => {
    server.close(() => process.exit(0));
  });
});

process.on('SIGTERM', () => {
  console.log('\n  Shutting down Scanly...');
  api.stop('').then(() => {
    server.close(() => process.exit(0));
  }).catch(() => {
    server.close(() => process.exit(0));
  });
});
