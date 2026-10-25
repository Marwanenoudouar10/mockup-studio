// One element's own paint, in output units: shadows, background colour, background layers (gradients, images),
// border, inset rims. -> { body: [nodes], filter, mask, clip }
//   body    shapes drawn under the element's children
//   filter  url(#..) for the element's group: a layer blur (filter: blur())
//   mask    url(#..) for mask-image: linear-gradient (a tile's fade, iOS's scroll edge)
//   clip    url(#..) for clip-path: polygon() (the monitor's stand)
// Borders are a ring path (outer minus inner, elliptical per-corner radii, even-odd), so a mood face with
// border-top: 0 and radius 0 0 99px 99px is drawn as CSS draws it. Spread-only shadows (rings) are outer
// strokes; no-blur inset shadows are inside strokes. A blurred inset shadow and backdrop blur have no Figma
// equivalent: left out and reported (the PDF keeps them).
import { h, rrect, rpath, radii, scaleR, split, words } from './tree.js';
import { parseColor, paintAttrs } from './color.js';
import { gradient } from './gradient.js';
import { parseShadows, shadowFilter, shadowShapes, blurFilter } from './shadow.js';

const shape = (b, r, attrs) => {
  const s = rrect(b.x, b.y, b.w, b.h, r);
  return h(s.tag, { ...s.attrs, ...attrs });
};

// background-size / position of one layer -> its box (a gradient tile); repeats are drawn once (reported)
function layerBox(st, i, b, k, ctx) {
  const size = split(st.backgroundSize)[i] || 'auto';
  if (/^(auto|auto auto)$/.test(size)) return b;
  const [sw, sh = 'auto'] = words(size);
  const len = (v, base) => (v.endsWith('%') ? (parseFloat(v) / 100) * base : v === 'auto' ? base : parseFloat(v) * k);
  const w = size === 'cover' || size === 'contain' ? b.w : len(sw, b.w);
  const hh = size === 'cover' || size === 'contain' ? b.h : len(sh, b.h);
  const [px = '0%', py = '0%'] = words(split(st.backgroundPosition)[i] || '0% 0%');
  const pos = (v, free) => (v.endsWith('%') ? (parseFloat(v) / 100) * free : parseFloat(v) * k);
  const rep = split(st.backgroundRepeat)[i] || 'repeat';
  if (!/no-repeat/.test(rep) && (w < b.w - 0.5 || hh < b.h - 0.5)) ctx.warn('a repeated background is drawn once');
  return { x: b.x + pos(px, b.w - w), y: b.y + pos(py, b.h - hh), w, h: hh };
}

