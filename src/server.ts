import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import api from './api.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);

  // API routes
  if (url.pathname === '/api/scan' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const { scanUrl, maxPages, timeout } = JSON.parse(body);

    if (!scanUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL is required' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    const result = await api.scan(scanUrl, parseInt(maxPages || '1', 10), parseInt(timeout || '60000', 10));
    res.end(JSON.stringify(result));
    return;
  }

  if (url.pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ scanning: api.isBusy() }));
    return;
  }

  if (url.pathname === '/api/result' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(api.getResult()));
    return;
  }

  if (url.pathname === '/api/progress' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(api.getProgress()));
    return;
  }

  if (url.pathname === '/api/stop' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const result = await api.stop();
    res.end(JSON.stringify(result));
    return;
  }

  // Serve static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const fullPath = `.${filePath}`;
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(fullPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(4000, () => {
  console.log('\n  Scanly UI running at http://localhost:4000\n');
});

process.on('SIGINT', () => {
  console.log('\n  Shutting down Scanly...');
  api.stop().then(() => {
    server.close(() => process.exit(0));
  }).catch(() => {
    server.close(() => process.exit(0));
  });
});

process.on('SIGTERM', () => {
  console.log('\n  Shutting down Scanly...');
  api.stop().then(() => {
    server.close(() => process.exit(0));
  }).catch(() => {
    server.close(() => process.exit(0));
  });
});
