// The giant faint logo behind everything. One per image; in a panorama the placement
// alternates (bottom-left, then upper-right) so the strip does not stamp the same mark.
// A wide wordmark is drawn ~2300 units wide; a square-ish symbol ~1250, whole, in a corner.
// brand.watermark may vary per store ({ playstore: false, default: true }); a panel's own `watermark`
// (false, true or { src, opacity }) wins for its image (perSlice), and feature.watermark for the feature graphic.
// On a dark field with strong glows the cropped giant mark can read as dirt: read the images (design.md).
import { graphic } from '../core/assets.js';

function aspect(node) {
  const svg = node.querySelector('svg');
  const vb = svg && svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width) return vb.height / vb.width;
  const img = node.querySelector('img');
  return img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.3;
}

export async function addWatermarks(cv, brand, { feature = false, wide = false, perSlice = [] } = {}) {
  for (let i = 0; i < cv.slices; i++) {
    const wm = perSlice[i] === undefined ? brand.watermark : perSlice[i];
    if (!wm || !wm.src) continue;
    const node = await graphic(wm.src, 'watermark');
    if (wm.opacity != null) node.style.opacity = String(wm.opacity);
    const square = aspect(node) > 0.5;
    const x0 = i * cv.designW;
    const st = node.style;
    if (feature) {
      Object.assign(st, square
        ? { width: '440px', left: '-110px', bottom: '-210px', transform: 'rotate(-10deg)' }
        : { width: '1100px', left: '-300px', bottom: '-170px', transform: 'rotate(-8deg)' });
    } else if (wide) {
      // wide layout (1200 units high): bottom-left, under the copy column
      Object.assign(st, square
        ? { width: '1080px', left: '-250px', bottom: '-430px', transform: 'rotate(-10deg)' }
        : { width: '2300px', left: '-520px', bottom: '-360px', transform: 'rotate(-8deg)' });
    } else if (square) {
      // a symbol: big enough to read whole, tucked into a corner, alternating corners in a strip
      const w = cv.tall ? 1250 : 1050;
      Object.assign(st, { width: `${w}px`, bottom: `${cv.tall ? -180 : -150}px`,
        left: `${i % 2 ? x0 + cv.designW - w + 260 : x0 - 260}px`, transform: `rotate(${i % 2 ? 10 : -10}deg)` });
    } else if (i % 2 === 0) {
      const w = cv.tall ? 2300 : 1900;
      Object.assign(st, { width: `${w}px`, left: `${x0 - 520}px`, bottom: `${cv.tall ? -260 : -200}px`, transform: 'rotate(-8deg)' });
    } else {
      const w = cv.tall ? 2100 : 1750;
      Object.assign(st, { width: `${w}px`, left: `${x0 - 200}px`, top: `${cv.DH * 0.38}px`, transform: 'rotate(7deg)' });
    }
    cv.el.appendChild(node);
  }
}
