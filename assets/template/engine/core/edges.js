// Where to look for a lifted card that dissolves into its field (an orange card lifted onto an orange field reads
// as a hole in it): sample points just inside and just outside each side of every lift, as image pixels at scale 1,
// for scripts/lib/lift-edge.js, which reads the rendered PNG there (a field is a gradient: only the pixels say what
// colour sits behind the card). The middle 60% of each side, so rounded corners never count; points under another
// stage element (a phone, a badge, the copy) are left out, so only the field itself is compared.
//   liftSamples(cv) -> [{ what, slice, sides: [{ inner: [[x, y]], outer: [[x, y]] }] }]
const IN = 8; // px inside the card's edge (past its hairline outline)
const OUT = 10; // px outside it
const STEPS = [0.2, 0.35, 0.5, 0.65, 0.8];

// local points of a lift -> page points, through its transform: zero-size markers inside it, measured, removed
function toPage(node, pts) {
  return pts.map(([x, y]) => {
    const m = document.createElement('i');
    m.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0`;
    node.appendChild(m);
    const r = m.getBoundingClientRect();
    m.remove();
    return [r.left, r.top];
  });
}

const inside = (p, r) => p[0] >= r.left && p[0] <= r.right && p[1] >= r.top && p[1] <= r.bottom;
const zOf = (n) => parseInt(getComputedStyle(n).zIndex, 10) || 0;

export function liftSamples(cv) {
  const c = cv.el.getBoundingClientRect();
  const all = [...cv.el.querySelectorAll('.device, .tile, .lift, .badge, .stage-text, .copy')];
  const out = [];
  for (const n of cv.el.querySelectorAll('.lift[data-src]')) {
    const [w, h] = [n.offsetWidth, n.offsetHeight];
    if (w < 60 || h < 40) continue;
    const others = all.filter((o) => o !== n).map((o) => ({ r: o.getBoundingClientRect(), z: zOf(o) }));
    const z = zOf(n);
    const field = (p) => p[0] >= c.left && p[0] <= c.right && p[1] >= c.top && p[1] <= c.bottom && !others.some((o) => inside(p, o.r));
    const card = (p) => !others.some((o) => o.z > z && inside(p, o.r));
    const side = (inner, outer) => ({ inner: toPage(n, inner).filter(card), outer: toPage(n, outer).filter(field) });
    const sides = [
      side(STEPS.map((t) => [w * t, IN]), STEPS.map((t) => [w * t, -OUT])),
      side(STEPS.map((t) => [w * t, h - IN]), STEPS.map((t) => [w * t, h + OUT])),
      side(STEPS.map((t) => [IN, h * t]), STEPS.map((t) => [-OUT, h * t])),
      side(STEPS.map((t) => [w - IN, h * t]), STEPS.map((t) => [w + OUT, h * t])),
    ].map((s) => ({ inner: s.inner.map(([x, y]) => [x - c.left, y - c.top]), outer: s.outer.map(([x, y]) => [x - c.left, y - c.top]) }));
    const r = n.getBoundingClientRect();
    const slice = cv.slices > 1 ? Math.max(0, Math.min(cv.slices - 1, Math.floor(((r.left + r.right) / 2 - c.left) / cv.k / cv.designW))) : 0;
    out.push({ what: n.dataset.what || 'a lift', slice, sides });
  }
  return out;
}
