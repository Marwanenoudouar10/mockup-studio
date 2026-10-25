// Screen mode (editable projects): double-click a device, lift or tile (or Enter on a selected one) to work INSIDE
// its live screen: the screen's layers in the sidebar (ui/screen/layers.js), click one to select it, double-click
// a text to type (text.js), the inspector for text, colour, size, hide and nudge (inspector.js). Esc, Done or a
// click outside the element leaves. The frame's edit bridge (engine/core/edit-screen.js) measures the layers in
// page px and sends them as { ss: 'layers' }, again after every change. Raster projects show captures, which are
// fixed pixels: there a double-click only explains that.
import { state, frames, emit, on } from '../state.js';
import { setView } from '../canvas/viewport.js';
import { panelName } from '../model.js';
import { toast } from '../panels/toast.js';
import { onTyped } from './text.js';
import { labelOf } from './names.js';

export const SCREEN_TYPES = new Set(['phone', 'device', 'tablet', 'browser', 'laptop', 'monitor', 'lift', 'tile']);
export const canEnter = (el) => !!(el && el.screen && SCREEN_TYPES.has(el.type));
export const RASTER_NOTE = 'Screenshots project: screen content is fixed. Move and resize work; ask Claude for text and colour, or use an editable project.';

let canvas;
let bar;
let seq = 0;
const picks = new Map();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const itemOf = (eid) => (state.screen && eid ? state.screen.items.find((i) => i.eid === eid) || null : null);

// at: an image point to select the element under, once the layers are in (a double-click)
export function enter(f, el, at = null) {
  if (!f || !f.editable || !canEnter(el)) return false;
  if (state.project.mode !== 'live') {
    toast(RASTER_NOTE);
    return false;
  }
  const back = state.screen ? state.screen.back : { ...state.view };
  if (state.screen) leave(false);
  state.selection = { frame: f.key, panel: el.panel, id: el.id };
  state.screen = {
    frame: f.key, panel: el.panel, id: el.id, screen: el.screen, type: el.type, items: [], clip: null, tokens: [], issues: [],
    sel: null, hover: null, typing: null, tip: null, at, page: f.iframe && f.iframe.contentWindow, back, zoomed: false,
  };
  f.post({ ss: 'enter', panel: el.panel, id: el.id });
  const s = state.screen;
  animate(fitView(f, el.rect)).then((v) => { s.zoomed = true; s.view = v; });
  emit('select', state.selection);
  emit('screen', state.screen);
  return true;
}

export function leave(fire = true) {
  const s = state.screen;
  if (!s) return;
  const f = frames.get(s.frame);
  if (f) f.post({ ss: 'leave' });
  state.screen = null;
  // back to the view from before, unless it was panned or zoomed since
  const v = state.view;
  if (fire && s.view && Math.abs(v.z - s.view.z) < 1e-6 && Math.abs(v.x - s.view.x) < 0.5 && Math.abs(v.y - s.view.y) < 0.5) animate(s.back);
  if (fire) {
    emit('screen', null);
    emit('select', state.selection);
  }
}

export function selectLayer(eid) {
  const s = state.screen;
  if (!s) return;
  s.sel = eid || null;
  emit('screen-sel');
}

export function hoverLayer(eid) {
  const s = state.screen;
  if (!s || s.hover === (eid || null)) return;
  s.hover = eid || null;
  emit('screen-hover');
}

// the screen element under an image point: the bridge asks the screen itself (its z order, hidden layers skipped)
export function pick(f, p) {
  const req = ++seq;
  return new Promise((resolve) => {
    picks.set(req, resolve);
    f.post({ ss: 'pick', x: p.x, y: p.y, req });
    setTimeout(() => { if (picks.delete(req)) resolve({ eid: null, inside: false }); }, 1500);
  });
}

