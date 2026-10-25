// Bake's safety net: the patched config (with whatever stays in layout.json and edits.json) must place every
// element of every store, locale and panel exactly where the old config + layout.json did, and show the same
// words (texts) as the old config + edits.json. Otherwise nothing is written.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalize, target, featureTarget } from '../config.js';
import { withTokens } from '../tokens.js';
import { MOVABLE } from '../layout.js';

const KEYS = ['type', 'screen', 'box', ...MOVABLE];

// { 'store|locale|panel|id': {type, screen, box, x, y, ...} } for every element the config draws
export function placements(cfg) {
  const out = {};
  const put = (k, e) => { out[k] = Object.fromEntries(KEYS.filter((x) => e[x] !== undefined).map((x) => [x, e[x]])); };
  for (const locale of cfg.locales) {
    for (const st of cfg.stores) {
      for (const p of target(cfg, { store: st.id, locale }).panels) for (const e of p.stage) put(`${st.id}|${locale}|${p.id}|${e.id}`, e);
    }
    if (cfg.feature) for (const e of featureTarget(cfg, locale).feature.stage) put(`feature|${locale}|1|${e.id}`, e);
  }
  return out;
}

// { 'store|locale|panel|field': text } for every headline, sub and stage text the config shows (copy edits)
export function texts(cfg) {
  const out = {};
  for (const locale of cfg.locales) {
    for (const st of cfg.stores) {
      for (const p of target(cfg, { store: st.id, locale }).panels) {
        out[`${st.id}|${locale}|${p.id}|headline`] = p.headline ?? null;
        out[`${st.id}|${locale}|${p.id}|sub`] = p.sub ?? null;
        for (const e of p.stage) if (e.text !== undefined) out[`${st.id}|${locale}|${p.id}|${e.id}`] = e.text;
      }
    }
    if (cfg.feature) {
      const f = featureTarget(cfg, locale).feature;
      out[`feature|${locale}|headline`] = f.headline ?? null;
      out[`feature|${locale}|sub`] = f.sub ?? null;
      for (const e of f.stage) if (e.text !== undefined) out[`feature|${locale}|${e.id}`] = e.text;
    }
  }
  return out;
}

export function diff(a, b) {
  const rows = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = JSON.stringify(a[k] || null);
    const y = JSON.stringify(b[k] || null);
    if (x !== y) rows.push(`${k}: expected ${x}, got ${y}`);
  }
  return rows;
}

// imports the patched source from a temporary file next to the config (so its own imports still resolve)
export async function loadPatched(absConfig, text, tokens, overrides) {
  const tmp = path.join(path.dirname(absConfig), `.bake-check-${process.pid}.config.js`);
  fs.writeFileSync(tmp, text);
  try {
    const mod = await import(`${pathToFileURL(tmp).href}?t=${Date.now()}`);
    const cfg = normalize(withTokens(mod.default, tokens));
    cfg.overrides = overrides;
    return cfg;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
