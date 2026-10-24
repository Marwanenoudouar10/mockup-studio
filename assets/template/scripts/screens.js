// Mock screens -> captures, for apps without a real build yet (concepts, pre-launch, portfolio pieces).
//   screens/<name>.html              one file per screen, rendered for every platform by screens/kit/kit.js
//   screens/<platform>/<name>.html   optional override of that screen for one platform
//   screens/web/<name>.html          web pages (platform=web, 1440 x 900 @2x); <meta name="kit-sizes" content="web,ipad,ios">
//                                    also captures them at those devices' viewports for responsive mockups
// -> raw/<platform>/<name>.png + raw/<platform>/<name>.boxes.json (every data-box="name", in capture pixels)
//
//   npm run screens -- [--platform ios,android,web] [--screen home,entry] [--locale es | all] [--theme dark] [--scale 2]
//   --theme forces every page. Without it, the config's screens.theme is the default ('dark' for an all-dark app,
//   so a plain run never re-captures it in light), and a page's own <html data-theme> wins over that default.
//   --platform web also captures each web page at the sizes its kit-sizes asks for (raw/ipad/, raw/ios/ ...),
//   so `--platform web --screen journal` refreshes a whole responsive trio.
//
// Sizes come from scripts/lib/stores.js PLATFORMS: iOS 440x956 pt @3x = 1320x2868, Android 360x800 dp @3x = 1080x2400,
// web 1440x900 @2x = 2880x1800. --scale N multiplies the pixel ratio (iOS @6 = 2640x5736) for hi-res portfolio
// exports, so no screen is ever drawn larger than its pixels (the render log warns when one is).
// Locales: the default locale goes to raw/<platform>/; every other config locale that screens/strings.json
// translates goes to raw/<platform>/<locale>/. --locale picks some ('all' = every config locale).
// Warns when a box is cut off by the screen edge or covered by system chrome (tab bar, FAB, toolbar, home
// indicator, or any element marked data-chrome: a pinned CTA, a banner, a custom bottom bar).
// Box radius: the element's own corner radius, else (an M3 connected list rounds its rows, not the list) the
// first child's top corner; data-box-radius="24" (CSS px) sets it by hand.
// A box in a grid or flex row is measured at its content height (align-self: start), not the height the row
// stretched it to, so a lifted dashboard card has no blank bottom; data-box-fit="cell" keeps the stretched cell.
import fs from 'node:fs';
import path from 'node:path';
import { PLATFORMS } from './lib/stores.js';
import { flattenPng } from './lib/png.js';
import { ROOT, parseArgs, list, loadConfig, isMain, fail } from './lib/cli.js';
import { openSession, capture } from './lib/session.js';
import { printFile } from './render.js';

const SRC = path.join(ROOT, 'screens');
const PHONES = ['ios', 'android'];
const WEBS = ['web', 'mac'];

const htmlNames = (dir) => (fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.html') && !f.startsWith('_')).map((f) => f.slice(0, -5))
  : []);

// [{ name, page: 'screens/home.html' }] for one platform; a platform folder overrides a shared screen.
export function screensFor(platform, withShared = true) {
  const shared = withShared ? htmlNames(SRC) : [];
  const own = htmlNames(path.join(SRC, platform));
  const names = [...new Set([...shared, ...own])].sort();
  return names.map((name) => ({ name, page: own.includes(name) ? `screens/${platform}/${name}.html` : `screens/${name}.html` }));
}

// web pages that ask for responsive captures: <meta name="kit-sizes" content="web,ipad,ios">
function sizesOf(file) {
  const m = fs.readFileSync(file, 'utf8').match(/<meta\s+name="kit-sizes"\s+content="([^"]*)"/);
  return m ? m[1].split(/[\s,]+/).filter(Boolean) : [];
}

// the device sizes the pages of one web platform ask for (kit-sizes), e.g. ['ipad', 'ios']
function sizesFor(w) {
  const out = [];
  for (const n of htmlNames(path.join(SRC, w))) for (const sz of sizesOf(path.join(SRC, w, `${n}.html`))) if (!out.includes(sz) && PLATFORMS[sz] && !WEBS.includes(sz)) out.push(sz);
  return out;
}

