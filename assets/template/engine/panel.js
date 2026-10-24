// Orchestrates one store image, or every image of a panorama store on one strip.
// Portrait targets (phone stores): fonts -> copy -> fit -> measure -> stage -> ornaments -> images.
// Landscape targets (web, social, desktop): layout/wide.js. Then the sharpness check and window.__ready.
// Panel keys read here: copy: 'bottom' (the copy block at the foot of the image, the stage above it: breaks
// the "headline top, stack below" rhythm once in a set), class: 'x y' (extra canvas classes for brand/theme.css).
// On Play targets the headline + sub block is measured: over 20% of the image is an issue (Play's tagline rule).
import { target, normWatermark } from '../scripts/lib/config.js';
import { q, loadConfig, ready, fail, plain } from './core/boot.js';
import { applyColors, loadFonts } from './core/theme.js';
import { waitImages } from './core/assets.js';
import { upscaleCheck } from './core/quality.js';
import { layoutCheck } from './core/checks.js';
import { accentClash } from './core/clash.js';
import { issue, issues } from './core/issues.js';
import { makeCanvas } from './layout/canvas.js';
import { buildCopy, fitCopy, copyBottom } from './layout/copy.js';
import { lineRects } from './ornaments/lines.js';
import { stageFrame } from './layout/stage.js';
import { addWatermarks } from './layout/watermark.js';
import { composeWide } from './layout/wide.js';
import { buildElements } from './elements/index.js';
import { applyOrnament } from './ornaments/index.js';
import { startBridge } from './core/edit.js';

const PLAY_TAGLINE = 0.2;

// Play: "Taglines should not take up more than 20% of the image" -> the box of the headline + sub lines
function taglineCheck(t, cv, blocks) {
  if (!/^playstore/.test(t.store.id) && t.store.platform !== 'android') return;
  for (const b of blocks) {
    const rs = [b.h1, b.sub].filter(Boolean).flatMap((n) => lineRects(n));
    if (!rs.length) continue;
    const w = (Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.left))) / cv.k;
    const h = (Math.max(...rs.map((r) => r.bottom)) - Math.min(...rs.map((r) => r.top))) / cv.k;
    const share = (w * h) / (cv.designW * cv.DH);
    if (share > PLAY_TAGLINE + 0.005) {
      issue(`the headline and sub line cover ${Math.round(share * 100)}% of the image: Google Play wants taglines under 20% `
        + '(a shorter sub, sub: { playstore: \'\', default: ... }, or a smaller layout.headlineShort)', cv.slices > 1 ? { slice: b.slice } : {});
    }
  }
}

async function portrait(t, panels, strip, icon) {
  const [W, H] = t.store.size;
  const field = (!strip && panels[0].field) || t.brand.field;
  const foot = !strip && panels[0].copy === 'bottom';
  const cls = [!strip && panels[0].class, foot && 'copy-bottom'].filter(Boolean).join(' ');
  const cv = makeCanvas({ W, H, slices: panels.length, field, grain: t.brand.grain, cls });
  await loadFonts(t.brand, panels.map((p) => `${plain(p.headline)} ${p.sub || ''}`).join(' '));
  await addWatermarks(cv, t.brand, { perSlice: panels.map((p) => (p.watermark === undefined ? undefined : normWatermark(p.watermark, t.brand))) });

  const blocks = [];
  for (const [i, p] of panels.entries()) {
    const ornament = p.ornament || t.brand.ornament;
    blocks.push({ ...(await buildCopy(p, { cv, slice: i, brand: t.brand, layout: t.layout, ornament })), ornament });
  }
  await waitImages();
  await document.fonts.ready;
  for (const b of blocks) fitCopy(b, cv, t.layout, panels[b.slice].lines);
  if (foot) {
    blocks[0].copy.style.top = 'auto';
    blocks[0].copy.style.bottom = `${cv.tall ? t.layout.bottom : t.layout.bottomShort}px`;
  }
  taglineCheck(t, cv, blocks);

  const gap = cv.tall ? t.layout.gap : t.layout.gapShort;
  const ctx = { cv, brand: t.brand, device: t.store.device, platform: t.ctx.platform, space: 'portrait', locale: t.locale,
    defaultLocale: t.ctx.defaultLocale, icon };
  let fr;
  if (strip) {
    // one stage top for the whole strip so devices line up across the seams
    fr = stageFrame({ DH: cv.DH, top: Math.max(...blocks.map((b) => copyBottom(b, cv))) + gap, panorama: true });
    await buildElements(panels.flatMap((p) => p.stage), { ...ctx, fr });
  } else if (foot) {
    // the stage fills the room above the copy block: from `gap` under the top edge to `gap` above the copy
    const g = panels[0].gap ?? gap;
    fr = stageFrame({ DH: blocks[0].copy.offsetTop - g, top: g });
    await buildElements(panels[0].stage, { ...ctx, fr });
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
  if (t.store.space !== 'landscape') accentClash(cv);
  // ui and issues per image (a panorama strip: one entry per slice); render.js writes them to render-report.json
  window.__info = { k: +cv.k.toFixed(4), DW: Math.round(cv.designW), DH: Math.round(cv.DH), tall: cv.tall, mode,
    top: Math.round(fr.top), f: +fr.f.toFixed(3), upscale, ui, issues: issues() };
  // Store Studio (?edit=1): element boxes to the workspace; a wide stack layout reflows when its top element moves
  startBridge({ cv, kind: 'panel', store: t.store.id, panels: panels.map((p) => ({ id: p.id, n: p.n })),
    copies: blocks.map((b) => ({ panel: panels[b.slice].id, node: b.copy })), reflow: mode === 'stack' });
  ready();
}

main().catch(fail);
