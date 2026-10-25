// The SVG being built, as a small tree (serialized once at the end, after tidy.js), and number formatting.
//   h('g', { id: 'phone-home', transform }, [children])     a node; children are nodes or { text: '...' }
//   node.meta: what tidy.js and index.js need but the file must not show (page bbox, font use)
// Precision: coordinates and lengths keep 2 decimals (f2); transform matrices and scale factors keep 6 (f6, mat),
// because a scale rounded to 0.52 moves a far corner by pixels (a lesson from the prototype).
export const f2 = (n) => {
  const v = Math.round(Number(n) * 100) / 100;
  return Object.is(v, -0) ? '0' : String(v);
};
export const f6 = (n) => {
  const v = +Number(n).toFixed(6);
  return Object.is(v, -0) ? '0' : String(v);
};

// a DOMMatrix -> matrix(a b c d e f): factors with 6 decimals, the translation with 3
export const mat = (m) => `matrix(${[m.a, m.b, m.c, m.d].map((v) => (Math.abs(v) < 1e-9 ? 0 : f6(v)))
  .concat([m.e, m.f].map((v) => +Number(v).toFixed(3))).join(' ')})`;

export const isIdentity = (m) => Math.abs(m.a - 1) < 1e-9 && Math.abs(m.d - 1) < 1e-9 && Math.abs(m.b) < 1e-9
  && Math.abs(m.c) < 1e-9 && Math.abs(m.e) < 1e-6 && Math.abs(m.f) < 1e-6;

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function h(tag, attrs = {}, kids = [], meta = null) {
  const a = {};
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== '') a[k] = v;
  const node = { tag, attrs: a, kids: kids.filter(Boolean) };
  if (meta) node.meta = meta;
  return node;
}

export function serialize(n) {
  if (n.text !== undefined) return esc(n.text);
  const a = Object.entries(n.attrs).map(([k, v]) => ` ${k}="${typeof v === 'number' ? f2(v) : esc(v)}"`).join('');
  if (!n.kids.length) return `<${n.tag}${a}/>`;
  return `<${n.tag}${a}>${n.kids.map(serialize).join('')}</${n.tag}>`;
}

// a rounded rect: per-corner [rx, ry] radii (already clamped) -> <rect> when it can, else a path
export function rrect(x, y, w, h0, R) {
  const r = R.map((v) => (Array.isArray(v) ? v : [v, v]));
  if (r.every(([a, b]) => !a && !b)) return { tag: 'rect', attrs: { x, y, width: w, height: h0 } };
  const same = r.every(([a, b]) => a === r[0][0] && b === r[0][1]);
  if (same) return { tag: 'rect', attrs: { x, y, width: w, height: h0, rx: r[0][0], ry: r[0][1] === r[0][0] ? null : r[0][1] } };
  return { tag: 'path', attrs: { d: rpath(x, y, w, h0, r) } };
}

export function rpath(x, y, w, h0, R) {
  const [[a1, b1], [a2, b2], [a3, b3], [a4, b4]] = R.map((v) => (Array.isArray(v) ? v : [v, v]));
  return `M${f2(x + a1)} ${f2(y)}H${f2(x + w - a2)}A${f2(a2)} ${f2(b2)} 0 0 1 ${f2(x + w)} ${f2(y + b2)}V${f2(y + h0 - b3)}`
    + `A${f2(a3)} ${f2(b3)} 0 0 1 ${f2(x + w - a3)} ${f2(y + h0)}H${f2(x + a4)}A${f2(a4)} ${f2(b4)} 0 0 1 ${f2(x)} ${f2(y + h0 - b4)}`
    + `V${f2(y + b1)}A${f2(a1)} ${f2(b1)} 0 0 1 ${f2(x + a1)} ${f2(y)}Z`;
}

// 'a(b, c), d' -> ['a(b, c)', 'd'] (top-level split)
export function split(s, sep = ',') {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(s ?? '')) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
export const words = (s) => split(s, ' ').filter(Boolean);

// computed border radii -> [[rx, ry] x 4] (tl, tr, br, bl), clamped like CSS (one factor for every corner)
export function radii(st, w, h0) {
  const px = (s, base) => (String(s).endsWith('%') ? (parseFloat(s) / 100) * base : parseFloat(s) || 0);
  const R = [st.borderTopLeftRadius, st.borderTopRightRadius, st.borderBottomRightRadius, st.borderBottomLeftRadius].map((v) => {
    const [a, b] = words(v);
    return [px(a, w), px(b ?? a, h0)];
  });
  const k = Math.min(1, w / ((R[0][0] + R[1][0]) || 1), w / ((R[3][0] + R[2][0]) || 1), h0 / ((R[0][1] + R[3][1]) || 1), h0 / ((R[1][1] + R[2][1]) || 1));
  return R.map(([a, b]) => [a * k, b * k]);
}
export const scaleR = (R, k) => R.map(([a, b]) => [a * k, b * k]);
