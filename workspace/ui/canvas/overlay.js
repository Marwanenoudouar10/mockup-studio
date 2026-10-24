// The screen-space layer over the canvas: hover outline, the selected element's blue box with resize and
// rotate handles, its live "x · y · r" tooltip, the selected image outline, the drop target and note pins.
// Redrawn (once per animation frame at most) whenever the view, the boxes or the selection change.
import { state, frames, selected, on } from '../state.js';
import { screenRect, frameScreenRect } from './geometry.js';

let layer;
let queued = false;
export const ui = { tip: null, ghost: null, pins: [] }; // set by pointer.js, drop.js, notes.js

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v) => (v == null ? '–' : String(Math.round(v * 10) / 10));

export function tipText(el) {
  const v = el.values;
  return `x ${fmt(v.x)} · y ${fmt(v.y)} · r ${fmt(v.r)}°`;
}

function box(cls, r, inner = '') {
  const d = document.createElement('div');
  d.className = cls;
  Object.assign(d.style, {
    left: `${r.cx - r.w / 2}px`, top: `${r.cy - r.h / 2}px`, width: `${r.w}px`, height: `${r.h}px`,
    transform: `rotate(${r.rot}deg)`,
  });
  d.innerHTML = inner;
  return d;
}

function draw() {
  queued = false;
  layer.textContent = '';
  const { frame, el } = selected();
  const h = state.hover;
  if (h && h.frame) {
    const f = frames.get(h.frame);
    const hel = f && f.boxes && f.boxes.elements.find((e) => e.panel === h.panel && String(e.id) === String(h.id));
    const same = state.selection && state.selection.frame === h.frame && String(state.selection.id) === String(h.id) && state.selection.panel === h.panel;
    if (hel && !same) layer.appendChild(box('hover', screenRect(f, hel.rect)));
  }
  if (frame && !el && state.selection.id == null) {
    const r = frameScreenRect(frame);
    layer.appendChild(box('frame-sel', { cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: r.w + 6, h: r.h + 6, rot: 0 }));
  }
  if (frame && el) {
    const r = screenRect(frame, el.rect);
    const text = el.type === 'text';
    const handles = text || !frame.editable ? ''
      : '<i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i><div class="stem"></div><i data-h="rot"></i>';
    layer.appendChild(box(text ? 'sel text' : 'sel', r, handles));
    if (!text) {
      const tip = document.createElement('div');
      tip.className = 'tip';
      tip.textContent = ui.tip || tipText(el);
      // below the rotated box's lowest corner
      const a = (r.rot * Math.PI) / 180;
      const dy = Math.abs((r.w / 2) * Math.sin(a)) + Math.abs((r.h / 2) * Math.cos(a));
      Object.assign(tip.style, { left: `${r.cx}px`, top: `${r.cy + dy + 10}px` });
      layer.appendChild(tip);
    }
  }
  if (ui.ghost) {
    const g = ui.ghost;
    const r = frameScreenRect(g.frame);
    const d = box('ghost', { cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: r.w, h: r.h, rot: 0 }, `<span>drop “${esc(g.name)}” here<br>→ new ${esc(g.what)} in ${esc(g.label)}</span>`);
    layer.appendChild(d);
  }
  for (const p of ui.pins) {
    const f = frames.get(p.frame);
    if (!f) continue;
    const r = frameScreenRect(f);
    const d = document.createElement('div');
    d.className = `pin${p.note.done ? ' done' : ''}${p.on ? ' on' : ''}`;
    d.dataset.note = p.note.id;
    d.title = p.note.text;
    d.textContent = String(p.n);
    Object.assign(d.style, { left: `${r.x + p.note.x * r.w}px`, top: `${r.y + p.note.y * r.h}px` });
    layer.appendChild(d);
  }
}

export function redraw() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(draw);
}

export function initOverlay(els) {
  layer = els.overlay;
  for (const ev of ['view', 'boxes', 'select', 'rows', 'hover', 'notes', 'resized']) on(ev, redraw);
}
