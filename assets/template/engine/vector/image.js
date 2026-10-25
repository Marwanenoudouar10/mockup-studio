// An <img> as an SVG <image> (an embedded data: URI, prepare.js embedImages), placed as CSS drew it: object-fit
// cover / contain and object-position, clipped to its box. When only a part of a raster image shows (a lifted
// card is a window on a whole 1320 x 2868 capture, a tile shows a band of a screen), only that part is embedded:
// the visible rectangle (the image's box, and the nearest ancestor that clips it) is cut out through a canvas at
// the image's own pixels, so the file carries the card, not the whole capture again.
//   image(el, st, b, k, ctx) -> node | null      b = the element's box x k (walk.js), k = the frame's scale
import { h } from './tree.js';

const MOSTLY = 0.85; // a crop that keeps more than this share of the pixels is not worth a re-encode

// the box that clips el: the nearest ancestor whose overflow is not visible (same document), or null
function clipper(el) {
  const win = el.ownerDocument.defaultView;
  for (let p = el.parentElement; p && p !== el.ownerDocument.body; p = p.parentElement) {
    if (win.getComputedStyle(p).overflow !== 'visible') return p.getBoundingClientRect();
  }
  return null;
}

const meet = (a, b) => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return { x, y, w: Math.min(a.x + a.w, b.x + b.w) - x, h: Math.min(a.y + a.h, b.y + b.h) - y };
};

// the part of the drawn image (D, page px x k) inside `view`, as a PNG of the image's own pixels, or null
function crop(el, D, view, ctx) {
  const V = meet(D, view);
  const [nw, nh] = [el.naturalWidth, el.naturalHeight];
  if (V.w <= 0 || V.h <= 0 || !nw || !nh || /\.svg($|\?)|^data:image\/svg/i.test(el.currentSrc)) return null;
  if (V.w * V.h > MOSTLY * D.w * D.h) return null;
  // whole source pixels (no resampling): the part grows by under one pixel, which the clip around it hides
  const x0 = Math.max(0, Math.floor(((V.x - D.x) / D.w) * nw));
  const y0 = Math.max(0, Math.floor(((V.y - D.y) / D.h) * nh));
  const x1 = Math.min(nw, Math.ceil(((V.x + V.w - D.x) / D.w) * nw));
  const y1 = Math.min(nh, Math.ceil(((V.y + V.h - D.y) / D.h) * nh));
  if (x1 <= x0 || y1 <= y0) return null;
  try {
    const c = el.ownerDocument.createElement('canvas');
    [c.width, c.height] = [x1 - x0, y1 - y0];
    c.getContext('2d').drawImage(el, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
    const [sx, sy] = [D.w / nw, D.h / nh];
    return { href: c.toDataURL('image/png'), x: D.x + x0 * sx, y: D.y + y0 * sy, w: (x1 - x0) * sx, h: (y1 - y0) * sy };
  } catch {
    ctx.warn('an image could not be cropped (embedded whole)');
    return null;
  }
}

export function image(el, st, b, k, ctx) {
  const data = ctx.images.get(el.currentSrc);
  if (!data) return null;
  const [nw, nh] = [el.naturalWidth, el.naturalHeight];
  let [w, hh] = [b.w, b.h];
  const fit = st.objectFit;
  if ((fit === 'cover' || fit === 'contain') && nw && nh) {
    const sc = (fit === 'cover' ? Math.max : Math.min)(b.w / nw, b.h / nh);
    [w, hh] = [nw * sc, nh * sc];
  }
  const [px, py] = st.objectPosition.split(' ').map((v, i) => (v.endsWith('%') ? parseFloat(v) / 100 : { px: parseFloat(v) * (i ? b.h / el.clientHeight || 1 : b.w / el.clientWidth || 1) }));
  const at = (free, v) => (typeof v === 'object' ? v.px : free * v);
  const D = { x: b.x + at(b.w - w, px), y: b.y + at(b.h - hh, py), w, h: hh };
  const cr = clipper(el);
  const view = cr ? meet(b, { x: cr.left * k, y: cr.top * k, w: cr.width * k, h: cr.height * k }) : b;
  const part = crop(el, D, view, ctx);
  if (part) return h('image', { href: part.href, x: part.x, y: part.y, width: part.w, height: part.h, preserveAspectRatio: 'none' });
  const img = h('image', { href: data, x: D.x, y: D.y, width: w, height: hh, preserveAspectRatio: 'none' });
  if (w > b.w + 0.5 || hh > b.h + 0.5) {
    const id = ctx.id('clip');
    ctx.defs.push(h('clipPath', { id }, [h('rect', { x: b.x, y: b.y, width: b.w, height: b.h })]));
    return h('g', { 'clip-path': `url(#${id})` }, [img]);
  }
  return img;
}
