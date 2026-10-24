// The design canvas: 1320 design units wide per image, scaled to the store width.
//   k  = W / 1320          (store px per design unit)
//   DH = H / k             (design height: 2868-ish for iPhone, ~2347 for a 9:16 Play image)
//   tall = DH > 2600       (short 9:16 canvases tighten the copy)
// Panorama: `slices` images side by side on ONE canvas, sharing one continuous field.
import { DESIGN_W } from '../../scripts/lib/config.js';
import { setPageSize } from '../core/boot.js';

export function makeCanvas({ W, H, slices = 1, field = 'gradient', grain = true, designW = DESIGN_W }) {
  const k = W / designW;
  const DH = H / k;
  const tall = DH > 2600;
  setPageSize(W * slices, H);
  const el = document.createElement('div');
  el.className = `canvas field-${field}${grain ? ' grain' : ''}${tall ? '' : ' short'}`;
  el.id = 'canvas';
  el.style.width = `${designW * slices}px`;
  el.style.height = `${DH}px`;
  el.style.transform = `scale(${k})`;
  document.body.appendChild(el);
  return { el, k, DH, tall, slices, W, H, designW };
}

// Rect of a node in design units, relative to the canvas.
export function designRect(node, cv) {
  const c = cv.el.getBoundingClientRect();
  const r = node.getBoundingClientRect();
  return {
    left: (r.left - c.left) / cv.k,
    right: (r.right - c.left) / cv.k,
    top: (r.top - c.top) / cv.k,
    bottom: (r.bottom - c.top) / cv.k,
  };
}
