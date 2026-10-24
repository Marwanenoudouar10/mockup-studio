// Panorama seam checks (run by core/checks.js on a strip of 2+ images). On the product page every image is
// seen ALONE, with gaps between them, so a seam is an image edge for anything that does not clearly bridge it:
//   cards   a lift, badge or copy block that stops within EDGE units of a seam (alone, its image shows it
//           touching the edge), or crosses one by under 15% of its width (a clipped corner on the next image)
//   slivers a device or tile whose SCREEN crosses a seam with only 2-25% of its area (and 40+ units) on one
//           side: that piece is clipped text on the next image ("pending", "and transac"). Cross with the
//           bezel only, or put a real share of the screen (a chart, a ring, a tab bar) across.
// bridge: true on an element says the crossing is on purpose (no finding); bleed: true skips the card checks.
import { issue } from './issues.js';

const SLIVER = { min: 0.02, max: 0.25, units: 40 };

// rotation in degrees from the inline transform place() / badge() wrote
function degOf(n) {
  const m = /rotate\((-?[\d.]+)deg\)/.exec(n.style.transform || '');
  return m ? Number(m[1]) : 0;
}

// the element's own box (canvas units, untransformed) rotated about its transform origin -> 4 corners
function corners(n) {
  const [L, T, W, H] = [n.offsetLeft, n.offsetTop, n.offsetWidth, n.offsetHeight];
  const [ox, oy] = getComputedStyle(n).transformOrigin.split(' ').map(parseFloat);
  const a = (degOf(n) * Math.PI) / 180;
  const [cx, cy] = [L + (Number.isFinite(ox) ? ox : W / 2), T + (Number.isFinite(oy) ? oy : H / 2)];
  return [[L, T], [L + W, T], [L + W, T + H], [L, T + H]].map(([x, y]) => [
    cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
    cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
  ]);
}

const area = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
  const [x2, y2] = pts[(i + 1) % pts.length];
  return s + x * y2 - x2 * y;
}, 0)) / 2;

// the part of a convex polygon on one side of the vertical line x = s (side +1 = right, -1 = left)
function clipX(pts, s, side) {
  const inside = ([x]) => (x - s) * side >= 0;
  const out = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    if (inside(p)) out.push(p);
    if (inside(p) !== inside(q)) {
      const t = (s - p[0]) / (q[0] - p[0]);
      out.push([s, p[1] + t * (q[1] - p[1])]);
    }
  });
  return out;
}

const sliceAt = (cv, x) => Math.max(0, Math.min(cv.slices - 1, Math.floor(x / cv.designW)));

export function seamCheck(cv, c, { rectOf, what, EDGE }) {
  const seams = Array.from({ length: cv.slices - 1 }, (_, i) => (i + 1) * cv.designW);
  for (const n of cv.el.querySelectorAll('.lift, .badge, .copy')) {
    if (n.dataset.bleed === '1' || n.dataset.bridge === '1') continue;
    const a = rectOf(n, cv, c);
    const w = a.r - a.l;
    for (const s of seams) {
      if (a.l < s && a.r > s) {
        const small = Math.min(s - a.l, a.r - s);
        if (small < 0.15 * w) {
          issue(`${what(n)} crosses the seam at x ${s} by only ${Math.round(small)} units: move it off the seam, or bridge it on purpose (bridge: true)`,
            { slice: sliceAt(cv, s - a.l < a.r - s ? a.l : a.r - 1) });
        }
        continue;
      }
      const gap = a.r <= s ? s - a.r : a.l - s;
      if (gap < EDGE - 0.5) {
        issue(`${what(n)} is ${Math.round(gap)} units from the seam at x ${s}: on its own image it touches the edge (keep ${EDGE}; sizes scale by the stage factor, x does not)`,
          { slice: sliceAt(cv, (a.l + a.r) / 2) });
      }
    }
  }
  for (const n of cv.el.querySelectorAll('.device, .tile')) {
    if (n.dataset.bridge === '1' || !n.offsetWidth) continue;
    const pts = corners(n);
    const total = area(pts);
    const xs = pts.map(([x]) => x);
    for (const s of seams) {
      if (Math.min(...xs) >= s || Math.max(...xs) <= s) continue;
      for (const side of [-1, 1]) {
        const part = clipX(pts, s, side);
        const share = part.length > 2 ? area(part) / total : 0;
        const reach = part.length ? Math.max(...part.map(([x]) => Math.abs(x - s))) : 0;
        if (share >= SLIVER.min && share <= SLIVER.max && reach >= SLIVER.units) {
          const img = sliceAt(cv, s + side * 1);
          issue(`${what(n)} shows a ${Math.round(reach)}-unit sliver of its screen on image ${img + 1} (seam x ${s}): clipped UI reads as junk there; `
            + 'cross with the bezel only, put a real share of the screen across, or bridge: true', { slice: img });
        }
      }
    }
  }
}
