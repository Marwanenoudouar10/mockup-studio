// A small reader for the object/array literals in studio.config.js, so `npm run bake` can change numbers
// in place and keep every comment, variant and line break the person wrote. It knows comments, strings,
// template literals, numbers, identifiers, objects and arrays; anything else (a call, a spread, an
// expression) is an opaque value that bake never touches.

export function tokenize(src) {
  const toks = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); i = j < 0 ? n : j; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      toks.push({ t: 'str', s: i, e: j + 1, v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (c === '`') {
      let j = i + 1;
      let depth = 0;
      while (j < n && !(depth === 0 && src[j] === '`')) {
        if (src[j] === '\\') j++;
        else if (src[j] === '$' && src[j + 1] === '{') { depth++; j++; } else if (depth && src[j] === '}') depth--;
        j++;
      }
      toks.push({ t: 'tpl', s: i, e: j + 1 });
      i = j + 1;
      continue;
    }
    const num = /^(0x[0-9a-f]+|(\d+\.?\d*|\.\d+)(e[+-]?\d+)?)/i.exec(src.slice(i, i + 40));
    if (num && /[0-9.]/.test(c)) { toks.push({ t: 'num', s: i, e: i + num[0].length, v: Number(num[0]) }); i += num[0].length; continue; }
    const id = /^[A-Za-z_$][\w$]*/.exec(src.slice(i, i + 200));
    if (id) { toks.push({ t: 'id', s: i, e: i + id[0].length, v: id[0] }); i += id[0].length; continue; }
    if (src.startsWith('...', i)) { toks.push({ t: 'p', s: i, e: i + 3, v: '...' }); i += 3; continue; }
    toks.push({ t: 'p', s: i, e: i + 1, v: c });
    i++;
  }
  return toks;
}

const isP = (t, v) => t && t.t === 'p' && t.v === v;
const isEnd = (t) => !t || isP(t, ',') || isP(t, '}') || isP(t, ']');

// tokens up to the next , } ] at depth 0 -> index of that token
function skip(toks, i) {
  let depth = 0;
  for (; i < toks.length; i++) {
    const v = toks[i].t === 'p' ? toks[i].v : null;
    if (v === '(' || v === '[' || v === '{') depth++;
    else if (v === ')' || v === ']' || v === '}') { if (!depth) break; depth--; } else if (v === ',' && !depth) break;
  }
  return i;
}

function value(toks, i) {
  const t = toks[i];
  if (isP(t, '{')) return object(toks, i);
  if (isP(t, '[')) return array(toks, i);
  if (t.t === 'num' && isEnd(toks[i + 1])) return { kind: 'num', value: t.v, s: t.s, e: t.e, i: i + 1 };
  if ((isP(t, '-') || isP(t, '+')) && toks[i + 1] && toks[i + 1].t === 'num' && isEnd(toks[i + 2])) {
    return { kind: 'num', value: (t.v === '-' ? -1 : 1) * toks[i + 1].v, s: t.s, e: toks[i + 1].e, i: i + 2 };
  }
  if (t.t === 'str' && isEnd(toks[i + 1])) return { kind: 'str', value: t.v, s: t.s, e: t.e, i: i + 1 };
  const j = skip(toks, i);
  return { kind: 'other', s: t.s, e: toks[j - 1].e, i: j };
}

function object(toks, i) {
  const node = { kind: 'object', s: toks[i].s, props: [] };
  i++;
  while (i < toks.length && !isP(toks[i], '}')) {
    const k = toks[i];
    if (['id', 'str', 'num'].includes(k.t) && isP(toks[i + 1], ':')) {
      const v = value(toks, i + 2);
      node.props.push({ key: String(k.v), value: v, s: k.s, e: v.e });
      i = v.i;
    } else {
      const j = skip(toks, i);
      node.props.push({ opaque: true, s: k.s, e: toks[j - 1].e });
      node.opaque = true;
      i = j;
    }
    if (isP(toks[i], ',')) { node.props[node.props.length - 1].comma = toks[i].e; i++; }
  }
  return { ...node, close: toks[i].s, e: toks[i].e, i: i + 1 };
}

function array(toks, i) {
  const node = { kind: 'array', s: toks[i].s, items: [] };
  i++;
  while (i < toks.length && !isP(toks[i], ']')) {
    const v = value(toks, i);
    node.items.push(v);
    i = v.i;
    if (isP(toks[i], ',')) { v.comma = toks[i].e; i++; }
  }
  return { ...node, close: toks[i].s, e: toks[i].e, i: i + 1 };
}

// The config object: `export default { ... }` or `export default name` + `const name = { ... }`.
export function readConfig(src) {
  const toks = tokenize(src);
  const at = toks.findIndex((t, i) => t.v === 'export' && toks[i + 1] && toks[i + 1].v === 'default');
  if (at < 0) throw new Error('no `export default` in the config');
  let i = at + 2;
  if (toks[i].t === 'id') {
    const name = toks[i].v;
    const d = toks.findIndex((t, j) => ['const', 'let', 'var'].includes(t.v) && toks[j + 1] && toks[j + 1].v === name && isP(toks[j + 2], '='));
    if (d < 0) throw new Error(`bake: cannot find the object literal for \`export default ${name}\``);
    i = d + 3;
  }
  if (!isP(toks[i], '{')) throw new Error('bake understands configs written as an object literal (export default { ... })');
  return object(toks, i);
}

export const prop = (obj, key) => (obj && obj.kind === 'object' ? obj.props.find((p) => p.key === key) || null : null);
