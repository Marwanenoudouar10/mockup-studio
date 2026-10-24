// Localised mock screens. Author the screen once in your default language, then either:
//   1. a shared dictionary: <meta name="kit-strings" content="strings.json"> with
//      { "es": { "Today": "Hoy", "See all": "Ver todo" } } -> every text node (and placeholder / aria-label)
//      whose trimmed text matches a key is replaced. Best for short UI strings.
//   2. per element: <p data-es="Texto con <b>marcado</b>">Text with <b>markup</b></p> -> innerHTML for that locale.
// Platform text works the same way: data-ios="Done" data-android="Save" (applied before the locale).
// scripts/screens.js captures every locale that has an entry in the dictionary (plus the default one).
const RTL = ['ar', 'he', 'fa', 'ur'];

export const isRtl = (locale) => RTL.includes(String(locale).split('-')[0]);

async function dictionary(locale) {
  const meta = document.querySelector('meta[name="kit-strings"]');
  if (!meta) return {};
  try {
    const r = await fetch(new URL(meta.content, location.href));
    if (!r.ok) throw new Error(`${r.status}`);
    const all = await r.json();
    return all[locale] || all[locale.split('-')[0]] || {};
  } catch (err) {
    console.warn(`kit: could not read ${meta.content} (${err.message})`);
    return {};
  }
}

function swap(attr) {
  for (const el of document.querySelectorAll(`[${attr}]`)) el.innerHTML = el.getAttribute(attr);
}

export async function localize(kit) {
  swap(`data-${kit.family}`);
  if (kit.platform !== kit.family) swap(`data-${kit.platform}`);
  swap(`data-${kit.locale.toLowerCase()}`);
  const dict = await dictionary(kit.locale);
  kit.strings = dict;
  if (!Object.keys(dict).length) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const key = n.nodeValue.trim();
    if (key && Object.prototype.hasOwnProperty.call(dict, key)) n.nodeValue = n.nodeValue.replace(key, dict[key]);
  }
  for (const el of document.querySelectorAll('[placeholder], [aria-label]')) {
    for (const a of ['placeholder', 'aria-label']) {
      const v = el.getAttribute(a);
      if (v && dict[v]) el.setAttribute(a, dict[v]);
    }
  }
}
