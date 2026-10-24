// The wide layout (landscape space): web, social and desktop targets.
// Design canvas: 1200 units high, DW = 1200 x W / H wide (og 2286, 16:10 1920, 4:3 1600, square 1200), k = H / 1200.
//   side  : copy column on the left (right in RTL), vertically centred; the stage fills the room beside it.
//   stack : copy centred on top; the stage hangs under it (landing-page heroes, portfolio covers, squares).
// The stage is a 1600 x 1200 box (x = centre, y = top edge, as in the phone layout), scaled by
//   f = min(maxScale, room width / 1600, room height / 1200) x zoom      and centred in its room.
// In stack mode the box's empty top (above the highest element) is dropped, so one stage works in both modes.
// Panel keys: mode 'side'|'stack', copyWidth, size (headline), subSize, zoom, gap, nudge, align.
import { loadFonts } from '../core/theme.js';
import { waitImages } from '../core/assets.js';
import { makeCanvas } from './canvas.js';
import { buildCopy, fitCopy } from './copy.js';
import { addWatermarks } from './watermark.js';
import { buildElements } from '../elements/index.js';
import { applyOrnament } from '../ornaments/index.js';
import { plain } from '../core/boot.js';
import { normWatermark } from '../../scripts/lib/config.js';

export const WIDE_H = 1200;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function frame(sl, top, f, mid) {
  return { f, top, mid, X: (x) => sl + x * f, Y: (y) => top + y * f };
}

export async function composeWide(t, p, { icon } = {}) {
  const L = t.layout.wide;
  const [W, H] = t.store.size;
  const DW = (WIDE_H * W) / H;
  const rtl = t.dir === 'rtl';
  const cv = makeCanvas({ W, H, designW: DW, field: p.field || t.brand.field, grain: t.brand.grain });
  cv.el.classList.add('wide');
  await loadFonts(t.brand, `${plain(p.headline)} ${p.sub || ''}`);
  await addWatermarks(cv, t.brand, { wide: true, perSlice: [p.watermark === undefined ? undefined : normWatermark(p.watermark, t.brand)] });

  const mode = p.mode || (L.mode !== 'auto' ? L.mode : W / H >= L.sideRatio ? 'side' : 'stack');
  const ornament = p.ornament || t.brand.ornament;
  const hasCopy = !!(p.headline || p.sub);
  const side = mode === 'side';
  const width = side
    ? (p.copyWidth ?? clamp(DW * L.copyWidth, L.copyMin, L.copyMax))
    : Math.min(DW - 2 * L.side, p.copyWidth ?? L.stackWidth);
  const left = side ? (rtl ? DW - L.side - width : L.side) : (DW - width) / 2;
  let block = null;
  if (hasCopy) {
    block = await buildCopy({ ...p, align: p.align || (side ? 'left' : 'center') }, {
      cv, brand: t.brand, layout: t.layout, ornament,
      sizes: { side: L.side, width, left, top: side ? 0 : L.top,
        headline: p.size ?? (side ? L.headline : L.headline * L.stackScale), sub: p.subSize ?? (side ? L.sub : L.sub * L.stackScale),
        logo: p.logoWidth ?? L.logo, logoGap: side ? 46 : 36, subGap: ornament === 'brush' ? (side ? 70 : 60) : (side ? 34 : 28) },
    });
    await waitImages();
    await document.fonts.ready;
    fitCopy(block, cv, { maxLines: L.maxLines, subMaxLines: L.subMaxLines }, p.lines);
  }
  const copyH = block ? block.copy.getBoundingClientRect().height / cv.k : 0;
  const SW = L.stageW;
  const SH = L.stageH;
  const zoom = p.zoom || 1;
  let fr;
  if (side) {
    const x0 = hasCopy ? (rtl ? 0 : left + width + L.gap) : 0;
    const aw = hasCopy ? (rtl ? left - L.gap : DW - x0) : DW;
    const f = Math.min(L.maxScale, aw / SW, WIDE_H / SH) * zoom;
    fr = frame(x0 + (aw - SW * f) / 2, (WIDE_H - SH * f) / 2, f, SW / 2);
    if (block) block.copy.style.top = `${(WIDE_H - copyH) / 2 + (p.nudge || 0)}px`;
  } else {
    const top0 = hasCopy ? L.top + copyH + (p.gap ?? L.stackGap) : L.top * 0.6;
    const room = WIDE_H - top0;
    // the stage's empty top (the highest element's y) is dropped, so the devices hang right under the copy
    const minY = Math.max(0, Math.min(SH * 0.5, ...p.stage.map((e) => e.y ?? 0)));
    const f = Math.min(L.maxScale, room / (SH - minY), (DW - L.side) / SW) * zoom;
    // when the width limits the stage, centre copy + stage as one group instead of leaving a gap at the bottom
    const shift = Math.max(0, (room - (SH - minY) * f) / 2);
    if (block) block.copy.style.top = `${L.top + shift + (p.nudge || 0)}px`;
    fr = frame(DW / 2 - (SW * f) / 2, top0 + shift - minY * f, f, SW / 2);
  }
  const mirror = rtl && side ? (e) => ({ ...e, x: SW - (e.x ?? SW / 2), r: -(e.r || 0) }) : null;
  await buildElements(p.stage, {
    cv, fr, brand: t.brand, device: t.store.device, platform: t.ctx.platform, space: 'landscape', locale: t.locale,
    defaultLocale: t.ctx.defaultLocale, icon, mirror,
  });
  if (block) applyOrnament(ornament, block, cv, { rtl });
  return { cv, fr, mode, blocks: block ? [{ copy: block.copy, slice: 0 }] : [] };
}
