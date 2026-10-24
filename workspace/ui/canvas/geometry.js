// Coordinates. Three spaces:
//   image px   a frame's own page pixels (what the edit bridge reports: rect = {cx, cy, w, h, rot})
//   world      the board (frame.x + px * frame.s)
//   screen     canvas-relative CSS px (state.view pan + zoom)
// and config units, through each element's map (px = o + value * u).
import { state, frames } from '../state.js';
import { toScreen, toWorld } from './viewport.js';
import { frameAt } from './board.js';

export function screenRect(f, rect) {
  const c = toScreen(f.x + rect.cx * f.s, f.y + rect.cy * f.s);
  const k = f.s * state.view.z;
  return { cx: c.x, cy: c.y, w: rect.w * k, h: rect.h * k, rot: rect.rot || 0 };
}

export function frameScreenRect(f) {
  const a = toScreen(f.x, f.y);
  return { x: a.x, y: a.y, w: f.w * state.view.z, h: f.h * state.view.z };
}

export function toImage(f, sx, sy) {
  const w = toWorld(sx, sy);
  return { x: (w.x - f.x) / f.s, y: (w.y - f.y) / f.s };
}

export function inside(rect, p, pad = 0) {
  const a = (-(rect.rot || 0) * Math.PI) / 180;
  const dx = p.x - rect.cx;
  const dy = p.y - rect.cy;
  const x = dx * Math.cos(a) - dy * Math.sin(a);
  const y = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(x) <= rect.w / 2 + pad && Math.abs(y) <= rect.h / 2 + pad;
}

// the config panel under an image point (a panorama strip holds several)
export function panelAt(f, ix) {
  if (!f.panels.length) return null;
  if (f.kind !== 'strip') return f.panels[0].id;
  return f.panels[Math.max(0, Math.min(f.panels.length - 1, Math.floor(ix / f.slice)))].id;
}

// what is under a screen point: { frame, el (element, or {type:'text'} for a headline block), panel }
export function hit(sx, sy) {
  const w = toWorld(sx, sy);
  const f = frameAt(w.x, w.y);
  if (!f) return { frame: null, el: null, panel: null };
  const p = { x: (w.x - f.x) / f.s, y: (w.y - f.y) / f.s };
  const b = f.boxes;
  if (b) {
    const els = [...b.elements].sort((a, c) => (c.values.z ?? 0) - (a.values.z ?? 0));
    const el = els.find((e) => inside(e.rect, p));
    if (el) return { frame: f, el, panel: el.panel };
    const copy = b.copies.find((c) => inside(c.rect, p));
    if (copy) return { frame: f, el: { ...copy, id: 'copy', type: 'text' }, panel: copy.panel };
  }
  return { frame: f, el: null, panel: panelAt(f, p.x) };
}

export const frameByKey = (k) => frames.get(k) || null;

export function centreOf(f, el) {
  const r = screenRect(f, el.rect);
  return { x: r.cx, y: r.cy };
}
