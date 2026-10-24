// Checks every file in final/ against the target rules (scripts/lib/stores.js + targets.js); exits 1 on a problem.
//   node scripts/validate.js [--out final] [--config file] [--strict]
// Upload folders final/<locale>/<target>/: exact accepted sizes (or Play's size range), format, alpha,
//   bit depth, max bytes, images per target (min/max), feature graphic 1024x500, icons. A target whose size is
//   only a recommendation (og, social, Product Hunt...) warns on another size instead of failing.
// Portfolio folder final/portfolio/<locale>/<target>/ (render --scale N): N x the target size, no store limits.
// 24-bit: a target without alpha takes PNG colour type 2 (RGB) or a 3-channel JPEG only (no palette, no grey).
// Render report (final/render-report.json): screens drawn larger than their pixels, and the pages' issues (a crop
//   outside its capture, a screen not localized, a card cut by the edge or shown twice, an empty panorama image)
//   -> warnings (--strict turns every warning into a problem). Missing outputs are warnings.
// Stale output: a locale or target folder the config does not render (the demo's, or a dropped language) is a
//   warning and is not checked: it must not reach the delivery (npm run export removes it).
// Copy: lines not translated for a locale the config renders (scripts/lib/locales.js) -> warnings.
// Store content (scripts/lib/policy.js): rankings, prices, calls to action, other stores' names in the copy,
//   too few images with real UI (measured on the renders) -> warnings. Play sets under 4 images get a note.
import fs from 'node:fs';
import path from 'node:path';
import { STORES, ASSETS } from './lib/stores.js';
import { panelsFor, pad2 } from './lib/config.js';
import { pngInfo } from './lib/png.js';
import { jpegInfo } from './lib/jpeg.js';
import { readQuality } from './lib/report.js';
import { policyFindings } from './lib/policy.js';
import { textFindings } from './lib/locales.js';
import { staleOutputs } from './lib/stale.js';
import { parseArgs, list, loadConfig, outDir, rel, kb, isMain, fail } from './lib/cli.js';

const IMG = /\.(png|jpe?g)$/i;
const SKIP = new Set(['icons', 'brand', 'portfolio']);

function inspect(file) {
  const buf = fs.readFileSync(file);
  const i = pngInfo(buf) || jpegInfo(buf);
  return i ? { ...i, bytes: buf.length } : { format: null, bytes: buf.length };
}

function sizeOk(i, r, k = 1) {
  if (r.sizes) return r.sizes.some(([w, h]) => w * k === i.width && h * k === i.height);
  if (r.range && k === 1) {
    const lo = Math.min(i.width, i.height);
    const hi = Math.max(i.width, i.height);
    return lo >= r.range.min && hi <= r.range.max && hi <= lo * r.range.ratio;
  }
  return r.size[0] * k === i.width && r.size[1] * k === i.height;
}

function sizeRule(r, k = 1) {
  if (r.sizes) return r.sizes.map(([w, h]) => `${w * k}x${h * k}`).join(', ');
  if (r.range && k === 1) return `sides ${r.range.min}-${r.range.max}px, long side <= ${r.range.ratio}x short side`;
  return `${r.size[0] * k}x${r.size[1] * k}`;
}

// -> { i, bad: [problems], soft: [warnings] }. k = portfolio scale (null = work it out from the file).
export function checkFile(file, r, { portfolio = false } = {}) {
  const i = inspect(file);
  const bad = [];
  const soft = [];
  if (!i.format) return { i, bad: ['not a PNG or JPEG file'], soft };
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpeg', 'jpg');
  if (ext !== i.format) bad.push(`named .${ext} but the file is ${i.format}`);
  if (!r.formats.includes(i.format)) bad.push(`${i.format} not accepted (${r.formats.join(', ')})`);
  if (portfolio) {
    const k = [2, 3, 4].find((s) => sizeOk(i, r, s));
    if (!k) bad.push(`${i.width}x${i.height} is not 2x, 3x or 4x the target (${sizeRule(r, 2)} at 2x)`);
  } else if (!sizeOk(i, r)) {
    (r.strict === false ? soft : bad).push(`${i.width}x${i.height} not ${r.strict === false ? 'the recommended' : 'accepted'} (${sizeRule(r)})`);
  }
  if (!r.alpha && i.alpha) bad.push('has transparency: flatten to 24-bit RGB');
  else if (!r.alpha && i.format === 'png' && i.colorType !== 2) bad.push(`${i.colorName} PNG (colour type ${i.colorType}): save as 24-bit RGB`);
  if (!r.alpha && i.format === 'jpg' && i.components === 1) bad.push('grayscale JPEG: save as RGB');
  if (r.needsAlpha && i.colorType !== 6) bad.push('must be a 32-bit PNG (RGBA)');
  if (i.format === 'png' && i.bitDepth !== 8) bad.push(`${i.bitDepth} bits per channel (use 8)`);
  if (i.format === 'jpg' && i.components === 4) bad.push('CMYK JPEG (use RGB)');
  if (!portfolio && r.maxBytes && i.bytes > r.maxBytes) bad.push(`${kb(i.bytes)} is over the ${kb(r.maxBytes)} limit`);
  return { i, bad, soft };
}

