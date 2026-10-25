// The overlay in screen mode: the board dims around the entered element, the element under the pointer gets a
// thin outline, the selected one a solid box with its size (CSS px of the screen) below it, a dashed box while its
// words are typed, and the live "dx · dy" while it is dragged. A headline being typed gets a dashed box too.
import { state, frames } from '../state.js';
import { screenRect } from '../canvas/geometry.js';

const fmt = (v) => String(Math.round(v));

// box(cls, rect, inner) is the overlay's own helper (canvas/overlay.js)
export function drawScreen(layer, box) {
  const s = state.screen;
  const f = s && frames.get(s.frame);
  if (!f) return;
  const el = f.boxes && f.boxes.elements.find((e) => e.panel === s.panel && String(e.id) === String(s.id));
  const clip = s.clip || (el && el.rect);
  if (clip) {
    const d = box('scr-focus', screenRect(f, clip));
    d.style.borderRadius = `${(s.radius || 0) * f.s * state.view.z}px`;
    layer.appendChild(d);
  }
  const item = (eid) => (eid ? s.items.find((i) => i.eid === eid) : null);
  const h = item(s.hover);
  if (h && s.hover !== s.sel) layer.appendChild(box('scr-hover', screenRect(f, h.rect)));
  const sel = item(s.sel);
  if (!sel) return;
  const r = screenRect(f, sel.rect);
  const d = box(`scr-sel${s.typing ? ' typing' : ''}`, r);
  if (!s.typing) {
    const tag = document.createElement('span');
    tag.className = 'scr-dim';
    tag.textContent = s.tip || `${fmt(sel.css.w)} × ${fmt(sel.css.h)}`;
    d.appendChild(tag);
  }
  layer.appendChild(d);
}

export function drawCopyTyping(layer, box) {
  const t = state.copyTyping;
  const f = t && frames.get(t.frame);
  const c = f && f.boxes && f.boxes.copies.find((x) => x.panel === t.panel);
  const part = c && c.parts && c.parts[t.field];
  if (part) layer.appendChild(box('scr-sel typing', screenRect(f, part.rect)));
}
