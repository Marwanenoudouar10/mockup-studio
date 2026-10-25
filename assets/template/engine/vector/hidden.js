// What a clip hides is left out of the SVG. A lifted card is a window on a whole live screen, and a phone screen
// clips what lies below its fold: without this, the card's layer in Figma would hold the hidden navbar, tab bar
// and the other cards of that screen (and a text search would find them).
//   quadOf(G, b)              the four page corners of a box b of a frame whose page matrix is G (walk.js)
//   within(nodes, G, box)     the nodes without the groups whose ink (their own box and everything inside it)
//                             does not reach EDGE px into box, a clip box in the clipping element's own frame
// The test runs in the clip's frame (each corner mapped through G's inverse), so a rotated lift drops what lies
// outside its tilted card, not only what misses the card's axis-aligned page box. A box that only grazes the
// clip's edge (a line box above a card) shows nothing and goes too. Leaves without a box (a text run, a fill)
// stay with their group.
const EDGE = 3;

export const quadOf = (G, b) => [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
  .map(([x, y]) => { const p = G.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; });

export function within(nodes, G, box) {
  const inv = G.inverse();
  const ink = new Map();
  const grow = (b, x, y) => (b ? [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)] : [x, y, x, y]);
  const measure = (n) => {
    let b = null;
    for (const [x, y] of (n.meta && n.meta.quad) || []) {
      const p = inv.transformPoint(new DOMPoint(x, y));
      b = grow(b, p.x, p.y);
    }
    for (const k of n.kids) {
      if (!k.tag) continue;
      const c = measure(k);
      if (c) b = grow(grow(b, c[0], c[1]), c[2], c[3]);
    }
    ink.set(n, b);
    return b;
  };
  const shows = (b) => b[2] > box[0] + EDGE && b[0] < box[2] - EDGE && b[3] > box[1] + EDGE && b[1] < box[3] - EDGE;
  const keep = (n) => {
    if (!n.tag) return n;
    const b = ink.get(n);
    if (n.tag === 'g' && b && !shows(b)) return null;
    return { ...n, kids: n.kids.map(keep).filter(Boolean) };
  };
  return nodes.filter(Boolean).map((n) => (n.tag ? (measure(n), keep(n)) : n)).filter(Boolean);
}
