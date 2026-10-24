// Marker highlight: an even band with soft, slightly uneven ends in --accent behind each <em>
// fragment of the headline (one band per line the word sits on). The em text switches to --ink
// so it stays readable on the band (see copy.css). Band = mid x-height to just below the baseline
// (tuned on Poppins-like metrics: baseline ~75% down the line box).
import { svgLayer } from './lines.js';

function marker(x0, x1, y0, y1, fs) {
  const j = fs * 0.018;
  const e = fs * 0.07;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  return `M${x0} ${y0 + j} Q${mx} ${y0 - j} ${x1} ${y0} Q${x1 + e} ${my} ${x1 - e * 0.3} ${y1}`
    + ` Q${mx} ${y1 + j} ${x0} ${y1 - j} Q${x0 - e} ${my} ${x0} ${y0 + j} Z`;
}

export function markerHighlight(block, cv) {
  const ems = [...block.h1.querySelectorAll('em')];
  if (!ems.length) {
    console.warn('ornament "highlight" needs an <em> word in the headline');
    return;
  }
  const box = block.copy.getBoundingClientRect();
  const fs = parseFloat(block.h1.style.fontSize) || 118;
  const w = box.width / cv.k;
  const h = box.height / cv.k;
  const svg = svgLayer('highlight-layer', w, h);
  Object.assign(svg.style, { left: '0', top: '0', width: `${w}px`, height: `${h}px` });
  const paths = [];
  for (const em of ems) {
    for (const r of em.getClientRects()) {
      if (r.width < 2) continue;
      const top = (r.top - box.top) / cv.k;
      const lh = (r.bottom - r.top) / cv.k;
      const x0 = (r.left - box.left) / cv.k - fs * 0.06;
      const x1 = (r.right - box.left) / cv.k + fs * 0.06;
      paths.push(marker(x0, x1, top + lh * 0.5, top + lh * 0.84, fs));
    }
  }
  svg.innerHTML = paths.map((d) => `<path d="${d}" fill="var(--accent)"/>`).join('');
  block.copy.insertBefore(svg, block.copy.firstChild);
}