function maskOf(st, b, k, ctx) {
  const m = st.webkitMaskImage && st.webkitMaskImage !== 'none' ? st.webkitMaskImage : st.maskImage;
  if (!m || m === 'none') return null;
  const g = /gradient\(/.test(m) ? gradient(m, b, k, ctx) : null;
  if (!g) { ctx.warn(`mask-image left out (${m.slice(0, 40)})`); return null; }
  // CSS masks by alpha, SVG by luminance x alpha: white stops with the CSS alpha
  for (const s of g.def.kids) { s.attrs['stop-opacity'] = s.attrs['stop-opacity'] ?? 1; s.attrs['stop-color'] = '#ffffff'; }
  ctx.defs.push(g.def);
  const id = ctx.id('mask');
  ctx.defs.push(h('mask', { id, maskUnits: 'userSpaceOnUse', x: b.x, y: b.y, width: b.w, height: b.h },
    [h('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: g.fill })]));
  ctx.omit('mask-image kept as an SVG mask (Figma may import it as a plain group)');
  return `url(#${id})`;
}

function polygonClip(st, b, k, ctx) {
  const m = /^polygon\((.*)\)$/.exec(st.clipPath || '');
  if (!m) {
    if (st.clipPath && st.clipPath !== 'none') ctx.warn(`clip-path left out (${st.clipPath.slice(0, 40)})`);
    return null;
  }
  const pts = split(m[1]).map((p) => {
    const [x, y] = words(p);
    const v = (s, base) => (s.endsWith('%') ? (parseFloat(s) / 100) * base : parseFloat(s) * k);
    return `${(b.x + v(x, b.w)).toFixed(2)},${(b.y + v(y, b.h)).toFixed(2)}`;
  });
  const id = ctx.id('clip');
  ctx.defs.push(h('clipPath', { id }, [h('polygon', { points: pts.join(' ') })]));
  return `url(#${id})`;
}

export function paintBox(el, st, b, k, ctx) {
  const body = [];
  const r = scaleR(radii(st, b.w / k, b.h / k), k);
  const sh = parseShadows(st.boxShadow, k);
  const rings = sh.outer.filter((s) => !s.blur && !s.dx && !s.dy && s.spread > 0);
  const drops = ctx.opts.shadows === 'none' ? [] : sh.outer.filter((s) => !rings.includes(s));
  if (ctx.opts.shadows === 'none' && sh.outer.length > rings.length) ctx.omit('drop shadows left out (--shadows none)');
  for (const g of rings.slice().reverse()) {
    const w = g.spread;
    const p = rrect(b.x - w / 2, b.y - w / 2, b.w + w, b.h + w, r.map(([a, c]) => [a + w / 2, c + w / 2]));
    body.push(h(p.tag, { ...p.attrs, fill: 'none', ...paintAttrs(g.c, 'stroke'), 'stroke-width': w }));
  }
  let shadowRef = null;
  if (drops.length) {
    const fl = shadowFilter(drops, b, ctx);
    ctx.defs.push(fl.def);
    shadowRef = fl.ref;
  }
  let first = true;
  const put = (attrs) => {
    body.push(shape(b, r, { ...attrs, filter: first && shadowRef ? shadowRef : null }));
    first = false;
  };
  const bg = parseColor(st.backgroundColor);
  if (bg && bg.a > 0) put(paintAttrs(bg));
  const layers = st.backgroundImage === 'none' ? [] : split(st.backgroundImage);
  layers.slice().reverse().forEach((layer, ri) => {
    const i = layers.length - 1 - ri;
    if (/gradient\(/.test(layer)) {
      const lb = layerBox(st, i, b, k, ctx);
      const g = gradient(layer, lb, k, ctx);
      if (!g) { ctx.warn(`gradient not converted: ${layer.slice(0, 50)}`); return; }
      ctx.defs.push(g.def);
      if (lb === b) put({ fill: g.fill });
      else body.push(h('rect', { x: lb.x, y: lb.y, width: lb.w, height: lb.h, fill: g.fill }));
    } else if (/^url\(/.test(layer)) {
      const src = layer.slice(4, -1).replace(/^["']|["']$/g, '');
      if (/feTurbulence/.test(src)) { ctx.omit('grain texture left out (feTurbulence: Figma cannot import it)'); return; }
      const data = ctx.images.get(new URL(src, el.ownerDocument.baseURI).href);
      if (!data) { ctx.warn(`background image not embedded: ${src.slice(0, 60)}`); return; }
      const lb = layerBox(st, i, b, k, ctx);
      body.push(h('image', { href: data, x: lb.x, y: lb.y, width: lb.w, height: lb.h, preserveAspectRatio: st.backgroundSize === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice' }));
    }
  });
  // a shadow but no fill of its own: CSS still draws it from the BOX (outside it), never from the content, so it
  // becomes shapes of its own under everything (a group filter would make the text cast it)
  if (shadowRef && first) body.unshift(shadowShapes(drops, b, r, ctx));
  const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => (st[`border${s}Style`] === 'none' || st[`border${s}Style`] === 'hidden' ? 0 : parseFloat(st[`border${s}Width`]) * k || 0));
  if (bw.some((v) => v > 0)) {
    const bc = ['Top', 'Right', 'Bottom', 'Left'].map((s) => parseColor(st[`border${s}Color`]));
    const [t, rr, bb, l] = bw;
    const inner = [[r[0][0] - l, r[0][1] - t], [r[1][0] - rr, r[1][1] - t], [r[2][0] - rr, r[2][1] - bb], [r[3][0] - l, r[3][1] - bb]]
      .map(([a, c]) => [Math.max(0, a), Math.max(0, c)]);
    const c = bc.find((x, i) => bw[i] > 0 && x && x.a > 0);
    if (c) {
      if (!bc.every((x, i) => !bw[i] || (x && x.rgb === c.rgb && x.a === c.a))) ctx.warn('border sides with different colours drawn in one colour');
      const d = `${rpath(b.x, b.y, b.w, b.h, r)}${rpath(b.x + l, b.y + t, b.w - l - rr, b.h - t - bb, inner)}`;
      body.push(h('path', { d, 'fill-rule': 'evenodd', ...paintAttrs(c) }));
    }
  }
  for (const s of sh.inset) {
    if (s.blur > 0.5) { ctx.omit('blurred inset shadows left out'); continue; }
    if (s.dx || s.dy) {
      // a 1-2 px inner highlight (a glass top edge): a thin band on the offset side
      const t = Math.abs(s.dy || s.dx);
      if (s.dy) body.push(h('rect', { x: b.x + r[0][0] * 0.6, y: s.dy > 0 ? b.y : b.y + b.h - t, width: Math.max(0, b.w - r[0][0] * 1.2), height: t, ...paintAttrs(s.c) }));
      continue;
    }
    const w = s.spread;
    if (w <= 0) continue;
    const p = rrect(b.x + w / 2, b.y + w / 2, b.w - w, b.h - w, r.map(([a, c]) => [Math.max(0, a - w / 2), Math.max(0, c - w / 2)]));
    body.push(h(p.tag, { ...p.attrs, fill: 'none', ...paintAttrs(s.c, 'stroke'), 'stroke-width': w }));
  }
  if (st.backdropFilter && st.backdropFilter !== 'none') ctx.omit('backdrop blur left out (the tint is kept, so what lies under a glass bar shows through sharp)');
  const blur = /blur\(([\d.]+)px\)/.exec(st.filter || '');
  let layerFilter = null;
  if (blur && parseFloat(blur[1]) > 0) {
    const fl = blurFilter(parseFloat(blur[1]) * k, b, ctx);
    ctx.defs.push(fl.def);
    layerFilter = fl.ref;
  } else if (st.filter && st.filter !== 'none') ctx.warn(`filter left out: ${st.filter.slice(0, 40)}`);
  return { body, filter: layerFilter, mask: maskOf(st, b, k, ctx), clip: polygonClip(st, b, k, ctx), radii: r };
}
