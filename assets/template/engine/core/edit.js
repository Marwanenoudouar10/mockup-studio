// Edit bridge for Store Studio (workspace/). Off unless the page is opened with ?edit=1 (&key=<frame key>).
// Then the page:
//   - tags every stage element (data-el = its id, data-panel = its config panel number; see scripts/lib/layout.js),
//   - posts { ss:'boxes' } to the parent window: each element's box in page px, its config values and the
//     config -> page px mapping, so the workspace can draw handles and turn a drag into config units,
//   - accepts { ss:'set', panel, id, values }, { ss:'add', element }, { ss:'remove', panel, id }, { ss:'ping' }
//     from the parent and redraws that one element with the same element code as a render (no reload).
// Nothing is written from here: the workspace saves layout.json, which every render applies too.
import { q } from './boot.js';
import { fingerprint } from '../../scripts/lib/layout.js';

export const editing = q.get('edit') === '1';
const items = new Map(); // 'panel|id' -> { e, node, scope }
let scope0 = null;
let page = null;

const keyOf = (panel, id) => `${panel ?? ''}|${id}`;
const round = (v, d = 2) => (v == null || !Number.isFinite(+v) ? v : Math.round(v * 10 ** d) / 10 ** d);

// buildElements registers each drawn element with the scope that can draw it again
export function track(e, node, scope) {
  if (!editing || !node) return;
  scope0 = scope0 || scope;
  items.set(keyOf(e.$panel, e.id), { e, node, scope });
}

// unrotated box (centre, size) + rotation of a node, in page px
function measure(node, k) {
  const st = getComputedStyle(node);
  const m = new DOMMatrixReadOnly(st.transform === 'none' ? undefined : st.transform);
  const [ox, oy] = st.transformOrigin.split(' ').map(parseFloat);
  const w = node.offsetWidth;
  const h = node.offsetHeight;
  const p = m.transformPoint(new DOMPoint(w / 2 - ox, h / 2 - oy));
  return {
    cx: round((node.offsetLeft + ox + p.x) * k), cy: round((node.offsetTop + oy + p.y) * k),
    w: round(w * k), h: round(h * k), rot: round((Math.atan2(m.b, m.a) * 180) / Math.PI),
  };
}

// config units -> page px: px = o + value * u (ux < 0 and ur = -1 when the layout mirrors for RTL)
function mapOf(scope, k) {
  const { fr, mirror } = scope.ctx;
  const mx = (x) => (mirror ? mirror({ x, r: 0 }).x : x);
  const x0 = fr.X(mx(0));
  return {
    ox: round(x0 * k), ux: round((fr.X(mx(1)) - x0) * k, 5), oy: round(fr.Y(0) * k),
    uy: round((fr.Y(1) - fr.Y(0)) * k, 5), uw: round(fr.f * k, 5), ur: mirror ? -1 : 1,
  };
}

function valuesOf(e, scope) {
  const badge = (e.type || e.t) === 'badge';
  return {
    x: e.x ?? scope.ctx.fr.mid ?? 660, y: e.y ?? 0, w: e.w ?? null, h: e.h ?? null, r: e.r || 0,
    z: e.z ?? (badge ? 45 : 10), radius: typeof e.radius === 'number' ? e.radius : null, size: badge ? (e.size || 40) : null,
  };
}

function snapshot() {
  const k = page.cv.k;
  const elements = [...items.values()].filter((it) => it.node && it.node.isConnected).map(({ e, node, scope }) => ({
    id: e.id, panel: e.$panel ?? null, type: e.type || e.t, screen: e.screen || null, box: e.box || null,
    crop: !!e.crop, text: e.text || null, src: e.src || null, device: e.device || null,
    of: fingerprint(e), added: !!e.added, moved: !!e.moved, values: valuesOf(e, scope), rect: measure(node, k), map: mapOf(scope, k),
  }));
  const copies = (page.copies || []).filter((c) => c.node).map((c) => ({ panel: c.panel, rect: measure(c.node, k) }));
  return {
    ss: 'boxes', key: q.get('key'), kind: page.kind, store: page.store, panels: page.panels,
    size: { w: page.cv.W * page.cv.slices, h: page.cv.H, slice: page.cv.W }, reflow: !!page.reflow,
    map: scope0 ? mapOf(scope0, k) : null, elements, copies,
  };
}

function post() {
  if (page && window.parent !== window) window.parent.postMessage(snapshot(), '*');
}

function redraw(it, e) {
  if (it.node) it.node.remove();
  it.e = e;
  it.node = it.scope.draw(e);
}

async function onMessage(ev) {
  if (ev.source !== window.parent || !ev.data || typeof ev.data.ss !== 'string') return;
  const m = ev.data;
  const it = items.get(keyOf(m.panel, m.id));
  if (m.ss === 'set' && it) {
    const clean = {};
    for (const [k2, v] of Object.entries(m.values || {})) if (v === null || Number.isFinite(+v)) clean[k2] = v === null ? undefined : +v;
    redraw(it, { ...it.e, ...clean });
  } else if (m.ss === 'remove' && it) {
    if (it.node) it.node.remove();
    items.delete(keyOf(m.panel, m.id));
  } else if (m.ss === 'add' && m.element && scope0) {
    const e = { ...m.element, added: true };
    await scope0.load([e]);
    const old = items.get(keyOf(e.$panel, e.id));
    if (old && old.node) old.node.remove();
    items.set(keyOf(e.$panel, e.id), { e, node: scope0.draw(e), scope: scope0 });
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))));
  } else if (m.ss !== 'ping') return;
  post();
}

// info: { cv, kind: 'panel'|'feature', store, panels: [{id, n}], copies: [{panel, node}], reflow }
export function startBridge(info) {
  if (!editing) return;
  page = info;
  window.addEventListener('message', onMessage);
  post();
}
