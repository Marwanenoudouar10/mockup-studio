// Clean-up of the tree before it is written (Figma shows every group as a layer, so fewer and better named):
//   cut(tree, rect, pad)  a panorama image: drop the groups whose page box misses that image (shadows: pad)
//   tidy(tree, defs)      merge wrapper groups into their only child (a <g> with nothing but a transform: the
//                         transforms compose, the stronger name stays: names.js levels), drop empty groups, give
//                         every named node its id (unique in this file), keep only the defs something still uses
//   layerNamer()          raw name -> a readable, valid, unique id: 'phone "home"' -> 'phone-home', '01' -> 'n-01'
//   stats(tree)           { texts, groups, images, foreignObject }
// Pure: a panorama's slices share nodes (cut copies only the path to them), so nothing here changes a node.
export function layerNamer() {
  const seen = new Map();
  const used = new Set();
  return (raw) => {
    let base = String(raw || 'layer').toLowerCase().replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'layer';
    if (/^[\d-]/.test(base)) base = `n-${base}`;
    let n = seen.get(base) || 0;
    let name;
    do { n++; name = n === 1 ? base : `${base}-${n}`; } while (used.has(name)); // 'tabs:2' and a second 'tabs'
    seen.set(base, n);
    used.add(name);
    return name;
  };
}

const overlaps = (b, r, pad) => !b || (b[2] >= r[0] - pad && b[0] <= r[2] + pad && b[3] >= r[1] - pad && b[1] <= r[3] + pad);

// the box of everything a node draws (its own and its children's: content may overflow its parent)
function inkBox(n) {
  let b = n.meta && n.meta.bbox ? [...n.meta.bbox] : null;
  for (const k of n.kids || []) {
    if (!k.tag) continue;
    const c = inkBox(k);
    if (c) b = b ? [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[2]), Math.max(b[3], c[3])] : c;
  }
  if (n.meta) n.meta.ink = b;
  return b;
}

export function cut(tree, rect, pad = 300) {
  inkBox(tree);
  const keep = (n) => {
    if (!n.tag) return n;
    if (n.tag === 'g' && n.meta && n.meta.ink && !overlaps(n.meta.ink, rect, pad)) return null;
    return { ...n, kids: (n.kids || []).map(keep).filter(Boolean) };
  };
  return keep(tree);
}

// a <g> that only moves its one child (or does nothing) -> that child, moved; the name: the stronger one, a tie
// goes to the child (the more specific)
function collapse(n) {
  if (!n.tag) return n;
  const kids = (n.kids || []).map(collapse).filter((k) => k && (!k.tag || k.tag !== 'g' || k.kids.length));
  const self = { ...n, kids };
  const [c] = kids;
  if (n.tag !== 'g' || kids.length !== 1 || !c.tag || !Object.keys(n.attrs).every((a) => a === 'transform')) return self;
  const tr = [n.attrs.transform, c.attrs.transform].filter(Boolean).join(' ');
  const pm = n.meta || {};
  const cm = c.meta || {};
  const name = cm.name && (!pm.name || (cm.level ?? 0) >= (pm.level ?? 0)) ? { name: cm.name, level: cm.level } : { name: pm.name, level: pm.level };
  return { ...c, attrs: { ...c.attrs, ...(tr ? { transform: tr } : {}) }, meta: { ...pm, ...cm, ...name } };
}

// every named node -> its id, in document order, unique in the file (id first, for a readable file)
function named(n, namer) {
  if (!n.tag) return n;
  const id = n.meta && n.meta.name ? namer(n.meta.name) : null; // a parent before its children
  const kids = n.kids.map((k) => named(k, namer));
  return id ? { ...n, attrs: { id, ...n.attrs }, kids } : { ...n, kids };
}

function refsOf(n, out = new Set()) {
  if (!n.tag) return out;
  for (const v of Object.values(n.attrs)) {
    const s = String(v);
    for (const m of s.matchAll(/url\(#([^)]+)\)/g)) out.add(m[1]);
    if (/^#/.test(s) && !/^#[0-9a-f]{3,8}$/i.test(s)) out.add(s.slice(1));
  }
  for (const k of n.kids) refsOf(k, out);
  return out;
}

// -> { tree, defs } with only the defs the tree (or another kept def) refers to
export function tidy(tree, defs) {
  const t = named(collapse(tree) || { tag: 'g', attrs: {}, kids: [] }, layerNamer());
  const byId = new Map(defs.map((d) => [d.attrs.id, d]));
  const need = refsOf(t);
  const kept = new Map();
  const queue = [...need];
  while (queue.length) {
    const id = queue.pop();
    if (kept.has(id) || !byId.has(id)) continue;
    kept.set(id, byId.get(id));
    for (const r of refsOf(byId.get(id))) queue.push(r);
  }
  return { tree: t, defs: defs.filter((d) => kept.has(d.attrs.id)) };
}

export function stats(tree) {
  const s = { texts: 0, groups: 0, images: 0, foreignObject: 0 };
  const walk = (n) => {
    if (!n.tag) return;
    if (n.tag === 'text') s.texts++;
    if (n.tag === 'g' && n.attrs.id) s.groups++;
    if (n.tag === 'image') s.images++;
    if (n.tag === 'foreignObject') s.foreignObject++;
    n.kids.forEach(walk);
  };
  walk(tree);
  return s;
}
