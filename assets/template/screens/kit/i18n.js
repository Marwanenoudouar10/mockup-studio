// Localised mock screens. Author the screen once in your default language, then either:
//   1. a shared dictionary: <meta name="kit-strings" content="strings.json"> with
//      { "es": { "Today": "Hoy", "See all": "Ver todo" } } -> every text node (and placeholder / aria-label)
//      whose trimmed text matches a key is replaced. Best for short UI strings.
//   2. per element: <p data-es="Texto con <b>marcado</b>">Text with <b>markup</b></p> -> innerHTML for that locale.
// Platform text works the same way: data-ios="Done" data-android="Save" (applied before the locale).
// scripts/screens.js captures every locale that has an entry in the dictionary (plus the default one).
// What is left in the default language: kit.untranslated() -> the visible texts, placeholders and chart labels
// (kit.t) this locale's dictionary does not cover. engine/core/live.js and scripts/screens.js report them for
// every locale but the default one. Not counted: strings with no letter ("9:41", "18°", "6.4k"), anything inside
// translate="no" (a name, the brand) or a data-<locale> element, inline SVG, and strings made only of words in
// the dictionary's "_same" list (the same in every language: { "_same": ["Sam", "Brimpage", "km"], "es": {...} }).
const RTL = ['ar', 'he', 'fa', 'ur'];
const LETTER = /\p{L}/u;
const WORDS = /\p{L}[\p{L}\p{M}'’-]*/gu;

export const isRtl = (locale) => RTL.includes(String(locale).split('-')[0]);

async function dictionary(locale) {
  const meta = document.querySelector('meta[name="kit-strings"]');
  if (!meta) return { dict: {}, same: [] };
  try {
    const r = await fetch(new URL(meta.content, location.href));
    if (!r.ok) throw new Error(`${r.status}`);
    const all = await r.json();
    return { dict: all[locale] || all[locale.split('-')[0]] || {}, same: Array.isArray(all._same) ? all._same.map(String) : [] };
  } catch (err) {
    console.warn(`kit: could not read ${meta.content} (${err.message})`);
    return { dict: {}, same: [] };
  }
}

function swap(attr) {
  for (const el of document.querySelectorAll(`[${attr}]`)) el.innerHTML = el.getAttribute(attr);
}

const has = (dict, s) => Object.prototype.hasOwnProperty.call(dict, s);

// the misses of this page: text nodes (checked when asked: an edit or a script may have replaced them since)
// and strings (placeholders, chart labels, kit.t calls)
const missed = { nodes: [], strings: new Set(), same: new Set(), on: false };

function counts(s) {
  const t = String(s || '').trim();
  if (!t || !LETTER.test(t) || missed.same.has(t)) return false;
  return !(t.match(WORDS) || []).every((w) => missed.same.has(w));
}

// kit.t: the word in this language (a miss is remembered once the dictionary is loaded)
export function translate(kit, s) {
  if (has(kit.strings, s)) return kit.strings[s];
  if (missed.on && counts(s)) missed.strings.add(String(s).trim());
  return s;
}

const skipped = (el, locale) => !el || !!el.closest(`[translate="no"], .notranslate, svg, script, style, template, [data-${locale}]`);

// -> the strings still in the default language, each once, in page order
export function untranslated() {
  const out = new Set();
  for (const { node, key } of missed.nodes) {
    const el = node.parentElement;
    if (!node.isConnected || node.nodeValue.trim() !== key || !el || !el.getClientRects().length) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    out.add(key);
  }
  for (const s of missed.strings) out.add(s);
  return [...out];
}

export async function localize(kit) {
  swap(`data-${kit.family}`);
  if (kit.platform !== kit.family) swap(`data-${kit.platform}`);
  const loc = kit.locale.toLowerCase();
  swap(`data-${loc}`);
  const { dict, same } = await dictionary(kit.locale);
  kit.strings = dict;
  if (!Object.keys(dict).length) return; // nothing for this locale: live.js / screens.js say so for the whole screen
  missed.same = new Set(same);
  missed.on = true;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const key = n.nodeValue.trim();
    if (!key) continue;
    if (has(dict, key)) n.nodeValue = n.nodeValue.replace(key, dict[key]);
    else if (counts(key) && !skipped(n.parentElement, loc)) missed.nodes.push({ node: n, key });
  }
  for (const el of document.querySelectorAll('[placeholder], [aria-label]')) {
    for (const a of ['placeholder', 'aria-label']) {
      const v = el.getAttribute(a);
      if (v && dict[v]) el.setAttribute(a, dict[v]);
      else if (a === 'placeholder' && v && counts(v) && !skipped(el, loc)) missed.strings.add(v.trim());
    }
  }
}
