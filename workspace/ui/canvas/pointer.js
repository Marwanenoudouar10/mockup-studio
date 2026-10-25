// Pointer on the canvas:
//   element      press = select, drag = move (Shift locks the axis); the page redraws it live via the bridge
//   handles      corners = resize (keeps the aspect), round knob = rotate (Shift snaps to 15°)
//   image        press = select the image (its layers show in the sidebar)
//   empty space, Space + drag, middle button = pan
//   double-click a device / lift / tile (editable projects) = screen mode, a headline = type it (ui/screen/pointer.js)
// On release the change goes to layout.json (ui/edits.js).
import { state, emit, selected } from '../state.js';
import { local, setView } from './viewport.js';
import { hit, screenRect } from './geometry.js';
import { ui, redraw } from './overlay.js';
import { commit } from '../edits.js';
import { screenDown, screenHover, initScreenPointer } from '../screen/pointer.js';
import { hoverLayer } from '../screen/enter.js';
import { stopTyping, typingNow } from '../screen/text.js';

let canvas;
export const keys = { space: false };
const round = (v) => Math.round(v);

export function select(sel) {
  state.selection = sel;
  emit('select', sel);
}

function drag(e, onMove, onUp) {
  const id = e.pointerId;
  canvas.setPointerCapture(id);
  const move = (ev) => { if (ev.pointerId === id) onMove(ev); };
  const up = (ev) => {
    if (ev.pointerId !== id) return;
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.classList.remove('panning');
    onUp(ev);
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
}

function pan(e) {
  const p0 = { x: e.clientX, y: e.clientY };
  const v0 = { ...state.view };
  canvas.classList.add('panning');
  drag(e, (ev) => setView({ x: v0.x + ev.clientX - p0.x, y: v0.y + ev.clientY - p0.y }), () => {});
}

// one live gesture on the selected element; values(ev) -> the new config values
function gesture(e, f, el, values, label) {
  const before = { ...el.values };
  let after = null;
  let raf = 0;
  const send = () => {
    raf = 0;
    f.post({ ss: 'set', panel: el.panel, id: el.id, values: after });
  };
  drag(e, (ev) => {
    after = values(ev);
    ui.tip = label(after);
    if (!raf) raf = requestAnimationFrame(send);
    redraw();
  }, () => {
    ui.tip = null;
    if (raf) { cancelAnimationFrame(raf); send(); }
    if (after) commit(f, el, before, { ...before, ...after }, label === tipMove ? 'move' : 'transform');
    redraw();
  });
}

const tipMove = (v) => `x ${round(v.x)} · y ${round(v.y)}${v.r != null ? ` · r ${round(v.r)}°` : ''}`;

function move(e, f, el) {
  const p0 = local(e);
  const v = el.values;
  const m = el.map;
  const k = state.view.z * f.s;
  gesture(e, f, el, (ev) => {
    const p = local(ev);
    if (Math.hypot(p.x - p0.x, p.y - p0.y) < 3) return { x: v.x, y: v.y, r: v.r }; // a click, not a drag
    let dx = (p.x - p0.x) / k;
    let dy = (p.y - p0.y) / k;
    if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    return { x: round(v.x + dx / m.ux), y: round(v.y + dy / m.uy), r: v.r };
  }, tipMove);
}

function rotate(e, f, el) {
  const r = screenRect(f, el.rect);
  const p0 = local(e);
  const a0 = Math.atan2(p0.y - r.cy, p0.x - r.cx);
  const v = el.values;
  gesture(e, f, el, (ev) => {
    const p = local(ev);
    let deg = v.r + (((Math.atan2(p.y - r.cy, p.x - r.cx) - a0) * 180) / Math.PI) * (el.map.ur || 1);
    deg = ((deg + 540) % 360) - 180;
    deg = ev.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
    return { x: v.x, y: v.y, r: deg };
  }, (val) => `r ${val.r}°`);
}

function resize(e, f, el) {
  const r = screenRect(f, el.rect);
  const p0 = local(e);
  const d0 = Math.hypot(p0.x - r.cx, p0.y - r.cy) || 1;
  const v = el.values;
  gesture(e, f, el, (ev) => {
    const p = local(ev);
    const k = Math.max(0.1, Math.hypot(p.x - r.cx, p.y - r.cy) / d0);
    if (el.type === 'badge' || el.type === 'text') return { size: Math.max(12, round(v.size * k)) };
    const out = { w: Math.max(40, round(v.w * k)) };
    if (v.h != null) out.h = Math.max(40, round(v.h * k));
    return out;
  }, (val) => (val.size != null ? `size ${val.size}` : `w ${val.w}${val.h != null ? ` · h ${val.h}` : ''}`));
}

function down(e) {
  if (e.target.closest('.pin, .zoom, .toast, .banner, .scr-bar')) return;
  if (e.button === 1 || (e.button === 0 && keys.space)) { e.preventDefault(); pan(e); return; }
  if (e.button !== 0) return;
  canvas.focus({ preventScroll: true });
  if (state.screen && screenDown(e, local(e))) return;
  if (typingNow()) stopTyping(); // a headline typed in place: a click elsewhere saves it
  const handle = e.target.closest('[data-h]');
  const cur = selected();
  if (handle && cur.el && cur.frame) {
    e.preventDefault();
    if (handle.dataset.h === 'rot') rotate(e, cur.frame, cur.el);
    else resize(e, cur.frame, cur.el);
    return;
  }
  const p = local(e);
  const h = hit(p.x, p.y);
  if (!h.frame) { select(null); pan(e); return; }
  if (h.el && h.el.type !== 'text' && h.frame.editable) {
    e.preventDefault();
    select({ frame: h.frame.key, panel: h.el.panel, id: h.el.id });
    move(e, h.frame, h.el);
    return;
  }
  select({ frame: h.frame.key, panel: h.panel, id: h.el ? 'copy' : null });
}

function hover(e) {
  if (e.buttons) return;
  const p = local(e);
  if (state.screen) { canvas.style.cursor = ''; screenHover(p); return; }
  const h = hit(p.x, p.y);
  const next = h.el && h.el.type !== 'text' ? { frame: h.frame.key, panel: h.el.panel, id: h.el.id } : null;
  if (JSON.stringify(next) !== JSON.stringify(state.hover)) {
    state.hover = next;
    emit('hover', next);
  }
  canvas.style.cursor = keys.space ? '' : next ? 'move' : '';
}

export function initPointer(els) {
  ({ canvas } = els);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', hover);
  canvas.addEventListener('pointerleave', () => { state.hover = null; emit('hover', null); hoverLayer(null); });
  canvas.addEventListener('auxclick', (e) => e.preventDefault());
  initScreenPointer(els);
}
