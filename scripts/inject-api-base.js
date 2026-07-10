import { readFileSync, writeFileSync } from 'node:fs';

const apiBase = process.env.SCANLY_API_BASE || '';
const html = readFileSync('index.html', 'utf-8');
const output = html.replace('{{SCANLY_API_BASE}}', apiBase);
writeFileSync('index.html', output);
console.log(`Injected SCANLY_API_BASE="${apiBase}" into index.html`);
