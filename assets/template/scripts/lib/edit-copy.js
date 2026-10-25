// The copy part of edits.json (scripts/lib/edits.js): panel headlines and subs, the feature graphic's copy and
// stage element texts (badges, numerals), applied to the normalized config right after it loads (scripts/lib/
// cli.js and engine/core/boot.js), so every render, Mockup Studio, validate and bake see the edited words.
// Pure ESM (the pages import it too).
//   applyCopy(cfg, edits) -> [notes]   cfg is changed in place (its stages are copied first, never the module's)
// A text that is one string for every language becomes a per-locale map before the override, so an "es" edit
// leaves "en" alone; inside a store or platform variant ({ playstore: '', default: {...} }) every non-empty leaf
// takes the edit (an empty variant means "no sub here" and stays empty).
import { keySet } from './config.js';
import { sanitizeHeadline, plainText, LOCALE } from './edits.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const copyDeep = (v) => (Array.isArray(v) ? v.map(copyDeep) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copyDeep(x)])) : v);
const elementId = (e, i) => (e && e.id != null ? String(e.id) : String(i + 1));

export function withLocale(v, locale, text, ctx) {
  if (v == null || typeof v === 'string' || typeof v === 'number') {
    if (ctx.locales.length <= 1) return text;
    return { ...Object.fromEntries(ctx.locales.map((l) => [l, v == null ? '' : String(v)])), [locale]: text };
  }
  if (!isObj(v)) return v;
  const keys = Object.keys(v);
  if (keys.some((k) => ctx.locales.includes(k) || (LOCALE.test(k) && !ctx.other.has(k)))) return { ...v, [locale]: text };
  if (keys.every((k) => ctx.other.has(k))) {
    return Object.fromEntries(keys.map((k) => [k, v[k] === '' ? '' : withLocale(v[k], locale, text, ctx)]));
  }
  return v;
}

// every stage array of a panel: a plain array, or the arrays of a variant stage ({ portrait: [...], default: [...] })
function stageArrays(stage) {
  if (Array.isArray(stage)) return [stage];
  if (isObj(stage)) return Object.values(stage).flatMap(stageArrays);
  return [];
}

// an element literal, or the one element inside a per-store wrapper ({ appstore: { type: 'badge', ... } })
function unwrap(el) {
  if (!isObj(el) || el.type) return el;
  const vals = Object.values(el);
  return vals.length === 1 && isObj(vals[0]) ? vals[0] : el;
}

export function applyCopy(cfg, edits) {
  const notes = [];
  if (!cfg || !isObj(edits)) return notes;
  const keys = keySet(cfg);
  const ctx = { locales: cfg.locales || ['en'], other: new Set([...keys].filter((k) => !(cfg.locales || []).includes(k))) };
  if (isObj(cfg.feature)) cfg.feature = { ...cfg.feature }; // normalize() keeps the module's own object here
  const owner = (key) => (key === 'feature' ? cfg.feature : (cfg.panels || [])[Number(key) - 1]);
  for (const [key, c] of Object.entries(isObj(edits.copy) ? edits.copy : {})) {
    const o = owner(key);
    if (!isObj(c)) continue;
    if (!o) { notes.push(`edits.json: copy ${key}: no such ${key === 'feature' ? 'feature graphic' : 'panel'}: skipped`); continue; }
    for (const field of ['headline', 'sub']) {
      if (!isObj(c[field])) continue;
      for (const [l, raw] of Object.entries(c[field])) {
        if (!LOCALE.test(l) || typeof raw !== 'string') continue;
        o[field] = withLocale(o[field], l, field === 'headline' ? sanitizeHeadline(raw) : plainText(raw, 300), ctx);
      }
    }
  }
  for (const [panel, els] of Object.entries(isObj(edits.stage) ? edits.stage : {})) {
    const p = owner(panel);
    if (!p || !isObj(els)) continue;
    p.stage = copyDeep(p.stage);
    for (const [id, e] of Object.entries(els)) {
      if (!isObj(e) || !isObj(e.text)) continue;
      let hit = false;
      for (const arr of stageArrays(p.stage)) {
        arr.forEach((el, i) => {
          const t = unwrap(el);
          if (!isObj(t) || elementId(t, i) !== String(id) || t.text === undefined) return;
          for (const [l, raw] of Object.entries(e.text)) {
            if (LOCALE.test(l) && typeof raw === 'string') t.text = withLocale(t.text, l, plainText(raw, 300), ctx);
          }
          hit = true;
        });
      }
      if (!hit) notes.push(`edits.json: stage ${panel} element ${id}: no element with a text there: skipped`);
    }
  }
  return notes;
}
