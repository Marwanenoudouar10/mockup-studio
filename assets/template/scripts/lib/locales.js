// Untranslated copy, found in the config itself (render prints it, validate warns, --strict fails):
//   - a per-language text that lacks a language the config renders: headline: { en: '...' } with locales
//     ['en', 'fr'] renders the English line on the French images;
//   - a plain string headline, sub or badge text in a config with several languages: the same words on
//     every language's images.
// The screens are checked by the pages (engine/core/assets.js): a screen borrowed from the default language.
import { keySet } from './config.js';

const TEXT = new Set(['headline', 'sub', 'text', 'title', 'label']);
const PER_LANGUAGE = new Set(['headline', 'sub', 'text']); // a plain string here is almost always untranslated
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const LOCALE = /^[a-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/;

function walk(v, ctx, where, textKey, out) {
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, ctx, textKey ? where : `${where} #${i + 1}`, textKey, out));
  if (!isPlain(v)) {
    if (textKey && PER_LANGUAGE.has(textKey) && typeof v === 'string' && v.trim() && ctx.locales.length > 1) {
      out.push({ locale: null, where, text: `${textKey} is one string for every language ("${v.replace(/<[^>]+>/g, '').slice(0, 40)}")` });
    }
    return undefined;
  }
  const keys = Object.keys(v);
  if (textKey && keys.some((k) => ctx.locales.includes(k) || (LOCALE.test(k) && !ctx.other.has(k)))) {
    for (const l of ctx.locales) {
      if (!(l in v)) out.push({ locale: l, where, text: `${textKey} has no "${l}" text (${v[ctx.defaultLocale] !== undefined ? ctx.defaultLocale : keys[0]} is used)` });
    }
    return undefined;
  }
  for (const [k, x] of Object.entries(v)) {
    if (k === 'stage' || k === 'only' || k === 'id') { if (k === 'stage') walk(x, ctx, `${where} stage`, null, out); continue; }
    walk(x, ctx, where, textKey || (TEXT.has(k) ? k : null), out);
  }
  return undefined;
}

// -> [{ locale (null = every language but the default), label, text }]
export function textFindings(cfg) {
  const keys = keySet(cfg);
  const ctx = { locales: cfg.locales, defaultLocale: cfg.defaultLocale, other: new Set([...keys].filter((k) => !cfg.locales.includes(k))) };
  const out = [];
  cfg.panels.forEach((p) => walk({ ...p, id: undefined, space: undefined }, ctx, `panel ${p.id}`, null, out));
  if (cfg.feature) walk(cfg.feature, ctx, 'feature graphic', null, out);
  const seen = new Set();
  return out.filter((f) => {
    const k = `${f.locale}|${f.where}|${f.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map((f) => ({ locale: f.locale, label: `copy ${f.locale || 'all languages'}`, text: `${f.where}: ${f.text}` }));
}
