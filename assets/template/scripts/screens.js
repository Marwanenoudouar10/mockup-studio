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
// Box rules (radius, content height in a stretched row, cut-off and covered-by-chrome warnings): screens/kit/boxes.js,
// shared with the live screens of an editable project (engine/core/live.js), so a lift finds the same card both ways.
// Page rules (which file a name and platform capture): scripts/lib/pages.js, shared the same way.
// edits.json next to the config (scripts/lib/edits.js) is applied by the kit before the capture; a skipped edit
// prints as a warn: line and lands in raw/screens-report.json, which validate lists. --edits 0 captures without them.
// The same report keeps, per capture in another language than the default one, the strings strings.json does not
// translate there (screens/kit/i18n.js: kit.untranslated()).
// An editable project (screens.mode 'live') still captures: brand boards, Mockup Studio thumbnails and screens
// without a page (real captures) use raw/.
import fs from 'node:fs';
import path from 'node:path';
import { PLATFORMS } from './lib/stores.js';
import { flattenPng } from './lib/png.js';
import { ROOT, parseArgs, list, loadConfig, isMain, fail } from './lib/cli.js';
import { openSession, capture } from './lib/session.js';
import { screenPages } from './lib/server.js';
import { pagesFor, sizedPlatforms, hasPages, WEBS, PHONES } from './lib/pages.js';
import { editsFile } from './lib/edits.js';
import { untranslatedText } from './lib/locales.js';
import { printFile } from './render.js';

const SRC = path.join(ROOT, 'screens');
const REPORT = path.join(ROOT, 'raw', 'screens-report.json');
const OLD_REPORT = path.join(ROOT, 'raw', 'edits-report.json'); // its name before translations joined it

// [{ name, page, query }] for one platform (scripts/lib/pages.js: the same rules as the live screens).
//   web / mac: screens/<platform>/*.html.  Phones: the shared screens (plus overrides) when `phones` (the platform
//   was asked for, or is a default phone), and every web page whose kit-sizes lists it (platform=web at that size).
export function jobsFor(plat, phones, listing = screenPages(ROOT)) {
  const jobs = pagesFor(listing, plat, { phones });
  for (const j of jobs.filter((x) => x.clash)) console.warn(`  warn: ${j.page} and a ${plat} screen share the name "${j.name}"`);
  return jobs.map(({ clash, ...j }) => j);
}

// -> { plats, phones: Set of platforms that also capture the shared phone screens }
function platformsFor(asked, listing) {
  if (asked) {
    const plats = [...asked];
    for (const w of asked.filter((p) => WEBS.includes(p))) for (const sz of sizedPlatforms(listing, w)) if (!plats.includes(sz)) plats.push(sz);
    return { plats, phones: new Set(asked) };
  }
  const plats = [...PHONES];
  for (const w of WEBS) {
    if (!hasPages(listing, w)) continue;
    plats.push(w);
    for (const sz of sizedPlatforms(listing, w)) if (!plats.includes(sz)) plats.push(sz);
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

// Box rectangles (capture pixels + corner radius) and what is wrong with them: screens/kit/boxes.js, the same
// code the live screens use (a page without the kit imports it).
export function boxesOf(page, dpr) {
  return page.evaluate(async (k) => {
    const m = window.kit && window.kit.boxes ? window.kit : await import('/screens/kit/boxes.js');
    return m.boxes(k);
  }, dpr);
}

// what the page just captured says about itself: edits.json findings (screens/kit/edits.js: a skipped or
// re-anchored edit) and, in another language than the default one, the strings left untranslated
const pageIssuesOf = (page, name, locale, isDefault) => page.evaluate((other) => {
  const k = window.kit;
  if (!k) return { edits: [], left: [] };
  return { edits: k.editIssues ? k.editIssues() : [], left: other && k.untranslated ? k.untranslated() : [] };
}, !isDefault).then(({ edits, left }) => [...edits, ...(left.length ? [untranslatedText(name, locale, left)] : [])]).catch(() => []);

// raw/screens-report.json: { "raw/ios/es/home.png": ["edits.json: home > ... skipped", "screen \"home\" (es): ..."] },
// read by validate
function writeReport(found) {
  let all = {};
  for (const f of [OLD_REPORT, REPORT]) try { Object.assign(all, JSON.parse(fs.readFileSync(f, 'utf8'))); } catch { /* none yet */ }
  fs.rmSync(OLD_REPORT, { force: true });
  for (const [k, v] of Object.entries(found)) if (v.length) all[k] = v; else delete all[k];
  if (!Object.keys(all).length) return fs.rmSync(REPORT, { force: true });
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  return fs.writeFileSync(REPORT, `${JSON.stringify(all, null, 2)}\n`);
}

export async function runScreens(session, cfg, flags = {}) {
  if (!fs.existsSync(SRC)) throw new Error('no screens/ folder (mock screens live in screens/<name>.html)');
  const asked = list(flags.platform);
  const listing = screenPages(ROOT);
  const { plats, phones } = platformsFor(asked, listing);
  const only = list(flags.screen);
  const scale = flags.scale === undefined || flags.scale === true ? 1 : Number(flags.scale);
  if (!(scale >= 1 && scale <= 4)) throw new Error(`--scale ${flags.scale}: use 1 to 4`);
  const locales = localesFor(cfg, flags);
  // --theme forces every page; screens.theme is only the default (a page's own <html data-theme> wins over it)
  const forced = flags.theme && flags.theme !== true ? String(flags.theme) : null;
  const fallback = !forced && cfg.screens && cfg.screens.theme ? String(cfg.screens.theme) : null;
  const theme = forced ? `&theme=${encodeURIComponent(forced)}` : fallback ? `&themeDefault=${encodeURIComponent(fallback)}` : '';
  if (forced || fallback) console.log(`  theme ${forced || `${fallback} (screens.theme in the config)`}`);
  // edits.json next to the config (scripts/lib/edits.js): applied by the kit, so the captures show the edits too
  const edits = `&edits=${encodeURIComponent(flags.edits === '0' ? 'none' : editsFile(cfg.configRel))}`;
  const report = {};
  let n = 0;
  for (const plat of plats) {
    const spec = PLATFORMS[plat];
    if (!spec) throw new Error(`unknown platform "${plat}" (known: ${Object.keys(PLATFORMS).join(', ')})`);
    const all = jobsFor(plat, phones.has(plat), listing);
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
        const [b] = await capture(session, `${page}?${query}&locale=${encodeURIComponent(locale)}${theme}${edits}`, {
          width: w, height: h, dpr, readyMode: 'auto',
        });
        const png = flattenPng(b);
        const file = path.join(out, `${name}.png`);
        fs.writeFileSync(file, png);
        const { boxes, warnings } = await boxesOf(session.page, dpr);
        const bfile = path.join(out, `${name}.boxes.json`);
        if (Object.keys(boxes).length) fs.writeFileSync(bfile, `${JSON.stringify(boxes, null, 2)}\n`);
        else if (fs.existsSync(bfile)) fs.unlinkSync(bfile);
        const own = await pageIssuesOf(session.page, name, locale, locale === cfg.defaultLocale);
        report[path.relative(ROOT, file).split(path.sep).join('/')] = own;
        printFile(file, png, Date.now() - t0, [...session.drain(), ...warnings, ...own]);
        n++;
      }
    }
  }
  writeReport(report);
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
