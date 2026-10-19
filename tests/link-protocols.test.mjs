import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {getLinks} from '../dist/utils/dom.js';

test('HTTP-only link extraction excludes executable and non-network application schemes', async () => {
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
  try {
    const page=await browser.newPage();
    await page.setContent(`<a href="javascript:window.pwned=1">script</a>
      <a href="JaVaScRiPt:window.pwned=1">mixed</a>
      <a href="java&#9;script:window.pwned=1">tab</a>
      <a href="data:text/html,payload">data</a><a href="VBSCRIPT:msgbox(1)">vbscript</a>
      <a href="file:///etc/passwd">file</a><a href="blob:https://example.test/id">blob</a>
      <a href="mailto:test@example.test">mail</a><a href="tel:+123">phone</a>
      <a href="myapp:open">app</a><a href="ftp://example.test/file">ftp</a>
      <a href="/normal?q=1">normal</a><a href="https://example.test/path">secure</a>`);
    assert.deepEqual(await getLinks(page,'http://example.test/base'),[
      'http://example.test/normal?q=1','https://example.test/path',
    ]);
  } finally { await browser.close(); }
});
test('normal relative, protocol-relative, query and fragment links keep URL resolution', async()=>{
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH});
  try {
    const page=await browser.newPage();
    await page.setContent('<a href="../about">about</a><a href="//cdn.example.test/a">CDN</a><a href="?q=x">query</a><a href="#section">fragment</a>');
    assert.deepEqual(await getLinks(page,'https://example.test/docs/page'),[
      'https://example.test/about','https://cdn.example.test/a','https://example.test/docs/page?q=x','https://example.test/docs/page#section',
    ]);
  }finally{await browser.close();}
});
