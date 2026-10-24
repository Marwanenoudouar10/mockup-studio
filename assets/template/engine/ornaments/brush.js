// The hand-drawn brush: two tapered strokes under the headline's LAST line.
// Every offset scales with the headline font size (tuned at 118 design px).
import { lineRects, toDesign, svgLayer } from './lines.js';

// A tapered quadratic stroke from (x0,y0) to (x1,y1), bent up by `bend`, maxW thick in the middle.
export function brushPath(x0, y0, x1, y1, bend, maxW) {
  const N = 48;
  const top = [];
  const bot = [];
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 - bend;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = (maxW * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.55)) / 2;
    top.push(`${(x + nx * w).toFixed(1)},${(y + ny * w).toFixed(1)}`);
    bot.unshift(`${(x - nx * w).toFixed(1)},${(y - ny * w).toFixed(1)}`);
  }
  return `M${top.join(' L')} L${bot.join(' L')} Z`;
}

export function brushUnderline(block, cv, { rtl = false } = {}) {
  const lines = lineRects(block.h1);
  if (!lines.length) return;
  const last = toDesign(lines[lines.length - 1], cv);
  const s = (parseFloat(block.h1.style.fontSize) || 118) / 118;
  const sx = last.left;
  const ex = last.right;
  const y = last.bottom + 4 * s;
  const span = ex - sx;
  const strokes = rtl
    ? [
      brushPath(ex + 6 * s, y + 6 * s, sx - 20 * s, y - 2 * s, 8 * s, 15 * s),
      brushPath(ex - span * 0.45, y + 26 * s, sx - 36 * s, y + 16 * s, 5 * s, 10 * s),
    ]
    : [
      brushPath(sx - 6 * s, y + 6 * s, ex + 20 * s, y - 2 * s, 8 * s, 15 * s),
      brushPath(sx + span * 0.45, y + 26 * s, ex + 36 * s, y + 16 * s, 5 * s, 10 * s),
    ];
  const W = cv.designW * cv.slices;
  const svg = svgLayer('ornament-layer', W, cv.DH);
  svg.innerHTML = strokes.map((d) => `<path d="${d}" fill="var(--ornament)"/>`).join('');
  cv.el.appendChild(svg);
}
