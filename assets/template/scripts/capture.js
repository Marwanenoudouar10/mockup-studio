// Mode A for websites and web apps: capture live pages with the same Chrome, straight into raw/.
//   npm run capture -- --url https://example.com[,https://example.com/pricing] [--name home[,pricing]]
//     [--viewport 1440x900] [--dpr 2] [--full] [--mobile] [--tablet] [--theme dark] [--locale es]
//     [--hide ".cookie-banner,#chat-widget"] [--wait networkidle|load|<ms>|<css selector>] [--delay 800]
//     [--cookies cookies.json] [--headers headers.json] [--box "pricing=.pricing,cta=header .btn"] [--scale 2] [--dir raw]
// -> raw/web/<name>.png (1440 x 900 @2x = 2880 x 1800), raw/web/<name>-full.png (--full, whole page),
//    raw/ios/<name>.png + raw/android/<name>.png (--mobile: 440 x 956 @3, 360 x 800 @3, mobile user agent),
//    raw/ipad/<name>.png (--tablet: 1032 x 1376 @2), <name>.boxes.json from --box (for lifts), per locale in raw/<p>/<locale>/.
// Login: --cookies takes a JSON array of { name, value, domain, path } (export it from your browser's dev tools),
//   --headers a JSON object (e.g. { "Authorization": "Bearer ..." }). Neither is ever written to raw/.
// Animations and transitions are frozen, the caret hidden, prefers-reduced-motion set; --hide removes overlays.
import fs from 'node:fs';
import path from 'node:path';
import { PLATFORMS } from './lib/stores.js';
import { flattenPng } from './lib/png.js';
import { ROOT, parseArgs, list, isMain, fail } from './lib/cli.js';
import { openSession } from './lib/session.js';
import { printFile } from './render.js';

const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
};
const FREEZE = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}html{scrollbar-width:none}';

const readJson = (file, what) => {
  const abs = path.resolve(ROOT, String(file));
  if (!fs.existsSync(abs)) throw new Error(`--${what} ${file}: not found`);
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    throw new Error(`--${what} ${file}: not valid JSON (${err.message})`);
  }
};

export function nameFor(url) {
  const u = new URL(url);
  const slug = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop();
  return (slug || 'home').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'home';
}

function jobs(flags) {
  const [vw, vh] = String(flags.viewport || '1440x900').split('x').map(Number);
  if (!vw || !vh) throw new Error(`--viewport ${flags.viewport}: use WIDTHxHEIGHT, e.g. 1440x900`);
  const scale = flags.scale === undefined || flags.scale === true ? 1 : Number(flags.scale);
  const out = [{ platform: 'web', w: vw, h: vh, dpr: Number(flags.dpr || PLATFORMS.web.dpr) * scale, full: false }];
  if (flags.full) out.push({ ...out[0], full: true, suffix: '-full' });
  if (flags.tablet) out.push({ platform: 'ipad', w: PLATFORMS.ipad.css[0], h: PLATFORMS.ipad.css[1], dpr: PLATFORMS.ipad.dpr * scale, mobile: true });
  if (flags.mobile) {
    for (const p of ['ios', 'android']) out.push({ platform: p, w: PLATFORMS[p].css[0], h: PLATFORMS[p].css[1], dpr: PLATFORMS[p].dpr * scale, mobile: true });
  }
  return out;
}

// scroll through the page so lazy images load, then back to the top
async function settle(page, j, flags) {
  if (j.full) {
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      scrollTo(0, 0);
    });
  }
  const wait = flags.wait;
  if (wait && wait !== true && !/^(networkidle|load|\d+)$/.test(wait)) await page.waitForSelector(wait, { timeout: 30000 });
  if (/^\d+$/.test(String(wait))) await new Promise((r) => setTimeout(r, Number(wait)));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter((i) => !i.complete).map((i) => i.decode().catch(() => {})));
  });
  if (flags.delay) await new Promise((r) => setTimeout(r, Number(flags.delay)));
}