export function runValidate(cfg, flags = {}) {
  const out = outDir(flags);
  const strict = !!flags.strict;
  const quality = readQuality(out);
  const rows = [];
  let files = 0;
  let problems = 0;
  let warnings = 0;
  const line = (status, label, text) => rows.push(`  ${status.padEnd(5)} ${label.padEnd(48)} ${text}`);
  const warn = (label, text) => {
    if (strict) { problems++; line('FAIL', label, text); } else { warnings++; line('warn', label, text); }
  };
  const one = (file, r, opts) => {
    files++;
    const { i, bad, soft } = checkFile(file, r, opts);
    const desc = i.format ? `${i.width}x${i.height} ${i.colorName} ${i.bits}-bit ${kb(i.bytes)}` : '';
    if (bad.length) { problems++; line('FAIL', rel(file), bad.join('; ')); } else line('ok', rel(file), desc);
    for (const s of soft) warn(rel(file), s);
    const q = quality[rel(file)] || {};
    for (const u of q.upscale || []) warn(rel(file), `soft: ${u.what} drawn ${u.ratio}x larger than its pixels`);
    for (const t of q.issues || []) warn(rel(file), t);
  };
  if (!fs.existsSync(out)) return { ok: false, rows: [`  nothing to check: ${rel(out)}/ does not exist`], files, problems: 1, warnings };
  const stale = new Set();
  for (const f of staleOutputs(cfg, out)) {
    stale.add(f.file);
    warn(rel(f.file), `${f.why}: stale, it must not be delivered (npm run export removes it)`);
  }
  const folder = (ldir, opts) => {
    for (const sid of fs.readdirSync(ldir).sort()) {
      const sdir = path.join(ldir, sid);
      if (!fs.statSync(sdir).isDirectory() || stale.has(sdir)) continue;
      const r = cfg.stores.find((s) => s.id === sid) || STORES[sid];
      if (!r) { warn(rel(sdir), 'unknown target folder: skipped'); continue; }
      const imgs = fs.readdirSync(sdir).filter((f) => IMG.test(f)).sort();
      const feature = imgs.filter((f) => /^feature-graphic\./.test(f));
      const shots = imgs.filter((f) => !feature.includes(f));
      for (const f of shots) one(path.join(sdir, f), r, opts);
      for (const f of feature) one(path.join(sdir, f), ASSETS['feature-graphic'], opts);
      if (opts.portfolio || !shots.length) continue;
      const n = shots.length;
      if (n < r.min || n > r.max) { problems++; line('FAIL', rel(sdir), `${n} images, the target takes ${r.min} to ${r.max}`); }
      else line('ok', rel(sdir), `${n} images (${r.min} to ${r.max} allowed)`);
      if (r.promo && n < r.promo) line('note', rel(sdir), `${n} images: Play asks for ${r.promo}+ (9:16, 1080 px or more) to be eligible for promotion`);
    }
  };

  for (const locale of fs.readdirSync(out).sort()) {
    const ldir = path.join(out, locale);
    if (SKIP.has(locale) || stale.has(ldir) || !fs.statSync(ldir).isDirectory()) continue; // brand/: npm run brand
    folder(ldir, {});
  }
  const pdir = path.join(out, 'portfolio');
  if (fs.existsSync(pdir)) {
    rows.push(`  portfolio (hi-res, not for upload): ${rel(pdir)}/`);
    for (const locale of fs.readdirSync(pdir).sort()) {
      const ldir = path.join(pdir, locale);
      if (!stale.has(ldir) && fs.statSync(ldir).isDirectory()) folder(ldir, { portfolio: true });
    }
  }
  const icons = path.join(out, 'icons');
  for (const [f, key] of [['appstore-1024.png', 'appstore-icon'], ['playstore-512.png', 'playstore-icon']]) {
    const file = path.join(icons, f);
    if (fs.existsSync(file)) one(file, ASSETS[key]);
    else warn(rel(file), 'missing (npm run icons)');
  }
  const locales = list(flags.locale) || cfg.locales;
  for (const locale of locales) for (const st of cfg.stores) {
    if (panelsFor(cfg, st).length && !fs.existsSync(path.join(out, locale, st.id))) warn(`${rel(out)}/${locale}/${st.id}`, 'not rendered');
  }
  if (cfg.feature) for (const locale of locales) {
    const file = path.join(out, locale, 'playstore', 'feature-graphic.png');
    if (!fs.existsSync(file) && !fs.existsSync(file.replace(/png$/, 'jpg'))) warn(rel(file), 'missing (npm run feature)');
  }
  for (const f of textFindings(cfg)) if (!f.locale || locales.includes(f.locale)) warn(f.label, f.text);
  const uiOf = (id, locale, n) => {
    const q = quality[rel(path.join(out, locale, id, `${pad2(n)}.png`))];
    return q && typeof q.ui === 'boolean' ? q.ui : null;
  };
  try {
    for (const f of policyFindings(cfg, { uiOf })) warn(f.label, f.text);
  } catch (err) {
    warn('copy', `store content check skipped: ${err.message}`);
  }
  rows.push(`  ${files} file(s) checked, ${problems} problem(s), ${warnings} warning(s)`);
  return { ok: problems === 0, rows, files, problems, warnings };
}

if (isMain(import.meta)) {
  (async () => {
    const flags = parseArgs();
    const { cfg } = await loadConfig(flags);
    const v = runValidate(cfg, flags);
    console.log(`validate ${rel(outDir(flags))}/`);
    console.log(v.rows.join('\n'));
    process.exit(v.ok ? 0 : 1);
  })().catch(fail);
}
