// Screen editing for Mockup Studio (editable projects, screens.mode 'live'): the part of the edit bridge
// (core/edit.js, ?edit=1) that works INSIDE the live screens of a stage element (core/live.js) and on the copy block.
// From the Studio:
//   { ss:'enter', panel, id }               that device / lift / tile's live screen: post its layers (again after
//                                           every change, until 'leave')
//   { ss:'leave' }
//   { ss:'pick', x, y, req }                the screen element under a page point -> { ss:'picked', req, eid, inside }
//   { ss:'screen-set', screen, eid, value } preview one element's whole edit (null = none) in EVERY live frame of that
//                                           screen on this page (kit.edit in screens/kit/edits.js)
//   { ss:'text-start', eid }                inline text edit in the entered screen: Enter saves, Esc cancels, a click
//                                           elsewhere saves -> { ss:'text-commit', screen, eid, text } | 'text-cancel'
//   { ss:'copy-start', panel, field }       the same on the headline (keeps <em>, Shift+Enter = <br>) or the sub line
//                                           -> { ss:'copy-commit', panel, field, html } | 'copy-cancel'
//   { ss:'type-stop' }                      ends an inline edit (saves it)
//   { ss:'type-keys', keys }                keys the Studio caught before the words were editable (replayed here)
// Once the words are editable the frame answers { ss:'text-started', eid } | { ss:'copy-started', panel, field };
// a cancel after Enter with nothing changed carries enter: true (the Studio says "Nothing changed").
// Layers: { ss:'layers', panel, id, screen, platform, locale, items, clip, radius, tokens, issues }. Rects are page px
// { cx, cy, w, h, rot } like the stage boxes: a screen element's CSS box goes through the exact affine map of its
// iframe (every transform on the way), read from three zero-size markers, so rotated and scaled lifts line up.
// Nothing is saved here: the Studio writes edits.json, which every render, capture and export applies. Typing in
// place (text-start, copy-start, type-keys, type-stop): core/edit-type.js.
import { isTyping, stopTyping, typeKeys, textStart as startText, copyStart as startCopy } from './edit-type.js';

export const SCREEN_MESSAGES = new Set(['enter', 'leave', 'pick', 'screen-set', 'text-start', 'copy-start', 'type-stop', 'type-keys']);
// the swatches the Studio offers: the kit's brand and semantic colours (screens/kit/tokens.css, kit/brand.js)
const TOKENS = ['tint', 'tint-2', 'accent', 'on-tint', 'tint-soft', 'brand-primary', 'brand-secondary', 'brand-deep',
  'brand-ink', 'brand-paper', 'text', 'text-2', 'text-3', 'bg', 'surface', 'surface-2', 'line'];

let api = null; // from core/edit.js: { nodeOf(panel, id), copyNode(panel), post(msg), boxes() }
let active = null; // { panel, id, f, M, clip }
let queued = false;

const r2 = (v) => Math.round(v * 100) / 100;
const map = (M, x, y) => ({ x: M.a * x + M.c * y + M.e, y: M.b * x + M.d * y + M.f });
function invert(M) {
  const det = M.a * M.d - M.b * M.c || 1;
  return { a: M.d / det, b: -M.b / det, c: -M.c / det, d: M.a / det, e: (M.c * M.f - M.d * M.e) / det, f: (M.b * M.e - M.a * M.f) / det };
}
const liveOf = (node) => (node ? node.querySelector('iframe.live-screen') : null);
const transformOf = (f) => { const t = getComputedStyle(f).transform; return t === 'none' ? '' : t; };

// iframe CSS px -> page px, exact: three zero-size markers beside the iframe, with its transform
function matrixOf(f) {
  const [o, px, py] = [[0, 0], [100, 0], [0, 100]].map(([x, y]) => {
    const m = document.createElement('i');
    m.style.cssText = `position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;transform:${transformOf(f)} translate(${x}px,${y}px)`;
    f.parentElement.appendChild(m);
    const r = m.getBoundingClientRect();
    m.remove();
    return r;
  });
  return { a: (px.left - o.left) / 100, b: (px.top - o.top) / 100, c: (py.left - o.left) / 100, d: (py.top - o.top) / 100, e: o.left, f: o.top };
}

// the part of the screen its host shows (a device's screen, a lift's card, a tile's window), in iframe CSS px
function clipOf(f) {
  const host = f.parentElement;
  const T = new DOMMatrixReadOnly(transformOf(f) || undefined).inverse();
  const a = T.transformPoint(new DOMPoint(0, 0));
  const b = T.transformPoint(new DOMPoint(host.clientWidth, host.clientHeight));
  const [W, H] = [parseFloat(f.style.width), parseFloat(f.style.height)];
  const x = Math.max(0, Math.min(a.x, b.x));
  const y = Math.max(0, Math.min(a.y, b.y));
  return { x, y, w: Math.max(0, Math.min(W, Math.max(a.x, b.x)) - x), h: Math.max(0, Math.min(H, Math.max(a.y, b.y)) - y) };
}

// the host's rounded corners (a lift's card, a device's screen) in page px, so the Studio's focus ring follows them
function radiusOf(f, M) {
  const T = new DOMMatrixReadOnly(transformOf(f) || undefined);
  const host = f.parentElement;
  const r = Math.max(...[host, host.parentElement].filter(Boolean).map((n) => parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0));
  return r2((r * Math.hypot(M.a, M.b)) / (Math.hypot(T.a, T.b) || 1));
}

function pageRect(M, r) {
  const c = map(M, r.x + r.w / 2, r.y + r.h / 2);
  return { cx: r2(c.x), cy: r2(c.y), w: r2(r.w * Math.hypot(M.a, M.b)), h: r2(r.h * Math.hypot(M.c, M.d)), rot: r2((Math.atan2(M.b, M.a) * 180) / Math.PI) };
}