// [{ name, page, query }] for one platform.
//   web / mac: screens/<platform>/*.html.  Phones: the shared screens (plus overrides) when `phones` (the platform
//   was asked for, or is a default phone), and every web page whose kit-sizes lists it (platform=web at that size).
export function jobsFor(plat, phones) {
  if (WEBS.includes(plat)) return screensFor(plat, false).map((j) => ({ ...j, query: `platform=${plat}` }));
  const jobs = phones ? screensFor(plat).map((j) => ({ ...j, query: `platform=${plat}` })) : [];
  for (const w of WEBS) {
    for (const name of htmlNames(path.join(SRC, w))) {
      if (!sizesOf(path.join(SRC, w, `${name}.html`)).includes(plat)) continue;
      if (jobs.find((j) => j.name === name)) console.warn(`  warn: screens/${w}/${name}.html and a ${plat} screen share the name "${name}"`);
      jobs.push({ name, page: `screens/${w}/${name}.html`, query: `platform=${w}&size=${plat}` });
    }
  }
  return jobs;
}

// -> { plats, phones: Set of platforms that also capture the shared phone screens }
function platformsFor(asked) {
  if (asked) {
    const plats = [...asked];
    for (const w of asked.filter((p) => WEBS.includes(p))) for (const sz of sizesFor(w)) if (!plats.includes(sz)) plats.push(sz);
    return { plats, phones: new Set(asked) };
  }
  const plats = [...PHONES];
  for (const w of WEBS) {
    if (!htmlNames(path.join(SRC, w)).length) continue;
    plats.push(w);
    for (const sz of sizesFor(w)) if (!plats.includes(sz)) plats.push(sz);
  }
  return { plats, phones: new Set(PHONES) };
}

function localesFor(cfg, flags) {
  const pick = list(flags.locale);
  if (pick) return pick.includes('all') ? cfg.locales : pick;
  let dict = {};
  const file = path.join(SRC, 'strings.json');
  if (fs.existsSync(file)) {
    try {
      dict = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      throw new Error(`screens/strings.json is not valid JSON: ${err.message}`);
    }
  }
  return cfg.locales.filter((l) => l === cfg.defaultLocale || dict[l]);
}

// Box rectangles (capture pixels + corner radius) and what is wrong with them.
export function boxesOf(page, dpr) {
  return page.evaluate((k) => {
    const out = {};
    const warnings = [];
    const chrome = [...document.querySelectorAll('.tabbar, .fab, .toolbar, .indicator, [data-chrome]')].map((n) => [n, n.getBoundingClientRect()]);
    const radiusOf = (n) => {
      if (n.dataset.boxRadius !== undefined) return parseFloat(n.dataset.boxRadius) || 0;
      const own = parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0;
      const first = n.firstElementChild;
      return own || (first ? parseFloat(getComputedStyle(first).borderTopLeftRadius) || 0 : 0);
    };
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    // a grid item or flex-row item stretched by its row: its content height (the card as it would stand alone)
    const fitHeight = (n, r) => {
      const p = n.parentElement;
      if (!p || n.dataset.boxFit === 'cell' || n.style.height) return r.height;
      const ps = getComputedStyle(p);
      const stretchy = /grid/.test(ps.display) || (/flex/.test(ps.display) && !/column/.test(ps.flexDirection));
      if (!stretchy || !['auto', 'normal', 'stretch'].includes(getComputedStyle(n).alignSelf)) return r.height;
      const prev = n.style.alignSelf;
      n.style.alignSelf = 'start';
      const h = n.getBoundingClientRect().height;
      n.style.alignSelf = prev;
      return Math.min(h, r.height);
    };
    for (const n of document.querySelectorAll('[data-box]')) {
      if (!n.getClientRects().length) continue; // hidden at this size (responsive web captures)
      const r = n.getBoundingClientRect();
      const name = n.dataset.box;
      if (out[name]) warnings.push(`box "${name}" is used twice; the last one wins`);
      const rad = radiusOf(n);
      const h = fitHeight(n, r);
      out[name] = { x: Math.round(r.left * k), y: Math.round(r.top * k), w: Math.round(r.width * k), h: Math.round(h * k), r: Math.round(rad * k) };
      if (r.width < 1 || r.height < 1) warnings.push(`box "${name}" has no size`);
      else if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) warnings.push(`box "${name}" runs off the screen`);
      for (const [c, cr] of chrome) {
        if (!n.contains(c) && !c.contains(n) && overlap(r, cr) > 4) {
          warnings.push(`box "${name}" is covered by ${c.classList[0] ? `.${c.classList[0]}` : `<${c.tagName.toLowerCase()} data-chrome>`}`);
        }
      }
    }
    return { boxes: out, warnings };
  }, dpr);
}

