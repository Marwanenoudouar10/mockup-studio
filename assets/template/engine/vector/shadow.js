// Shadows and blurs, written the way Figma itself exports effects (feFlood BackgroundImageFix, a SourceAlpha
// colour matrix, offset, blur, composite, blend), so a Figma import can map them back to Drop shadow and
// Layer blur effects. If it does not, the shadow is simply missing in Figma (--shadows none leaves them out).
//   parseShadows(css, k)        -> { outer: [{ dx, dy, blur, spread, c }], inset: [...] } in output units
//   shadowFilter(list, box, ctx) -> { def, ref }   (one filter for every outer shadow of a box)
//   shadowShapes(list, box, radii, ctx) -> node   the shadows of a box with no fill: shapes, clipped outside it
//   blurFilter(r, box, ctx)      -> { def, ref }   (CSS filter: blur(r): r is the standard deviation)
import { h, f2, split, rrect, rpath } from './tree.js';
import { parseColor, paintAttrs } from './color.js';

export function parseShadows(css, k) {
  const out = { outer: [], inset: [] };
  if (!css || css === 'none') return out;
  for (const s of split(css)) {
    const inset = /\binset\b/.test(s);
    const cm = /(rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]+)/i.exec(s);
    const c = parseColor(cm ? cm[1] : 'rgb(0, 0, 0)');
    const nums = s.replace(cm ? cm[1] : '', '').replace('inset', '').trim().split(/\s+/).map(parseFloat).filter(Number.isFinite);
    const [dx = 0, dy = 0, blur = 0, spread = 0] = nums;
    if (!c || c.a === 0) continue;
    (inset ? out.inset : out.outer).push({ dx: dx * k, dy: dy * k, blur: blur * k, spread: spread * k, c });
  }
  return out;
}

const rgba = (c) => [1, 3, 5].map((o) => f2(parseInt(c.rgb.slice(o, o + 2), 16) / 255));

export function shadowFilter(list, b, ctx) {
  const id = ctx.id('shadow');
  const pad = Math.max(...list.map((s) => s.blur * 1.5 + Math.abs(s.dx) + Math.abs(s.dy) + Math.max(0, s.spread))) + 2;
  const prims = [h('feFlood', { 'flood-opacity': 0, result: 'BackgroundImageFix' })];
  let prev = 'BackgroundImageFix';
  // CSS paints the first shadow on top: Figma's effect list (and the blend chain) goes bottom-up
  list.slice().reverse().forEach((s, i) => {
    const [r, g, bl] = rgba(s.c);
    prims.push(h('feColorMatrix', { in: 'SourceAlpha', type: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0', result: 'hardAlpha' }));
    if (s.spread > 0) prims.push(h('feMorphology', { radius: s.spread, operator: 'dilate', in: 'SourceAlpha', result: `effect${i + 1}_spread` }));
    prims.push(h('feOffset', { in: s.spread > 0 ? `effect${i + 1}_spread` : null, dx: s.dx || null, dy: s.dy || null }));
    if (s.blur > 0) prims.push(h('feGaussianBlur', { stdDeviation: s.blur / 2 }));
    prims.push(h('feComposite', { in2: 'hardAlpha', operator: 'out' }));
    prims.push(h('feColorMatrix', { type: 'matrix', values: `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${bl} 0 0 0 ${f2(s.c.a)} 0` }));
    prims.push(h('feBlend', { mode: 'normal', in2: prev, result: `effect${i + 1}_dropShadow` }));
    prev = `effect${i + 1}_dropShadow`;
  });
  prims.push(h('feBlend', { mode: 'normal', in: 'SourceGraphic', in2: prev, result: 'shape' }));
  const def = h('filter', {
    id, x: b.x - pad, y: b.y - pad, width: b.w + 2 * pad, height: b.h + 2 * pad,
    filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB',
  }, prims);
  return { def, ref: `url(#${id})` };
}

// A box with a shadow and no fill (a segment divider drawn as box-shadow: -1px 0 0): CSS draws the shadow from the
// box, outside it. Each shadow is a shape of its colour, moved, spread and blurred (Figma: a layer blur), and the
// group is clipped to everything but the box.
export function shadowShapes(list, b, r, ctx) {
  const pad = Math.max(...list.map((s) => s.blur * 1.5 + Math.abs(s.dx) + Math.abs(s.dy) + Math.max(0, s.spread))) + 2;
  const id = ctx.id('clip');
  const outer = `M${f2(b.x - pad)} ${f2(b.y - pad)}H${f2(b.x + b.w + pad)}V${f2(b.y + b.h + pad)}H${f2(b.x - pad)}Z`;
  ctx.defs.push(h('clipPath', { id }, [h('path', { d: outer + rpath(b.x, b.y, b.w, b.h, r), 'clip-rule': 'evenodd' })]));
  const kids = list.slice().reverse().map((s) => { // the first CSS shadow is on top
    const sp = s.spread;
    const box = { x: b.x + s.dx - sp, y: b.y + s.dy - sp, w: Math.max(0, b.w + 2 * sp), h: Math.max(0, b.h + 2 * sp) };
    const sh = rrect(box.x, box.y, box.w, box.h, r.map(([a, c]) => [a ? Math.max(0, a + sp) : 0, c ? Math.max(0, c + sp) : 0]));
    const node = h(sh.tag, { ...sh.attrs, ...paintAttrs(s.c) });
    if (s.blur > 0) {
      const fl = blurFilter(s.blur / 2, box, ctx);
      ctx.defs.push(fl.def);
      node.attrs.filter = fl.ref;
    }
    return node;
  });
  return h('g', { 'clip-path': `url(#${id})` }, kids);
}

export function blurFilter(r, b, ctx) {
  const id = ctx.id('blur');
  const pad = r * 3 + 2;
  const def = h('filter', {
    id, x: b.x - pad, y: b.y - pad, width: b.w + 2 * pad, height: b.h + 2 * pad,
    filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB',
  }, [
    h('feFlood', { 'flood-opacity': 0, result: 'BackgroundImageFix' }),
    h('feBlend', { mode: 'normal', in: 'SourceGraphic', in2: 'BackgroundImageFix', result: 'shape' }),
    h('feGaussianBlur', { stdDeviation: r, result: 'effect1_foregroundBlur' }),
  ]);
  return { def, ref: `url(#${id})` };
}