function boxSpecs(flags) {
  return (list(flags.box) || []).map((s) => {
    const i = s.indexOf('=');
    if (i < 1) throw new Error(`--box "${s}": use name=css selector`);
    return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
  });
}

async function measure(page, specs, dpr, full) {
  return page.evaluate((list, k, whole) => {
    const out = {};
    const missing = [];
    for (const [name, sel] of list) {
      const n = document.querySelector(sel);
      if (!n || !n.getClientRects().length) { missing.push(`${name} (${sel})`); continue; }
      const r = n.getBoundingClientRect();
      const dy = whole ? scrollY : 0;
      const rad = parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0;
      out[name] = { x: Math.round(r.left * k), y: Math.round((r.top + dy) * k), w: Math.round(r.width * k), h: Math.round(r.height * k), r: Math.round(rad * k) };
    }
    return { out, missing };
  }, specs, dpr, full);
}

export async function runCapture(session, flags) {
  const urls = list(flags.url);
  if (!urls || !urls.length) throw new Error('--url is required, e.g. npm run capture -- --url https://example.com');
  for (const u of urls) if (!/^https?:\/\//.test(u)) throw new Error(`--url ${u}: use a full http(s):// address`);
  const names = list(flags.name) || [];
  const locale = flags.locale && flags.locale !== true ? String(flags.locale) : null;
  const dir = path.resolve(ROOT, String(flags.dir || 'raw'));
  const cookies = flags.cookies ? readJson(flags.cookies, 'cookies') : [];
  const headers = flags.headers ? readJson(flags.headers, 'headers') : {};
  const hide = list(flags.hide) || [];
  const specs = boxSpecs(flags);
  const { page } = session;
  const desktopUa = (await page.browser().userAgent()).replace('HeadlessChrome', 'Chrome');
  if (cookies.length) await page.setCookie(...cookies);
  await page.setExtraHTTPHeaders({ ...headers, ...(locale ? { 'Accept-Language': locale } : {}) });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: flags.theme === 'dark' ? 'dark' : 'light' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);
  let n = 0;
  for (const [ui, url] of urls.entries()) {
    const name = names[ui] || nameFor(url);
    for (const j of jobs(flags)) {
      const t0 = Date.now();
      await page.setUserAgent(j.mobile ? UA[j.platform] : desktopUa);
      await page.setViewport({ width: j.w, height: j.h, deviceScaleFactor: j.dpr, isMobile: !!j.mobile, hasTouch: !!j.mobile });
      await page.goto(url, { waitUntil: flags.wait === 'load' ? 'load' : 'networkidle2', timeout: 90000 });
      await page.addStyleTag({ content: FREEZE + hide.map((s) => `${s}{display:none!important}`).join('') });
      await settle(page, j, flags);
      const buf = Buffer.from(await page.screenshot({ type: 'png', fullPage: !!j.full, captureBeyondViewport: !!j.full }));
      const folder = path.join(dir, j.platform, ...(locale ? [locale] : []));
      fs.mkdirSync(folder, { recursive: true });
      const file = path.join(folder, `${name}${j.suffix || ''}.png`);
      const png = flattenPng(buf);
      fs.writeFileSync(file, png);
      const notes = session.drain().slice(0, 3).map((m) => `page: ${m.slice(0, 140)}`);
      if (specs.length) {
        const { out, missing } = await measure(page, specs, j.dpr, j.full);
        if (Object.keys(out).length) fs.writeFileSync(file.replace(/\.png$/, '.boxes.json'), `${JSON.stringify(out, null, 2)}\n`);
        for (const m of missing) notes.push(`box ${m}: no visible element at this size`);
      }
      printFile(file, png, Date.now() - t0, notes);
      n++;
    }
  }
  return n;
}

if (isMain(import.meta)) {
  (async () => {
    const flags = parseArgs();
    const session = await openSession();
    try {
      console.log('capture');
      const n = await runCapture(session, flags);
      console.log(`  ${n} capture(s)`);
    } finally {
      await session.close();
    }
  })().catch(fail);
}
