// edits.json inside a mock screen (the rules: scripts/lib/edits.js). kit.js runs, in order:
//   stampIds()        every authored element gets data-eid (data-id, else data-box, else "@<anchor>/<tag.class:n>"),
//                     BEFORE the kit builds anything, so ids are the same on iOS and Android and in every language
//   stampChrome(kit)  after the system chrome is built: nav:title, nav:subtitle, tabs:1..n, status:time, fab:label
//   restamp(kit)      after localize: the elements a data-<locale> / data-<platform> swap created
//   applyEdits(kit, edits)  text, colour, background, size, weight, hidden, nudge (before icons, charts and the
//                     boxes are measured, so a lifted card shows its edits)
// Query: edits=<file from the project root> (default edits.json), edits=none (without), screen=<name> (default:
// the page's file name). Findings (an edit skipped or re-anchored) -> kit.editIssues(), which the capture prints
// and the engine turns into render issues. window.kit.edit = { layers(), set(eid, v), clear(eid), base(eid) }
// is the live editing API Mockup Studio uses inside the frame.
import { fnv1a, screenEdits, cleanScreenEdit, parseEdits, TOKEN } from '../../scripts/lib/edits.js';

const ROOT = new URL('../../', import.meta.url);
const SKIP = new Set(['script', 'style', 'template', 'link', 'meta', 'noscript', 'br']);
const FP = new WeakMap(); // element -> fingerprint of what was authored
const BASE = new WeakMap(); // element -> { style, text } before any edit
const found = [];

const clip = (s, n = 48) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const keyOf = (el) => `${el.localName}${el.classList[0] ? `.${el.classList[0]}` : ''}`;
const fingerprint = (el) => fnv1a([el.localName, [...el.classList].sort().join(' '), el.dataset.icon || '', clip(el.textContent)].join('|'));

export const screenName = (q) => q.get('screen') || decodeURIComponent(location.pathname.split('/').pop() || '').replace(/\.html?$/, '');

function walk(el, base) {
  const counts = new Map();
  for (const c of el.children) {
    if (SKIP.has(c.localName)) continue;
    const k = keyOf(c);
    const n = (counts.get(k) || 0) + 1;
    counts.set(k, n);
    const own = c.dataset.id || c.dataset.box;
    const id = own || (base === '@' ? `@${k}:${n}` : `${base}/${k}:${n}`);
    if (!c.dataset.eid) {
      c.dataset.eid = id;
      FP.set(c, fingerprint(c));
    }
    if (c.localName !== 'svg') walk(c, own ? `@${own}` : c.dataset.eid);
  }
}

export function stampIds(root = document.body) {
  walk(root, root === document.body ? '@' : root.dataset.eid);
}

// system chrome built by kit/chrome.js: fixed ids, fingerprinted by the attribute they were built from
export function stampChrome() {
  const set = (n, id, src) => {
    if (!n) return;
    n.dataset.eid = id;
    FP.set(n, fnv1a(`chrome|${src}`));
  };
  document.querySelectorAll('.navbar').forEach((h, i) => {
    const pre = i ? `nav${i + 1}` : 'nav';
    set(h.querySelector(':scope > h1, :scope > .head > h1, .inline-title'), `${pre}:title`, h.dataset.title || '');
    set(h.querySelector(':scope > .overline, :scope > .head > .overline, .inline-title > small'), `${pre}:subtitle`, h.dataset.subtitle || '');
  });
  const tabs = document.querySelector('.tabbar[data-tabs]');
  const labels = tabs ? tabs.dataset.tabs.split(',').map((t) => t.trim().split(':')[0]) : [];
  document.querySelectorAll('.tabbar .tab').forEach((t, i) => set(t.querySelector('span:last-child'), `tabs:${i + 1}`, labels[i] || ''));
  set(document.querySelector('.statusbar .time'), 'status:time', document.body.dataset.time || '');
  const fab = document.querySelector('.fab .label');
  if (fab) set(fab, 'fab:label', FP.has(fab) ? clip(fab.textContent) : fab.textContent);
}

// a data-<locale> or data-<platform> swap replaced an element's children: stamp the new ones (their fingerprint
// is this language's, so an edit made in another language never lands on them by accident)
export function restamp(kit) {
  const attrs = [...new Set([kit.family, kit.platform, kit.locale.toLowerCase()])].map((a) => `[data-${a}]`).join(',');
  for (const el of document.querySelectorAll(attrs)) if (el.dataset.eid) walk(el, el.dataset.eid.startsWith('@') ? el.dataset.eid : `@${el.dataset.eid}`);
}

export async function loadEdits(q) {
  const src = q.get('edits') || 'edits.json';
  if (src === 'none' || src === '0') return null;
  try {
    const r = await fetch(new URL(src.replace(/^\/+/, ''), ROOT), { cache: 'no-store' });
    if (!r.ok || r.status === 204) return null;
    return parseEdits(await r.text());
  } catch (err) {
    console.warn(`kit: ${src} could not be read (${err.message}): no edits`);
    return null;
  }
}

