// The pointer in screen mode: a press selects the screen element under it (the frame picks it, with the screen's
// own z order), a drag moves it (dx / dy in CSS px of the screen, Shift locks the axis; saved on release), a
// double-click types its words. A press outside the entered element leaves screen mode. Hover outlines the element
// under the pointer. Outside screen mode, a double-click on a device, lift or tile enters it, and on a headline or
// sub line types it.
import { state, frames, selected } from '../state.js';
import { toImage, inside, hit } from '../canvas/geometry.js';
import { redraw } from '../canvas/overlay.js';
import { enter, leave, pick, selectLayer, hoverLayer, itemOf, canEnter } from './enter.js';
import { startText, startCopy, stopTyping } from './text.js';
import { preview, merged, setEdit, editOf } from './patches.js';

let canvas;
const clipOf = (s) => s.clip || (selected().el || {}).rect || null;
const local = (ev) => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };

function drag(g, ev) {
  const p = local(ev);
  const [dx, dy] = [p.x - g.p0.x, p.y - g.p0.y];
  if (!g.moved && Math.hypot(dx, dy) < 4) return;
  g.moved = true;
  const it = g.item;
  // screen px per CSS px of the screen, and the screen's rotation on the board
  const k = (it.css.w ? it.rect.w / it.css.w : it.rect.h / (it.css.h || 1)) * g.f.s * state.view.z;
  const a = (-(it.rect.rot || 0) * Math.PI) / 180;
  let cx = (dx * Math.cos(a) - dy * Math.sin(a)) / k;
  let cy = (dx * Math.sin(a) + dy * Math.cos(a)) / k;
  if (ev.shiftKey) { if (Math.abs(cx) > Math.abs(cy)) cy = 0; else cx = 0; }
  g.dx = Math.round((g.base.dx || 0) + cx);
  g.dy = Math.round((g.base.dy || 0) + cy);
  state.screen.tip = `dx ${g.dx} · dy ${g.dy}`;
  if (!g.raf) {
    g.raf = requestAnimationFrame(() => {
      g.raf = 0;
      preview(state.screen.screen, it.eid, merged(it, { dx: g.dx, dy: g.dy }), g.f);
    });
  }
  redraw();
}

// -> true when the press was inside the entered element (handled here)
export function screenDown(e, p) {
  const s = state.screen;
  const f = s && frames.get(s.frame);
  if (!f) return false;
  const clip = clipOf(s);
  if (!clip || !inside(clip, toImage(f, p.x, p.y))) {
    stopTyping();
    leave();
    return false;
  }
  e.preventDefault();
  if (s.typing) stopTyping();
  const id = e.pointerId;
  canvas.setPointerCapture(id);
  const g = { p0: p, f, last: null, up: false, item: null, moved: false, raf: 0 };
  const move = (ev) => { if (ev.pointerId === id) { g.last = ev; if (g.item) drag(g, ev); } };
  const up = (ev) => {
    if (ev.pointerId !== id) return;
    g.up = true;
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    if (!g.item || !g.moved) return;
    if (g.raf) cancelAnimationFrame(g.raf);
    state.screen.tip = null;
    setEdit(g.item, { dx: g.dx, dy: g.dy }, 'move');
    redraw();
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  pick(f, toImage(f, p.x, p.y)).then(({ eid }) => {
    if (state.screen !== s) return;
    selectLayer(eid);
    const it = itemOf(eid);
    if (!it || g.up) return;
    Object.assign(g, { item: it, base: editOf(s.screen, eid) || {} });
    if (g.last) drag(g, g.last);
  });
  return true;
}

let hovering = false;
let want = null;
export async function screenHover(p) {
  const s = state.screen;
  want = p;
  if (!s || s.typing || hovering) return;
  hovering = true;
  try {
    while (want && state.screen === s) {
      const at = want;
      want = null;
      const f = frames.get(s.frame);
      const ip = f && toImage(f, at.x, at.y);
      const clip = clipOf(s);
      const eid = f && clip && inside(clip, ip) ? (await pick(f, ip)).eid : null;
      if (state.screen === s) hoverLayer(eid);
    }
  } finally {
    hovering = false;
  }
}

export async function onDblclick(e) {
  if (e.target.closest('.pin, .zoom, .toast, .banner, .scr-bar')) return;
  const p = local(e);
  const s = state.screen;
  if (s) {
    const f = frames.get(s.frame);
    const clip = clipOf(s);
    if (!f || !clip || !inside(clip, toImage(f, p.x, p.y))) return;
    const { eid } = await pick(f, toImage(f, p.x, p.y));
    if (eid && state.screen === s) { selectLayer(eid); startText(eid, { quiet: true }); }
    return;
  }
  const h = hit(p.x, p.y);
  if (!h.frame || !h.el) return;
  if (h.el.id === 'copy') {
    const ip = toImage(h.frame, p.x, p.y);
    const parts = h.el.parts || {};
    const field = parts.sub && inside(parts.sub.rect, ip, 2) ? 'sub' : 'headline';
    if (parts[field]) startCopy(h.frame, h.el.panel, field);
    return;
  }
  if (canEnter(h.el)) enter(h.frame, h.el, toImage(h.frame, p.x, p.y));
}

export function initScreenPointer(els) {
  ({ canvas } = els);
  canvas.addEventListener('dblclick', onDblclick);
}