function onLayers(f, m) {
  const s = state.screen;
  if (!s || s.frame !== f.key || m.panel !== s.panel || String(m.id) !== String(s.id)) return;
  if (m.error && !(m.items || []).length) { // a real capture in an editable project (no page in screens/)
    leave();
    toast(`“${s.screen}” is drawn from its capture in raw/ (${m.error}): its content is fixed`);
    return;
  }
  Object.assign(s, { items: m.items || [], clip: m.clip || null, radius: m.radius || 0, tokens: m.tokens || [], issues: m.issues || [],
    error: m.error || null, platform: m.platform, locale: m.locale, screen: m.screen || s.screen });
  emit('screen-layers', s);
  if (s.at) {
    const at = s.at;
    s.at = null;
    pick(f, at).then((r) => { if (r.eid && state.screen === s) selectLayer(r.eid); });
  }
}

function onMessage({ frame: f, m }) {
  if (m.ss === 'layers') onLayers(f, m);
  else if (m.ss === 'picked') {
    const resolve = picks.get(m.req);
    if (resolve) { picks.delete(m.req); resolve(m); }
  } else onTyped(f, m);
}

// the view where the element fills most of the canvas
function fitView(f, rect) {
  const c = canvas.getBoundingClientRect();
  const a = ((rect.rot || 0) * Math.PI) / 180;
  const bw = (Math.abs(rect.w * Math.cos(a)) + Math.abs(rect.h * Math.sin(a))) * f.s;
  const bh = (Math.abs(rect.w * Math.sin(a)) + Math.abs(rect.h * Math.cos(a))) * f.s;
  const z = Math.max(0.05, Math.min(4, (c.width * 0.6) / bw, (c.height * 0.84) / bh));
  return { z, x: c.width / 2 - (f.x + rect.cx * f.s) * z, y: c.height / 2 - (f.y + rect.cy * f.s) * z };
}

// a short ease to a view (the zoom in log space, the centre in a straight line) -> the view it ends on
function animate(to) {
  const c = canvas.getBoundingClientRect();
  const v0 = { ...state.view };
  const at = (v) => ({ x: (c.width / 2 - v.x) / v.z, y: (c.height / 2 - v.y) / v.z }); // world point in the middle
  const [a, b] = [at(v0), at(to)];
  const t0 = performance.now();
  state.moving = true;
  return new Promise((resolve) => {
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 260);
      const k = 1 - (1 - t) ** 3;
      const z = v0.z * (to.z / v0.z) ** k;
      setView({ z, x: c.width / 2 - (a.x + (b.x - a.x) * k) * z, y: c.height / 2 - (a.y + (b.y - a.y) * k) * z });
      if (t < 1) { requestAnimationFrame(step); return; }
      state.moving = false;
      resolve({ ...state.view });
    };
    requestAnimationFrame(step);
  });
}

function crumb() {
  const s = state.screen;
  bar.hidden = !s;
  if (!s) return;
  const f = frames.get(s.frame);
  const it = itemOf(s.sel);
  bar.innerHTML = `<span class="path"><b>${esc(f ? panelName(state.project, f, s.panel) : '')}</b><i>›</i><span>${esc(s.type)} · ${esc(s.screen)}</span>`
    + `${it ? `<i>›</i><em>${esc(labelOf(it))}</em>` : ''}</span><kbd>Esc</kbd><button data-leave>Done</button>`;
}

export function initScreen(els) {
  ({ canvas } = els);
  bar = document.createElement('div');
  bar.className = 'scr-bar';
  bar.hidden = true;
  canvas.appendChild(bar);
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  bar.addEventListener('click', (e) => { if (e.target.closest('[data-leave]')) leave(); });
  on('screen-msg', onMessage);
  // a frame that reloaded (a save, a locale switch, an outside edit) is a new page: enter its screen again
  on('boxes', (f) => {
    const s = state.screen;
    const win = f.iframe && f.iframe.contentWindow;
    if (!s || s.frame !== f.key || !win || win === s.page) return;
    s.page = win;
    f.post({ ss: 'enter', panel: s.panel, id: s.id });
  });
  on('tab', () => leave());
  on('rows', () => { if (state.screen && !frames.get(state.screen.frame)) leave(); });
  for (const ev of ['screen', 'screen-layers', 'screen-sel']) on(ev, crumb);
}
