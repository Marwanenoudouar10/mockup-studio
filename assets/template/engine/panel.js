// Orchestrates one store image, or every image of a panorama store on one strip.
// Portrait targets (phone stores): fonts -> copy -> fit -> measure -> stage -> ornaments -> images.
// Landscape targets (web, social, desktop): layout/wide.js. Then the sharpness check and window.__ready.
import { target } from '../scripts/lib/config.js';
import { q, loadConfig, ready, fail, plain } from './core/boot.js';
import { applyColors, loadFonts } from './core/theme.js';
import { waitImages } from './core/assets.js';
import { upscaleCheck } from './core/quality.js';
import { layoutCheck } from './core/checks.js';
import { issues } from './core/issues.js';
import { makeCanvas } from './layout/canvas.js';
import { buildCopy, fitCopy, copyBottom } from './layout/copy.js';
import { stageFrame } from './layout/stage.js';
import { addWatermarks } from './layout/watermark.js';
import { composeWide } from './layout/wide.js';
import { buildElements } from './elements/index.js';
import { applyOrnament } from './ornaments/index.js';
import { startBridge } from './core/edit.js';

async function portrait(t, panels, strip, icon) {
  const [W, H] = t.store.size;
  const field = (!strip && panels[0].field) || t.brand.field;
  const cv = makeCanvas({ W, H, slices: panels.length, field, grain: t.brand.grain });
  await loadFonts(t.brand, panels.map((p) => `${plain(p.headline)} ${p.sub || ''}`).join(' '));
  await addWatermarks(cv, t.brand);

  const blocks = [];
  for (const [i, p] of panels.entries()) {
    const ornament = p.ornament || t.brand.ornament;
    blocks.push({ ...(await buildCopy(p, { cv, slice: i, brand: t.brand, layout: t.layout, ornament })), ornament });
  }
  await waitImages();
  await document.fonts.ready;
  for (const b of blocks) fitCopy(b, cv, t.layout, panels[b.slice].lines);

  const gap = cv.tall ? t.layout.gap : t.layout.gapShort;
  const ctx = { cv, brand: t.brand, device: t.store.device, platform: t.ctx.platform, space: 'portrait', locale: t.locale,
    defaultLocale: t.ctx.defaultLocale, icon };
  let fr;
  if (strip) {
    // one stage top for the whole strip so devices line up across the seams
    fr = stageFrame({ DH: cv.DH, top: Math.max(...blocks.map((b) => copyBottom(b, cv))) + gap, panorama: true });
    await buildElements(panels.flatMap((p) => p.stage), { ...ctx, fr });
  } else {
    fr = stageFrame({ DH: cv.DH, top: copyBottom(blocks[0], cv) + (panels[0].gap ?? gap) });
    await buildElements(panels[0].stage, { ...ctx, fr });
  }
  for (const b of blocks) applyOrnament(b.ornament, b, cv, { rtl: t.dir === 'rtl' });
  return { cv, fr, blocks };
}

async function main() {
  const cfg = await loadConfig();
  const t = target(cfg, { store: q.get('store') || cfg.stores[0].id, locale: q.get('locale') });
  const strip = q.get('strip') === '1';
  const n = Number(q.get('panel') || (t.panels[0] && t.panels[0].id) || 1);
  const panels = strip ? t.panels : t.panels.filter((p) => p.id === n);
  if (!panels[0]) throw new Error(`panel ${n} is not rendered for ${t.store.id} (its panels: ${t.panels.map((p) => p.id).join(', ') || 'none'})`);

  document.documentElement.lang = t.locale;
  document.documentElement.dir = t.dir;
  applyColors(t.brand.colors);
  const icon = cfg.icon && cfg.icon.src;
  const { cv, fr, mode, blocks } = t.store.space === 'landscape'
    ? await composeWide(t, panels[0], { icon })
    : await portrait(t, panels, strip, icon);
  await waitImages();
  await document.fonts.ready;
  const upscale = upscaleCheck(cv);
  const { ui } = layoutCheck(cv);
  // ui and issues per image (a panorama strip: one entry per slice); render.js writes them to render-report.json
  window.__info = { k: +cv.k.toFixed(4), DW: Math.round(cv.designW), DH: Math.round(cv.DH), tall: cv.tall, mode,
    top: Math.round(fr.top), f: +fr.f.toFixed(3), upscale, ui, issues: issues() };
  // Store Studio (?edit=1): element boxes to the workspace; a wide stack layout reflows when its top element moves
  startBridge({ cv, kind: 'panel', store: t.store.id, panels: panels.map((p) => ({ id: p.id, n: p.n })),
    copies: blocks.map((b) => ({ panel: panels[b.slice].id, node: b.copy })), reflow: mode === 'stack' });
  ready();
}

main().catch(fail);
