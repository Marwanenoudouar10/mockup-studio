// Turns layout.json entries into text edits on the config source (see scan.js for the reader).
//   "*" (or the feature graphic)  -> the plain number replaces the value (a per-store variant included)
//   one store                     -> { <store>: new, default: old } (or that key set inside an existing variant)
//   add                           -> a new element literal appended to the panel's stage (with its id)
// Anything bake cannot express safely (a computed value, a spread, a per-store radius) stays in layout.json.
import { prop } from './scan.js';
import { MOVABLE, FEATURE } from '../layout.js';

const fmt = (v) => String(Math.round(v * 100) / 100);
const keyStr = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`);
// a plain value as JS source: 'strings', numbers, booleans, [..], { key: .. }
function js(v) {
  if (typeof v === 'number') return fmt(v);
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (Array.isArray(v)) return `[${v.map(js).join(', ')}]`;
  if (v && typeof v === 'object') {
    const parts = Object.entries(v).filter(([, x]) => x !== undefined && x !== null).map(([k, x]) => `${keyStr(k)}: ${js(x)}`);
    return `{ ${parts.join(', ')} }`;
  }
  return String(v);
}
const ORDER = ['id', 'type', 'device', 'screen', 'box', 'src', 'text', 'icon', 'w', 'h', 'x', 'y', 'r', 'z'];

export function createEditor(src, keys) {
  const edits = [];
  const isVariant = (v) => v && v.kind === 'object' && v.props.length && !v.opaque
    && v.props.every((p) => keys.has(p.key) && p.value.kind === 'num');
  const replace = (node, text) => edits.push({ s: node.s, e: node.e, text });
  const insertProp = (obj, text) => {
    const last = obj.props[obj.props.length - 1];
    if (!last) edits.push({ s: obj.s + 1, e: obj.close, text: ` ${text} ` });
    else if (last.comma) edits.push({ s: last.comma, e: last.comma, text: ` ${text},` });
    else edits.push({ s: last.e, e: last.e, text: `, ${text}` });
  };

  // one property of one element: entries { '*': v, <store>: v, ... } -> true, or why it cannot be baked.
  // Runtime order is config < "*" < store, so "*" becomes the default and each store its own key.
  function setProp(obj, k, entries) {
    const all = entries['*'] ?? entries[FEATURE];
    const stores = Object.entries(entries).filter(([st]) => st !== '*' && st !== FEATURE);
    if (stores.length && k === 'radius') return 'a per-store radius';
    const p = prop(obj, k);
    const val = p && p.value;
    if (val && !(val.kind === 'num' || isVariant(val))) return `${k} is not a plain number`;
    let text = fmt(all);
    if (stores.length) {
      const parts = stores.map(([st, v]) => `${keyStr(st)}: ${fmt(v)}`);
      if (all !== undefined) parts.push(`default: ${fmt(all)}`);
      else if (val && val.kind === 'num') parts.push(`default: ${src.slice(val.s, val.e)}`);
      else if (val) for (const q of val.props) if (!(q.key in entries)) parts.push(`${keyStr(q.key)}: ${src.slice(q.value.s, q.value.e)}`);
      text = `{ ${parts.join(', ')} }`;
    }
    if (p) replace(val, text);
    else insertProp(obj, `${k}: ${text}`);
    return true;
  }

  function literal(el) {
    const keysOrder = [...ORDER.filter((k) => k in el), ...Object.keys(el).filter((k) => !ORDER.includes(k))];
    return js(Object.fromEntries(keysOrder.map((k) => [k, el[k]])));
  }

  function append(arr, text) {
    const last = arr.items[arr.items.length - 1];
    if (!last) { edits.push({ s: arr.s + 1, e: arr.close, text }); return; }
    const lineStart = src.lastIndexOf('\n', last.s) + 1;
    const indent = /^\s*/.exec(src.slice(lineStart, last.s))[0];
    if (last.comma) edits.push({ s: last.comma, e: last.comma, text: `\n${indent}${text},` });
    else edits.push({ s: last.e, e: last.e, text: `,\n${indent}${text}` });
  }

  // edits applied back to front; inserts at the same spot keep their order
  function apply() {
    const sorted = edits.map((x, n) => ({ ...x, n })).sort((a, b) => b.s - a.s || b.n - a.n);
    let out = src;
    for (const x of sorted) out = out.slice(0, x.s) + x.text + out.slice(x.e);
    return out;
  }

  return { setProp, literal, append, apply, count: () => edits.length };
}

// the stage array of a panel (or the feature), picking a variant stage by the candidate keys
export function stageArray(owner, candidates) {
  const p = prop(owner, 'stage');
  if (!p) return null;
  if (p.value.kind === 'array') return p.value;
  if (p.value.kind !== 'object' || p.value.opaque) return null;
  for (const k of candidates) {
    const hit = prop(p.value, k);
    if (hit && hit.value.kind === 'array') return hit.value;
  }
  return null;
}

// the element object for an id: an explicit `id: '..'` first, else the 1-based position
export function findElement(arr, id) {
  const unwrap = (n) => {
    if (!n || n.kind !== 'object' || n.opaque) return null;
    if (prop(n, 'type')) return n;
    const objs = n.props.filter((p) => p.value.kind === 'object');
    return n.props.length === 1 && objs.length === 1 && prop(objs[0].value, 'type') ? objs[0].value : null;
  };
  const byId = arr.items.map(unwrap).find((n) => {
    const p = prop(n, 'id');
    return p && (p.value.kind === 'str' || p.value.kind === 'num') && String(p.value.value) === String(id);
  });
  if (byId) return byId;
  const i = Number(id) - 1;
  if (!Number.isInteger(i) || i < 0 || i >= arr.items.length) return null;
  const n = unwrap(arr.items[i]);
  return n && !prop(n, 'id') ? n : null;
}

export const movable = (vals) => MOVABLE.filter((k) => vals[k] !== undefined);
