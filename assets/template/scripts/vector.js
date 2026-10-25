// Editable vector files of the store images: final/vector/<locale>/<target>/NN.svg + NN.pdf, and the feature
// graphic as final/vector/<locale>/playstore/feature-graphic.{svg,pdf}, plus final/vector/vector-report.json.
//   npm run vector -- [--store appstore,og] [--locale en] [--panel 2] [--config file] [--out final]
//                     [--svg-only | --pdf-only] [--fonts embed|none] [--shadows filter|none] [--outline-text]
//   npm run export -- --vector   the same step after the PNGs, with the same Chrome
// SVG (engine/vector/): layered, named groups, text as text with its fonts embedded, no <foreignObject>: drag it
// into Figma. PDF (scripts/lib/vector-pdf.js): Chrome's print, for Illustrator, Affinity and print. An editable
// project (screens.mode 'live') gets its mock screens as real vector layers; real captures stay images inside.
// --outline-text turns the SVG's text into paths (scripts/lib/outline.js, needs fontkit): for tools that lack the
// fonts. The limits of each format, and what Figma imports well, are in the skill's references/editable.md.
import fs from 'node:fs';
import path from 'node:path';
import { pad2, panelsFor } from './lib/config.js';
import { parseArgs, list, loadConfig, outDir, rel, kb, isMain, fail } from './lib/cli.js';
import { openSession, open } from './lib/session.js';
import { pick, storePanels, pageFlags } from './render.js';
import { printPdf, pdfInfo } from './lib/vector-pdf.js';

const REPORT = 'vector-report.json';

function optionsOf(flags) {
  const fonts = flags.fonts && flags.fonts !== true ? String(flags.fonts) : 'embed';
  const shadows = flags.shadows && flags.shadows !== true ? String(flags.shadows) : 'filter';
  if (!['embed', 'none'].includes(fonts)) throw new Error(`--fonts ${fonts}: use embed or none`);
  if (!['filter', 'none'].includes(shadows)) throw new Error(`--shadows ${shadows}: use filter or none`);
  const outline = !!flags['outline-text'];
  if (outline && fonts === 'none') throw new Error('--outline-text needs the fonts (leave --fonts at embed)');
  return { fonts, shadows, svg: !flags['pdf-only'], pdf: !flags['svg-only'], outline };
}

// a fresh run of a target: its old numbered files of the kinds this run writes go (--pdf-only keeps the SVGs)
const cleanDir = (dir, o) => {
  fs.mkdirSync(dir, { recursive: true });
  const kinds = [o.svg && 'svg', o.pdf && 'pdf'].filter(Boolean).join('|');
  for (const f of fs.readdirSync(dir)) if (new RegExp(`^\\d+\\.(${kinds})$`, 'i').test(f)) fs.unlinkSync(path.join(dir, f));
};

// one loaded page -> files. names: one per image (a panorama strip: one per slice)
async function writePage(session, o, { width, height, names, dir }, report) {
  const { page } = session;
  const t0 = Date.now();
  const slices = names.length;
  const per = width / slices;
  const lines = [];
  if (o.pdf) {
    for (let i = 0; i < slices; i++) {
      const buf = await printPdf(page, { width: per, height, slices, index: i });
      const file = path.join(dir, `${names[i]}.pdf`);
      fs.writeFileSync(file, buf);
      const info = pdfInfo(buf) || {};
      report[rel(file)] = { bytes: buf.length, pages: info.pages, size: [info.width, info.height] };
      lines.push([file, buf.length, `PDF ${info.pages} page, ${Math.round(info.width)}x${Math.round(info.height)} pt`]);
    }
  }
  if (o.svg) {
    const res = await page.evaluate((opts) => window.__vector(opts), { width, height, slices, fonts: o.fonts, shadows: o.shadows, outline: o.outline });
    let outline = null;
    if (o.outline) outline = (await import('./lib/outline.js')).outlineText;
    for (let i = 0; i < slices; i++) {
      let svg = res.files[i];
      const r = res.reports[i];
      if (outline) ({ svg } = await outline(svg, r));
      const file = path.join(dir, `${names[i]}.svg`);
      fs.writeFileSync(file, svg);
      report[rel(file)] = { ...r, bytes: Buffer.byteLength(svg) };
      lines.push([file, Buffer.byteLength(svg), `SVG ${r.texts} texts, ${r.groups} layers, fonts ${r.fonts.map((f) => f.family).join(' ') || 'none'}`]);
    }
  }
  const ms = Date.now() - t0;
  lines.forEach(([file, bytes, what], i) => console.log(`  ${rel(file).padEnd(46)} ${what.padEnd(44)} ${kb(bytes).padStart(8)}  ${i ? '' : `${(ms / 1000).toFixed(1)}s`}`));
  for (const w of session.drain()) console.log(`      warn: ${w}`);
}

export async function runVector(session, cfg, cfgRel, flags = {}) {
  const o = optionsOf(flags);
  const { stores, locales } = pick(cfg, flags);
  const root = path.join(outDir(flags), 'vector');
  const report = {};
  let n = 0;
  const load = (url, w, h) => open(session, url, { width: w, height: h, dpr: 1 });
  for (const locale of locales) {
    for (const st of stores) {
      const ps = storePanels(cfg, st, { ...flags, quiet: true });
      if (!ps.length) continue;
      const dir = path.join(root, locale, st.id);
      if (flags.panel) fs.mkdirSync(dir, { recursive: true });
      else cleanDir(dir, o);
      const [W, H] = st.size;
      const base = `engine/panel.html?config=${encodeURIComponent(cfgRel)}&store=${st.id}&locale=${locale}${pageFlags(flags)}`;
      if (st.panorama) { // one strip, every image of it (--panel picks nothing here)
        const all = panelsFor(cfg, st).map((p, i) => i + 1);
        await load(`${base}&strip=1`, W * all.length, H);
        await writePage(session, o, { width: W * all.length, height: H, names: all.map(pad2), dir }, report);
        n += all.length;
        continue;
      }
      for (const p of ps) {
        await load(`${base}&panel=${p.id}`, W, H);
        await writePage(session, o, { width: W, height: H, names: [pad2(p.n)], dir }, report);
        n++;
      }
    }
    if (cfg.feature && (!list(flags.store) || list(flags.store).includes('playstore')) && !flags.panel) {
      const dir = path.join(root, locale, 'playstore');
      fs.mkdirSync(dir, { recursive: true });
      await load(`engine/feature.html?config=${encodeURIComponent(cfgRel)}&locale=${locale}${pageFlags(flags)}`, 1024, 500);
      await writePage(session, o, { width: 1024, height: 500, names: ['feature-graphic'], dir }, report);
      n++;
    }
  }
  const file = path.join(root, REPORT);
  let all = {};
  try { all = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ ...all, ...report }, null, 2)}\n`);
  return n;
}

if (isMain(import.meta)) {
  (async () => {
    const flags = parseArgs();
    const o = optionsOf(flags); // a bad option fails before Chrome starts
    const { cfg, rel: cfgRel } = await loadConfig(flags);
    const session = await openSession();
    try {
      console.log(`vector (${cfgRel}, ${cfg.screens.mode === 'live' ? 'editable: live screens' : 'screenshots: captures as images'}) -> ${rel(outDir(flags))}/vector/`);
      const n = await runVector(session, cfg, cfgRel, flags);
      console.log(`  ${n} image(s) as ${[o.svg && 'SVG', o.pdf && 'PDF'].filter(Boolean).join(' + ')}`);
    } finally {
      await session.close();
    }
  })().catch(fail);
}
