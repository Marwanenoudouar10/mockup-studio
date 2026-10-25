// Bake, part 2: the copy edits of edits.json (scripts/lib/edits.js) folded into the config source: a headline,
// sub or stage text that is a plain string or a per-locale object literal gets the edited words in place; a
// string in a config with several languages becomes { en: 'old', es: 'new' } (what the edit meant). Anything
// else (a store variant, a template literal, a computed value) stays in edits.json. Screen edits always stay
// (the kit applies them on every capture and live screen).
//   foldCopy({ root, cfg, edits, ed }) -> { done: [lines], left: edits.json without what was folded }
import { prop } from './scan.js';
import { findElement } from './patch.js';
import { sanitizeHeadline, plainText, LOCALE } from '../edits.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const keyStr = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : quote(k));

// one text property -> true (edits queued) or why it stays in edits.json
function foldText(owner, field, map, { cfg, ed, src }) {
  const clean = Object.fromEntries(Object.entries(map).filter(([l, v]) => LOCALE.test(l) && typeof v === 'string')
    .map(([l, v]) => [l, field === 'headline' ? sanitizeHeadline(v) : plainText(v, 300)]));
  if (!Object.keys(clean).length) return 'nothing to fold';
  const p = prop(owner, field);
  const val = p && p.value;
  const multi = cfg.locales.length > 1;
  if (!val) {
    const all = multi ? Object.fromEntries(cfg.locales.map((l) => [l, ''])) : {};
    const body = multi ? `{ ${Object.entries({ ...all, ...clean }).map(([l, v]) => `${keyStr(l)}: ${quote(v)}`).join(', ')} }` : quote(Object.values(clean)[0]);
    ed.insertProp(owner, `${field}: ${body}`);
    return true;
  }
  if (val.kind === 'str') {
    if (!multi) { ed.replaceNode(val, quote(clean[cfg.locales[0]] ?? Object.values(clean)[0])); return true; }
    const old = src.slice(val.s, val.e);
    ed.replaceNode(val, `{ ${cfg.locales.map((l) => `${keyStr(l)}: ${l in clean ? quote(clean[l]) : old}`).join(', ')} }`);
    return true;
  }
  if (val.kind === 'object' && !val.opaque && val.props.every((q) => LOCALE.test(q.key) && cfg.locales.includes(q.key) && q.value.kind === 'str')) {
    for (const [l, v] of Object.entries(clean)) {
      const q = prop(val, l);
      if (q) ed.replaceNode(q.value, quote(v));
      else ed.insertProp(val, `${keyStr(l)}: ${quote(v)}`);
    }
    return true;
  }
  return `${field} is not a string or a per-language object in the config`;
}

export function foldCopy({ root, cfg, edits, ed, src }) {
  const done = [];
  const left = JSON.parse(JSON.stringify(edits || {}));
  const ctx = { cfg, ed, src };
  const panels = prop(root, 'panels');
  const ownerOf = (key) => {
    if (key === 'feature') { const f = prop(root, 'feature'); return f && f.value.kind === 'object' ? f.value : null; }
    if (!panels || panels.value.kind !== 'array') return null;
    const n = panels.value.items[Number(key) - 1];
    return n && n.kind === 'object' && !n.opaque ? n : null;
  };
  for (const [key, c] of Object.entries(isObj(edits && edits.copy) ? edits.copy : {})) {
    const owner = ownerOf(key);
    for (const field of ['headline', 'sub']) {
      if (!isObj(c && c[field])) continue;
      const ok = owner ? foldText(owner, field, c[field], ctx) : 'its panel is not a plain object in the config';
      if (ok !== true) { done.push(`kept copy ${key} ${field} in edits.json (${ok})`); continue; }
      delete left.copy[key][field];
      done.push(`copy ${key === 'feature' ? 'feature graphic' : `panel ${key}`} ${field}: ${Object.keys(c[field]).join(', ')}`);
    }
    if (c && c.stale && Object.keys(c.stale).length) {
      done.push(`kept copy ${key} stale marker in edits.json (${Object.entries(c.stale).map(([f, l]) => `${f}: ${[].concat(l).join(', ')}`).join('; ')} not retyped after another language changed)`);
    }
    if (left.copy[key] && !Object.keys(left.copy[key]).length) delete left.copy[key];
  }
  for (const [panel, els] of Object.entries(isObj(edits && edits.stage) ? edits.stage : {})) {
    const owner = ownerOf(panel);
    const st = owner && prop(owner, 'stage');
    for (const [id, e] of Object.entries(isObj(els) ? els : {})) {
      const el = st && st.value.kind === 'array' ? findElement(st.value, id) : null;
      const ok = el ? foldText(el, 'text', (e && e.text) || {}, ctx) : 'no plain stage array with that element';
      if (ok !== true) { done.push(`kept stage ${panel} element ${id} text in edits.json (${ok})`); continue; }
      delete left.stage[panel][id];
      done.push(`stage text: panel ${panel} element ${id}`);
    }
    if (left.stage[panel] && !Object.keys(left.stage[panel]).length) delete left.stage[panel];
  }
  for (const k of ['copy', 'stage']) if (isObj(left[k]) && !Object.keys(left[k]).length) delete left[k];
  return { done, left, folded: done.filter((d) => !d.startsWith('kept')).length };
}