export async function runScreens(session, cfg, flags = {}) {
  if (!fs.existsSync(SRC)) throw new Error('no screens/ folder (mock screens live in screens/<name>.html)');
  const asked = list(flags.platform);
  const { plats, phones } = platformsFor(asked);
  const only = list(flags.screen);
  const scale = flags.scale === undefined || flags.scale === true ? 1 : Number(flags.scale);
  if (!(scale >= 1 && scale <= 4)) throw new Error(`--scale ${flags.scale}: use 1 to 4`);
  const locales = localesFor(cfg, flags);
  // --theme forces every page; screens.theme is only the default (a page's own <html data-theme> wins over it)
  const forced = flags.theme && flags.theme !== true ? String(flags.theme) : null;
  const fallback = !forced && cfg.screens && cfg.screens.theme ? String(cfg.screens.theme) : null;
  const theme = forced ? `&theme=${encodeURIComponent(forced)}` : fallback ? `&themeDefault=${encodeURIComponent(fallback)}` : '';
  if (forced || fallback) console.log(`  theme ${forced || `${fallback} (screens.theme in the config)`}`);
  let n = 0;
  for (const plat of plats) {
    const spec = PLATFORMS[plat];
    if (!spec) throw new Error(`unknown platform "${plat}" (known: ${Object.keys(PLATFORMS).join(', ')})`);
    const all = jobsFor(plat, phones.has(plat));
    const pages = all.filter((s) => !only || only.includes(s.name));
    if (only && !pages.length) {
      if (!asked || !asked.includes(plat)) continue;
      throw new Error(`--screen ${flags.screen}: no such ${plat} screen (have: ${all.map((s) => s.name).join(', ') || 'none'})`);
    }
    for (const locale of locales) {
      const out = locale === cfg.defaultLocale ? path.join(ROOT, 'raw', plat) : path.join(ROOT, 'raw', plat, locale);
      fs.mkdirSync(out, { recursive: true });
      for (const { name, page, query } of pages) {
        const t0 = Date.now();
        const [w, h] = spec.css;
        const dpr = spec.dpr * scale;
        const [b] = await capture(session, `${page}?${query}&locale=${encodeURIComponent(locale)}${theme}`, {
          width: w, height: h, dpr, readyMode: 'auto',
        });
        const png = flattenPng(b);
        const file = path.join(out, `${name}.png`);
        fs.writeFileSync(file, png);
        const { boxes, warnings } = await boxesOf(session.page, dpr);
        const bfile = path.join(out, `${name}.boxes.json`);
        if (Object.keys(boxes).length) fs.writeFileSync(bfile, `${JSON.stringify(boxes, null, 2)}\n`);
        else if (fs.existsSync(bfile)) fs.unlinkSync(bfile);
        printFile(file, png, Date.now() - t0, [...session.drain(), ...warnings]);
        n++;
      }
    }
  }
  return n;
}

if (isMain(import.meta)) {
  (async () => {
    const flags = parseArgs();
    const { cfg } = await loadConfig(flags, { noPanels: true }); // screens come before the panels (Step 2 < Step 4)
    const session = await openSession();
    try {
      console.log('screens');
      const n = await runScreens(session, cfg, flags);
      console.log(`  ${n} capture(s)`);
    } finally {
      await session.close();
    }
  })().catch(fail);
}
