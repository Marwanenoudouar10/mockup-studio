// A lifted card that dissolves into its field, read on the rendered PNG (the page gives the sample points:
// engine/core/edges.js). Per side of a card: the mean colour just inside its edge against the field just outside.
// A card whose sides average under 1.5:1 AND that has the field's hue (OKLab a/b distance, so a red card on a
// green field of the same lightness still reads) is an issue: an orange card on an orange field reads as a hole
// (its shadow side alone does not save it). Neutral pairs are left alone (a white card on paper, a dark card on a
// dark field: there the shadow and the hairline carry the edge, the usual way).
//   liftEdgeIssues(png, lifts, { scale, x0 }) -> [issue texts]   x0 = the image's left edge in a panorama strip
import { createRequire } from 'node:module';
import { contrast, toOklch } from '../brand/lib/color.js';
import { ROOT } from './cli.js';

const { PNG } = createRequire(`${ROOT}/package.json`)('pngjs');
const LIMIT = 1.5;
const NEAR = 0.08; // OKLab a/b distance (hue and chroma) under which two colours read as the same colour
const COLOURFUL = 0.05; // OKLCH chroma: below it, a colour counts as neutral (white, grey, near-black)

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function lab(h) {
  const { l, c, h: hue } = toOklch(h);
  const a = (hue * Math.PI) / 180;
  return [l, c * Math.cos(a), c * Math.sin(a), c];
}

export function liftEdgeIssues(png, lifts, { scale = 1, x0 = 0 } = {}) {
  if (!lifts || !lifts.length) return [];
  const img = PNG.sync.read(png);
  // the mean colour of a 5 x 5 patch (image px) around each point, then of all the points
  const mean = (pts) => {
    let n = 0;
    const s = [0, 0, 0];
    for (const [x, y] of pts) {
      const [cx, cy] = [Math.round((x - x0) * scale), Math.round(y * scale)];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const [px, py] = [cx + dx, cy + dy];
          if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
          const i = (py * img.width + px) * 4;
          s[0] += img.data[i]; s[1] += img.data[i + 1]; s[2] += img.data[i + 2]; n++;
        }
      }
    }
    return n ? hex(s.map((v) => v / n)) : null;
  };
  const out = [];
  for (const lift of lifts) {
    const sides = lift.sides.filter((s) => s.inner.length >= 2 && s.outer.length >= 2).map((s) => {
      const [card, field] = [mean(s.inner), mean(s.outer)];
      const [A, B] = [lab(card), lab(field)];
      return { card, field, ratio: contrast(card, field), hue: Math.hypot(A[1] - B[1], A[2] - B[2]), colourful: Math.max(A[3], B[3]) >= COLOURFUL };
    });
    if (sides.length < 2) continue;
    const avg = (k) => sides.reduce((a, x) => a + x[k], 0) / sides.length;
    if (!(avg('ratio') < LIMIT && avg('hue') < NEAR && sides.some((x) => x.colourful))) continue;
    const one = sides.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    out.push(`${lift.what}: its edge averages ${avg('ratio').toFixed(2)}:1 against the field behind it (card ${one.card}, field ${one.field}): `
      + 'the card dissolves into the field. Lift another card, move it onto another part of the field, use another field '
      + "on this panel (field: 'dark'), or give it a stronger shadow (class: 'x' on the panel, .canvas.x { --shadow-k: 1.8 } "
      + 'in brand/theme.css)');
  }
  return out;
}
