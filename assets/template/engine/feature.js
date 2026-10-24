// Google Play feature graphic (1024 x 500): copy on one side, devices on the other.
// Stage coords here are plain pixels of the 1024 x 500 image (x = centre, y = top edge).
// RTL locales mirror the whole composition (copy to the right, devices to the left).
// Safe zone: Google's cutoff-zone diagram crops about 15% per side, so the logo, name and slogan stay inside
// x 154-872, y 76-424 (SAFE). The copy starts at x 154 by default and the page warns when the copy or the
// logo (measured on its own: it may overhang the copy box) leaves the zone.
import { featureTarget } from '../scripts/lib/config.js';
import { q, loadConfig, ready, fail, plain } from './core/boot.js';
import { applyColors, loadFonts } from './core/theme.js';
import { waitImages } from './core/assets.js';
import { upscaleCheck } from './core/quality.js';
import { layoutCheck } from './core/checks.js';
import { accentClash } from './core/clash.js';
import { issue, issues } from './core/issues.js';
import { makeCanvas } from './layout/canvas.js';
import { buildCopy, fitCopy } from './layout/copy.js';
import { flatFrame } from './layout/stage.js';
import { addWatermarks } from './layout/watermark.js';
import { buildElements } from './elements/index.js';
import { applyOrnament } from './ornaments/index.js';
import { startBridge } from './core/edit.js';

const FW = 1024;
const FH = 500;
const SAFE = { left: 154, right: 872, top: 76, bottom: 424 };

// the copy block plus everything in it that can overhang it (the logo and its SVG)
function inkBox(copy, o) {
  const rects = [copy, ...copy.querySelectorAll('.logo, .logo svg, .logo img')].map((n) => n.getBoundingClientRect());
  return {
    left: Math.min(...rects.map((r) => r.left)) - o.left, right: Math.max(...rects.map((r) => r.right)) - o.left,
    top: Math.min(...rects.map((r) => r.top)) - o.top, bottom: Math.max(...rects.map((r) => r.bottom)) - o.top,
  };
}

function safeZoneCheck(copy, cv) {
  const box = inkBox(copy, cv.el.getBoundingClientRect());
  const out = ['left', 'top'].filter((k) => box[k] < SAFE[k] - 1).concat(['right', 'bottom'].filter((k) => box[k] > SAFE[k] + 1));
  if (out.length) {
    issue(`feature graphic: the copy or logo crosses the ${out.join(' + ')} cutoff zone (keep it inside x ${SAFE.left}-${SAFE.right}, y ${SAFE.top}-${SAFE.bottom}): set feature.side, copyWidth or size`);
  }
}

async function main() {
  const cfg = await loadConfig();
  if (!cfg.feature) throw new Error('the config has no `feature` block');
  const t = featureTarget(cfg, q.get('locale'));
  const f = t.feature;
  const rtl = t.dir === 'rtl';
  document.documentElement.lang = t.locale;
  document.documentElement.dir = t.dir;
  applyColors(t.brand.colors);
  const cv = makeCanvas({ W: FW, H: FH, designW: FW, field: f.field || t.brand.field, grain: t.brand.grain, cls: f.class || '' });
  await loadFonts(t.brand, `${plain(f.headline)} ${f.sub || ''}`);
  await addWatermarks(cv, t.brand, { feature: true });

  const width = f.copyWidth || 380; // 154..534: the copy column ends where the devices begin
  const side = f.side ?? SAFE.left;
  const ornament = f.ornament || t.brand.ornament;
  const block = await buildCopy(
    { headline: f.headline, sub: f.sub, logo: f.logo !== false, align: f.align },
    { cv, brand: t.brand, layout: t.layout, ornament,
      sizes: { side, width, left: rtl ? FW - side - width : side, top: 0, headline: f.size || 54, sub: f.subSize || 22, logo: f.logoWidth || 190, logoGap: 26, subGap: 26 } },
  );
  // the logo's optical overhang (copy.css: margin-inline-start -14px, tuned for a 420-unit logo) would pull it
  // into Google's cutoff zone here: the feature graphic aligns the logo box with the copy instead
  const logo = block.copy.querySelector('.logo');
  if (logo) logo.style.marginInlineStart = '0px';
  await waitImages();
  await document.fonts.ready;
  fitCopy(block, cv, t.layout, { headline: f.maxLines || 4, sub: 2 });
  const h = block.copy.getBoundingClientRect().height;
  block.copy.style.top = `${Math.round((FH - h - 22) / 2 + (f.nudge || 0))}px`;

  const mirror = rtl ? (e) => ({ ...e, x: FW - (e.x ?? FW / 2), r: -(e.r || 0) }) : null;
  await buildElements(f.stage, {
    cv, fr: flatFrame(), brand: t.brand, device: t.device, platform: t.platform, space: 'portrait', locale: t.locale,
    defaultLocale: t.ctx.defaultLocale, icon: cfg.icon && cfg.icon.src, mirror,
  });
  applyOrnament(ornament, block, cv, { rtl });
  await waitImages();
  safeZoneCheck(block.copy, cv);
  accentClash(cv, 'feature graphic');
  const upscale = upscaleCheck(cv);
  const { ui } = layoutCheck(cv);
  window.__info = { upscale, ui, issues: issues() };
  startBridge({ cv, kind: 'feature', store: 'feature', panels: [{ id: 1, n: 1 }], copies: [{ panel: 1, node: block.copy }] });
  ready();
}

main().catch(fail);