const overlaps = (r, c) => r.w > 0 && r.h > 0 && r.x < c.x + c.w && r.x + r.w > c.x && r.y < c.y + c.h && r.y + r.h > c.y;

// the token colours as this screen resolves them (light or dark, brand applied)
function tokensOf(win) {
  const doc = win.document;
  const root = win.getComputedStyle(doc.documentElement);
  const probe = doc.createElement('i');
  probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
  doc.body.appendChild(probe);
  const out = [];
  for (const name of TOKENS) {
    if (!root.getPropertyValue(`--${name}`).trim()) continue;
    probe.style.color = `var(--${name})`;
    out.push({ name, value: win.getComputedStyle(probe).color });
  }
  probe.remove();
  return out;
}

async function snapshot() {
  queued = false;
  if (!active) return;
  const { panel, id } = active;
  const f = liveOf(api.nodeOf(panel, id));
  if (!f) { api.post({ ss: 'layers', panel, id, items: [], error: 'this element shows no live screen' }); return; }
  await f.ready;
  if (!active || active.panel !== panel || active.id !== id || !f.isConnected) return;
  const win = f.contentWindow;
  const kit = win && win.kit;
  if (!kit || !kit.edit) { api.post({ ss: 'layers', panel, id, items: [], error: 'this screen has no screen kit' }); return; }
  const M = matrixOf(f);
  const clip = clipOf(f);
  Object.assign(active, { f, M, clip });
  const name = f.dataset.screen;
  const at = `edits.json: ${name} › `;
  const issues = (kit.editIssues ? kit.editIssues() : []).filter((t) => t.startsWith(at)).map((t) => {
    const rest = t.slice(at.length);
    return { eid: rest.split(' ')[0].replace(/:$/, ''), text: rest };
  });
  const items = kit.edit.layers().filter((l) => overlaps(l.rect, clip)).map((l) => ({ ...l, css: l.rect, rect: pageRect(M, l.rect) }));
  api.post({ ss: 'layers', panel, id, screen: name, platform: kit.platform, locale: kit.locale, items, clip: pageRect(M, clip),
    radius: radiusOf(f, M), tokens: tokensOf(win), issues, typing: isTyping() });
}

function later() {
  if (queued || !active) return;
  queued = true;
  requestAnimationFrame(() => snapshot());
}

function pick({ x, y, req }) {
  let eid = null;
  let inside = false;
  if (active && active.f && active.f.isConnected && active.M) {
    const p = map(invert(active.M), x, y);
    const c = active.clip;
    inside = p.x >= c.x && p.y >= c.y && p.x <= c.x + c.w && p.y <= c.y + c.h;
    const hit = inside ? active.f.contentDocument.elementFromPoint(p.x, p.y) : null;
    const el = hit && hit.closest ? hit.closest('[data-eid]') : null;
    eid = el ? el.dataset.eid : null;
  }
  api.post({ ss: 'picked', req, eid, inside });
}

function screenSet({ screen, eid, value }) {
  for (const f of document.querySelectorAll('iframe.live-screen')) {
    const kit = f.dataset.screen === screen && f.contentWindow ? f.contentWindow.kit : null;
    if (!kit || !kit.edit) continue;
    kit.edit.clear(eid);
    if (value && (!value.only || value.only === kit.platform || value.only === kit.family)) kit.edit.set(eid, value);
  }
  later();
}

export function initScreenBridge(a) {
  api = a;
}

// a stage element was drawn again (moved, undone): the entered screen is a new frame now
export function redrawn(panel, id) {
  if (active && active.panel === panel && String(active.id) === String(id)) later();
}

// while a screen is edited, the other stage elements fade, and a card or badge floating OVER it is hidden, so it
// never reads as part of the screen (a click there picks the screen element below, as the canvas shows); all of
// them come back on leave
const faded = new Map(); // node -> its own inline opacity and transition, put back on leave
const zOf = (n) => parseInt(getComputedStyle(n).zIndex, 10) || 0;
const meets = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
// n is painted over node: a higher z, or the same z and later in the page
function over(n, node) {
  const [zn, z] = [zOf(n), zOf(node)];
  return zn !== z ? zn > z : !!(node.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
}
function ghost(on) {
  for (const [n, [o, t]] of faded) Object.assign(n.style, { opacity: o, transition: t });
  faded.clear();
  const node = on && active ? api.nodeOf(active.panel, active.id) : null;
  const box = node && node.getBoundingClientRect();
  for (const n of on ? document.querySelectorAll('[data-el]') : []) {
    if (n === node || (node && (n.contains(node) || node.contains(n)))) continue;
    const hide = !!node && over(n, node) && meets(n.getBoundingClientRect(), box);
    faded.set(n, [n.style.opacity, n.style.transition]);
    Object.assign(n.style, { opacity: hide ? '0' : String((Number(n.style.opacity) || 1) * 0.1), transition: 'opacity .18s' });
  }
}

export function screenMessage(m) {
  if (m.ss === 'enter') {
    stopTyping();
    active = { panel: m.panel ?? null, id: m.id };
    ghost(true);
    snapshot();
  } else if (m.ss === 'leave') {
    stopTyping();
    ghost(false);
    active = null;
  } else if (m.ss === 'pick') pick(m);
  else if (m.ss === 'screen-set') screenSet(m);
  else if (m.ss === 'text-start') startText(m, { api, f: active && active.f && active.f.isConnected ? active.f : null, later });
  else if (m.ss === 'copy-start') startCopy(m, { api });
  else if (m.ss === 'type-stop') stopTyping();
  else if (m.ss === 'type-keys') typeKeys(m);
}
