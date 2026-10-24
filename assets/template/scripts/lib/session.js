// One server + one Chrome + one reused page for a whole run. Never render in parallel.
import { serve } from './server.js';
import { launchChrome } from './chrome.js';
import { ROOT } from './cli.js';

export async function openSession() {
  const server = await serve(ROOT);
  const browser = await launchChrome();
  const page = await browser.newPage();
  const log = [];
  page.on('console', (m) => {
    if (m.type() === 'warn' || m.type() === 'warning' || m.type() === 'error') log.push(m.text());
  });
  page.on('pageerror', (e) => log.push(`page error: ${e.message}`));
  page.on('response', (r) => {
    const url = r.url();
    if (r.status() >= 400 && r.request().method() !== 'HEAD' && !/(\.boxes\.json|layout\.json|favicon\.ico)$/.test(url)) {
      log.push(`${r.status()} ${url.replace(server.origin, '')}`);
    }
  });
  return {
    origin: server.origin,
    page,
    drain: () => [...new Set(log.splice(0))].filter((m) => !/^Failed to load resource/.test(m)),
    info: () => page.evaluate(() => window.__info || null).catch(() => null),
    async close() {
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
      await server.close();
    },
  };
}

// readyMode 'flag': wait for the page's explicit window.__ready (engine pages; never a fixed sleep).
// readyMode 'auto': fonts + images settled, then window.__ready unless the page left it undefined (mock screens).
async function settle(page, readyMode) {
  if (readyMode === 'auto') {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    });
    await page.waitForFunction(() => window.__ready !== false, { timeout: 120000, polling: 50 });
  } else {
    await page.waitForFunction(() => window.__ready === true || !!window.__error, { timeout: 120000, polling: 50 });
  }
  const err = await page.evaluate(() => window.__error || null);
  if (err) throw new Error(err);
}

// Load a page, wait until it is ready, screenshot it.
// clips: optional [{x, y, width, height}] -> one buffer per clip, all from the same layout.
// sizeFrom: name of a window property {w, h} the page sets; the viewport is resized to it before the shot.
// dprFrom: name of a window property holding the pixel ratio to shoot at (overview sheets).
export async function capture(session, pathAndQuery, opts) {
  const { width, height, clips, type = 'png', quality = 90, omitBackground = false, readyMode = 'flag', sizeFrom, dprFrom } = opts;
  let { dpr = 1 } = opts;
  const { page } = session;
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  await page.goto(`${session.origin}/${pathAndQuery.replace(/^\//, '')}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await settle(page, readyMode);
  } catch (err) {
    throw new Error(`${pathAndQuery}: ${err.message}`);
  }
  let w = width;
  let h = height;
  if (sizeFrom || dprFrom) {
    const s = sizeFrom ? await page.evaluate((k) => window[k], sizeFrom) : null;
    const d = dprFrom ? await page.evaluate((k) => window[k], dprFrom) : null;
    if (s && s.w && s.h) {
      w = s.w;
      h = s.h;
    }
    if (d) dpr = d;
    await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  const shot = { type, omitBackground, captureBeyondViewport: false, ...(type === 'jpeg' ? { quality } : {}) };
  if (!clips) return [Buffer.from(await page.screenshot({ ...shot, clip: { x: 0, y: 0, width: w, height: h } }))];
  const out = [];
  for (const clip of clips) out.push(Buffer.from(await page.screenshot({ ...shot, clip })));
  return out;
}