const byEid = (eid) => [...document.querySelectorAll('[data-eid]')].find((n) => n.dataset.eid === eid) || null;
const twins = (of) => [...document.querySelectorAll('[data-eid]')].filter((n) => FP.get(n) === of);

// the text node an edit replaces: the element's first non-blank direct text node
function textNode(el) {
  return [...el.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim()) || null;
}

const paint = (v) => (TOKEN.test(v) ? `var(--${v})` : v);

function remember(el) {
  if (!BASE.has(el)) { const t = textNode(el); BASE.set(el, { style: el.getAttribute('style'), text: t ? t.nodeValue : null }); }
}

// one cleaned edit -> the element (styles inline with !important; text with textContent, never HTML)
export function applyOne(el, e, kit) {
  remember(el);
  const st = el.style;
  const imp = (p, v) => st.setProperty(p, v, 'important');
  if (e.text && typeof e.text[kit.locale] === 'string') {
    const t = textNode(el);
    if (t) t.nodeValue = t.nodeValue.replace(t.nodeValue.trim(), e.text[kit.locale]);
    else if (!el.children.length) el.textContent = e.text[kit.locale];
    else return `has no text of its own (edit a text inside it)`;
  }
  if (e.color) imp('color', paint(e.color));
  if (e.bg) imp('background', e.bg === 'none' ? 'none' : paint(e.bg));
  if (e.size) imp('font-size', `${e.size}px`);
  if (e.weight) imp('font-weight', String(e.weight));
  if (e.hidden) imp('visibility', 'hidden');
  if (e.dx || e.dy) imp('translate', `${e.dx || 0}px ${e.dy || 0}px`);
  return null;
}

export function applyEdits(kit, edits) {
  const name = screenName(new URLSearchParams(location.search));
  for (const [eid, raw] of screenEdits(edits, name, kit.platform, kit.family)) {
    const { clean: e, errors } = cleanScreenEdit(raw);
    const at = `edits.json: ${name} › ${eid}`;
    if (errors.length) found.push(`${at}: ${errors.join('; ')} (those values are ignored)`);
    let el = byEid(eid);
    const auto = eid.startsWith('@');
    if (e.of && (!el || FP.get(el) !== e.of)) {
      const same = twins(e.of);
      if (auto && same.length === 1) {
        found.push(`${at} no longer points at the same element: re-anchored to ${same[0].dataset.eid} (save it again, or give the element a data-id)`);
        [el] = same;
      } else if (auto || !el) {
        const now = el ? `"${clip(el.textContent, 40)}"` : 'it is gone';
        found.push(`${at} no longer matches (${now}): skipped`);
        continue;
      } else found.push(`${at}: the element changed since the edit was made (still applied: fold the edit into the screen)`);
    }
    if (!el) { found.push(`${at}: no such element: skipped`); continue; }
    const why = applyOne(el, e, kit);
    if (why) found.push(`${at} ${why}: text skipped`);
    el.dataset.edited = '1';
  }
}

export const editIssues = () => found.slice();

// Mockup Studio: the screen's layers and live previews (nothing is saved from here; the Studio writes edits.json).
// A layer: eid, of, depth, kind (text | box | icon | chrome), name, text (all its words), own (the words an edit
// replaces), base (those words before any edit), icon, rect (CSS px of the screen), styles (computed).
const TEXTY = (el) => !!textNode(el) || (!el.children.length && !!el.textContent.trim());
const ownText = (el) => { const t = textNode(el); return t ? t.nodeValue.trim() : el.textContent.trim(); };
export const editApi = (kit) => ({
  layers: () => [...document.querySelectorAll('[data-eid]')].map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const texty = TEXTY(el);
    const b = BASE.get(el);
    let depth = 0;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (p.dataset.eid) depth++;
    return {
      eid: el.dataset.eid, of: FP.get(el) || null, depth, edited: el.dataset.edited === '1', hidden: cs.visibility === 'hidden',
      kind: /^(nav|tabs|status|fab)\d*:/.test(el.dataset.eid) ? 'chrome' : el.dataset.icon ? 'icon' : texty ? 'text' : 'box',
      name: el.dataset.id || el.dataset.box || el.dataset.eid, text: texty ? clip(el.textContent, 120) : null,
      own: texty ? ownText(el) : null, base: texty ? (b && b.text !== null ? b.text.trim() : ownText(el)) : null,
      icon: el.dataset.icon || null, rect: { x: r.left, y: r.top, w: r.width, h: r.height },
      styles: { color: cs.color, bg: cs.backgroundColor, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400 },
    };
  }),
  set: (eid, v) => { const el = byEid(eid); if (!el) return false; applyOne(el, cleanScreenEdit(v).clean, kit); return true; },
  clear: (eid) => {
    const el = byEid(eid);
    const b = el && BASE.get(el);
    if (!b) return false;
    if (b.style === null) el.removeAttribute('style'); else el.setAttribute('style', b.style);
    const t = textNode(el);
    if (t && b.text !== null) t.nodeValue = b.text;
    delete el.dataset.edited;
    return true;
  },
  base: (eid) => { const el = byEid(eid); return el ? { of: FP.get(el) || null, ...(BASE.get(el) || { text: textNode(el) && textNode(el).nodeValue }) } : null; },
});
