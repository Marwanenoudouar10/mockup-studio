// Renders the store images: final/<locale>/<store>/01.png ... (24-bit RGB, no alpha).
//   node scripts/render.js [--store appstore,og] [--locale en] [--panel 2] [--out final] [--config file] [--scale 2|3]
// Each target renders its own panels (same space, `only` filter) numbered 01, 02 ... in config order.
// --panel N is the CONFIG panel number (its position in `panels`, as in layout.json), not the image number of
//   a target: on og, whose one image is panel 4, use --panel 4 (a note says so when N is not on the target).
// Another --config without --out writes to out/qa/<config name>/, never into final/.
// Panorama stores render ONE strip per locale and clip it into the images.
// --scale N: the hi-res PORTFOLIO export, every image at N x its store size (deviceScaleFactor N) into
//   final/portfolio/<locale>/<store>/ (never mixed with the upload folders).
// Every page runs the sharpness and layout checks; findings go to the log and to <out>/render-report.json
// ({ scale, upscale, ui, issues } per file, read by validate). Untranslated copy is printed per locale.
import fs from 'node:fs';
import path from 'node:path';
import { pad2, panelsFor } from './lib/config.js';
import { pngInfo, flattenPng } from './lib/png.js';
import { jpegInfo } from './lib/jpeg.js';
import { parseArgs, list, loadConfig, outDir, rel, kb, isMain, fail } from './lib/cli.js';
import { openSession, capture } from './lib/session.js';
import { recordQuality } from './lib/report.js';
import { textFindings } from './lib/locales.js';

export function pick(cfg, flags) {
  const stores = list(flags.store);
  const locales = list(flags.locale);
  for (const s of stores || []) if (!cfg.stores.find((x) => x.id === s)) throw new Error(`store "${s}" is not in the config stores`);
  return {
    stores: stores ? cfg.stores.filter((s) => stores.includes(s.id)) : cfg.stores,
    locales: locales || cfg.locales,
  };
}

export function scaleOf(flags) {
  const s = flags.scale === undefined || flags.scale === true ? 1 : Number(flags.scale);
  if (![1, 2, 3, 4].includes(s)) throw new Error(`--scale ${flags.scale}: use 2 or 3 (4 at most)`);
  return s;
}

// final/<locale>/<store>  or, for --scale N, final/portfolio/<locale>/<store>
export function storeDir(flags, locale, id) {
  const s = scaleOf(flags);
  return s > 1 ? path.join(outDir(flags), 'portfolio', locale, id) : path.join(outDir(flags), locale, id);
}

export function printFile(file, buf, ms, warnings = []) {
  const i = pngInfo(buf) || jpegInfo(buf);
  const kind = i ? `${i.format === 'jpg' ? 'JPEG ' : ''}${i.colorName} ${i.bits}-bit` : '?';
  const dims = i ? `${i.width}x${i.height}` : '';
  console.log(`  ${rel(file).padEnd(44)} ${dims.padEnd(10)} ${kind.padEnd(12)} ${kb(buf.length).padStart(8)}  ${(ms / 1000).toFixed(1)}s`);
  for (const w of warnings) console.log(`      warn: ${w}`);
}

const NOTED = new Set(); // a --panel note is printed once per store, not once per locale

// [{ id, n }] for one store: its panels, cut to one for single-image targets, filtered by --panel.
export function storePanels(cfg, st, flags = {}) {
  let ps = panelsFor(cfg, st).map((p, i) => ({ id: p.id, n: i + 1 }));
  if (st.max === 1 && ps.length > 1) {
    console.log(`  note: ${st.id} takes 1 image: panel ${ps[0].id} (set only: ['${st.id}'] on the panel you want)`);
    ps = ps.slice(0, 1);
  }
  if (flags.panel) {
    const n = Number(flags.panel);
    if (!cfg.panels[n - 1]) throw new Error(`--panel ${flags.panel}: the config has ${cfg.panels.length} panels`);
    const all = ps;
    ps = ps.filter((p) => p.id === n);
    if (!ps.length && !flags.quiet && !NOTED.has(`${st.id}|${n}`)) {
      NOTED.add(`${st.id}|${n}`);
      const shown = all.map((p) => `panel ${p.id} as image ${pad2(p.n)}`).join(', ') || 'no panel';
      console.log(`  note: --panel ${n} is the config's panel ${n}, which ${st.id} does not show (${st.id} shows ${shown})`);
    }
  }
  return ps;
}

function cleanDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^\d+\.(png|jpe?g)$/i.test(f)) fs.unlinkSync(path.join(dir, f));
}

// per locale, once per run: lines of copy the config does not translate (scripts/lib/locales.js)
function printUntranslated(cfg, locales) {
  const found = textFindings(cfg).filter((f) => (f.locale ? locales.includes(f.locale) : locales.some((l) => l !== cfg.defaultLocale)));
  for (const f of found) console.log(`  warn: ${f.label}: ${f.text}`);
}

const issuesFor = (info, slice) => ((info && info.issues) || [])
  .filter((x) => x.slice === undefined || x.slice === slice).map((x) => x.text);

export async function runRender(session, cfg, cfgRel, flags = {}) {
  const { stores, locales } = pick(cfg, flags);
  const scale = scaleOf(flags);
  const out = outDir(flags);
  const report = {};
  let count = 0;
  if (scale === 1) printUntranslated(cfg, locales);
  for (const locale of locales) {
    for (const st of stores) {
      const ps = storePanels(cfg, st, flags);
      if (!ps.length) {
        if (!flags.panel) console.log(`  ${st.id}: no panels for this target (space ${st.space}): skipped`);
        continue;
      }
      const dir = storeDir(flags, locale, st.id);
      if (flags.panel) fs.mkdirSync(dir, { recursive: true });
      else cleanDir(dir);
      const [W, H] = st.size;
      const base = `engine/panel.html?config=${encodeURIComponent(cfgRel)}&store=${st.id}&locale=${locale}`;
      const save = (b, p, ms, warn, info, slice = 0) => {
        const file = path.join(dir, `${pad2(p.n)}.png`);
        const png = flattenPng(b);
        fs.writeFileSync(file, png);
        printFile(file, png, ms, warn);
        const ui = info && info.ui ? !!info.ui[slice] : null;
        report[rel(file)] = { scale, upscale: (info && info.upscale) || [], ui, issues: issuesFor(info, slice) };
        count++;
      };
      if (st.panorama) {
        const t0 = Date.now();
        const all = panelsFor(cfg, st);
        const clips = ps.map((p) => ({ x: (p.n - 1) * W, y: 0, width: W, height: H }));
        const bufs = await capture(session, `${base}&strip=1`, { width: W * all.length, height: H, clips, dpr: scale });
        const info = await session.info();
        const warn = session.drain();
        bufs.forEach((b, i) => save(b, ps[i], i === 0 ? Date.now() - t0 : 0, i === 0 ? warn : [], info, ps[i].n - 1));
        continue;
      }
      for (const p of ps) {
        const t0 = Date.now();
        const [b] = await capture(session, `${base}&panel=${p.id}`, { width: W, height: H, dpr: scale });
        const info = await session.info();
        save(b, p, Date.now() - t0, session.drain(), info);
      }
    }
  }
  recordQuality(out, report);
  return count;
}

if (isMain(import.meta)) {
  (async () => {
    const flags = parseArgs();
    const { cfg, rel: cfgRel } = await loadConfig(flags);
    const session = await openSession();
    try {
      const s = scaleOf(flags);
      console.log(`render (${cfgRel}) -> ${rel(outDir(flags))}/${s > 1 ? `portfolio/ at ${s}x` : ''}`);
      const n = await runRender(session, cfg, cfgRel, flags);
      console.log(`  ${n} image(s)`);
    } finally {
      await session.close();
    }
  })().catch(fail);
}
