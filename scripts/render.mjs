#!/usr/bin/env node
// render.mjs <report.html> <out dir> <expected pages>
// Prints one JSON line: {ok, problems, pdf, pngs, pages}. Called by report_pdf.py build; not a user command.
// Chromium (Playwright) loads the page from a loopback-only server; every request that is not to that server is
// aborted, so a report never loads anything from the network.
// Checks, in order: every box's content fits its box, every block sits inside its page's body, the PDF has exactly
// the expected number of pages. Then one PNG per page at 2x.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('playwright-core')); }

async function withPage(virtual, fn, { width, height, scale }) {
  const server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    if (virtual[p] == null) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(virtual[p]);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  // A dead proxy as a second guard: anything that slips past page.route still cannot reach the network.
  const browser = await chromium.launch({ headless: true, args: ['--proxy-server=http://127.0.0.1:9'] });
  try {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
    const page = await ctx.newPage();
    const origin = new URL(base).origin;
    await page.route(u => { try { return new URL(String(u)).origin !== origin; } catch { return true; } }, r => r.abort());
    page.errors = []; page.on('pageerror', e => page.errors.push(String(e)));
    return await fn(page, base);
  } finally { await browser.close(); server.close(); }
}

const [html, outDir, expectArg] = process.argv.slice(2);
if (!html || !outDir || !expectArg) {
  process.stderr.write('usage: render.mjs <report.html> <out dir> <expected pages>\n');
  process.exit(2);
}
const expected = Number(expectArg);
fs.mkdirSync(outDir, { recursive: true });
const pdfPath = path.join(outDir, 'report.pdf');
const res = { ok: false, problems: [], pdf: pdfPath, pngs: [], pages: 0 };

await withPage({ '/report.html': fs.readFileSync(html, 'utf8') }, async (page, base) => {
  await page.goto(base + '/report.html', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (page.errors.length) res.problems.push('page script error: ' + page.errors.join('; ').slice(0, 300));
  const found = await page.evaluate(() => {
    const out = [];
    const where = el => el.getAttribute('data-where') || el.className;
    for (const el of document.querySelectorAll('[data-box]')) {
      const dh = el.scrollHeight - el.clientHeight, dw = el.scrollWidth - el.clientWidth;
      if (dh > 1) out.push(`${where(el)}: text runs ${dh}px past the bottom of its box; shorten it`);
      if (dw > 1) out.push(`${where(el)}: content is ${dw}px wider than its box; shorten words or the table`);
    }
    for (const pg of document.querySelectorAll('.page')) {
      const body = pg.querySelector('.body'); const foot = pg.querySelector('.foot');
      if (!body) continue;
      const limit = (foot ? foot.getBoundingClientRect().top : pg.getBoundingClientRect().bottom) - 4;
      const right = pg.getBoundingClientRect().right;
      for (const b of body.children) {
        const r = b.getBoundingClientRect();
        if (r.bottom > limit + 0.5) out.push(`${where(b)}: runs ${Math.ceil(r.bottom - limit)}px past the bottom of page ${pg.dataset.page}; cut words, drop a block or move it to another page`);
        if (r.right > right + 0.5) out.push(`${where(b)}: runs past the right edge of page ${pg.dataset.page}`);
      }
    }
    // Font floor: no visible text under 10 CSS px (7.5 pt).
    const small = new Set();
    for (const el of document.querySelectorAll('.page *')) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (own && parseFloat(getComputedStyle(el).fontSize) < 10) small.add(where(el.closest('[data-where]') || el));
    }
    for (const w of small) out.push(`${w}: text under 10px, too small to read`);
    return { problems: out, pages: document.querySelectorAll('.page').length };
  });
  res.problems.push(...found.problems);
  if (found.pages !== expected) res.problems.push(`HTML has ${found.pages} pages, spec has ${expected}`);
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  const buf = fs.readFileSync(pdfPath);
  res.pages = (buf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  if (res.pages !== expected) res.problems.push(`the PDF has ${res.pages} pages but the spec has ${expected}: something spilled onto an extra page`);
  await page.setViewportSize({ width: 816, height: 1056 });
  const pages = await page.$$('.page');
  for (let i = 0; i < pages.length; i++) {
    const p = path.join(outDir, `page-${i + 1}.png`);
    await pages[i].screenshot({ path: p, scale: 'device' });
    res.pngs.push(p);
  }
}, { width: 816, height: 1056, scale: 2 });

res.ok = res.problems.length === 0;
process.stdout.write(JSON.stringify(res) + '\n');
process.exit(res.ok ? 0 : 1);
