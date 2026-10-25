// An inline <svg> laid out in HTML (icons, logos, art, charts) -> a <g> with its viewBox mapped onto its box
// (preserveAspectRatio, a slice clipped), every shape carrying its COMPUTED paint (currentColor, CSS variables
// and stylesheet rules resolved), default values dropped, ids prefixed per copy (an icon used twice must not
// share gradient ids) and url(#id) references rewritten to match.
//   inlineSvg(svgElement, box, k, ctx) -> node
import { h, f6 } from './tree.js';
import { parseColor } from './color.js';
import { families } from './text.js';

const PAINT = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit', 'opacity', 'stop-color', 'stop-opacity', 'font-family', 'font-size',
  'font-weight', 'text-anchor', 'letter-spacing', 'clip-rule'];
const SKIP = new Set(['script', 'style', 'title', 'desc', 'metadata', 'foreignObject']);
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'stop', 'g', 'use']);
const DEFAULTS = { 'fill-opacity': '1', 'stroke-opacity': '1', 'fill-rule': 'nonzero', 'clip-rule': 'nonzero', 'stroke-linecap': 'butt',
  'stroke-linejoin': 'miter', 'stroke-dasharray': 'none', 'stroke-dashoffset': '0px', 'stroke-miterlimit': '4', 'stop-opacity': '1',
  'text-anchor': 'start', 'letter-spacing': 'normal', 'stroke-width': '1px', opacity: '1' };
const DROP = new Set(['class', 'style', 'aria-hidden', 'role', 'focusable', 'xmlns', 'xmlns:xlink', 'version']);

function clone(src, prefix, ctx) {
  const tag = src.localName;
  if (SKIP.has(tag)) {
    if (tag === 'foreignObject') ctx.warn('a <foreignObject> inside an inline SVG was left out');
    return null;
  }
  const st = src.ownerDocument.defaultView.getComputedStyle(src);
  if (st.display === 'none') return null;
  const attrs = {};
  for (const a of src.attributes) {
    if (DROP.has(a.name) || a.name.startsWith('data-') || a.name.startsWith('aria-')) continue;
    if (tag === 'svg' && ['width', 'height', 'viewBox', 'preserveAspectRatio', 'x', 'y'].includes(a.name)) continue;
    attrs[a.name] = a.value;
  }
  if (attrs.id) attrs.id = `${prefix}${attrs.id}`;
  for (const [n, v] of Object.entries(attrs)) {
    if (v.includes('url(#')) attrs[n] = v.replace(/url\(#/g, `url(#${prefix}`);
    if ((n === 'href' || n === 'xlink:href') && v.startsWith('#')) attrs[n] = `#${prefix}${v.slice(1)}`;
  }
  const inDefs = !!src.closest('defs, clipPath, mask, linearGradient, radialGradient, pattern, symbol');
  if ((!inDefs || tag === 'stop') && (SHAPES.has(tag) || tag === 'svg')) {
    for (const p of PAINT) {
      if (tag === 'stop' ? !/^stop-/.test(p) : /^stop-/.test(p)) continue;
      if (!['text', 'tspan', 'g', 'svg'].includes(tag) && /^(font-|text-anchor|letter-spacing)/.test(p)) continue;
      let v = st.getPropertyValue(p);
      if (!v) continue;
      if (/^url\(/.test(v)) v = v.replace(/url\(["']?(?:[^#"')]*)#([^"')]*)["']?\)/, (m0, id) => `url(#${prefix}${id})`);
      if ((p === 'fill' || p === 'stroke' || p === 'stop-color') && !/^url/.test(v) && v !== 'none') {
        const c = parseColor(v);
        if (!c || c.a === 0) v = 'none';
        else {
          v = c.rgb;
          const op = p === 'stop-color' ? 'stop-opacity' : `${p}-opacity`;
          if (c.a < 1) attrs[op] = String(+(c.a * (parseFloat(st.getPropertyValue(op)) || 1)).toFixed(4));
        }
      }
      if (DEFAULTS[p] !== undefined && DEFAULTS[p] === v) continue;
      if (/opacity$/.test(p) && p !== 'opacity' && attrs[p] !== undefined) continue;
      if (p === 'stroke-width' && st.stroke === 'none') continue;
      if (p === 'font-family') v = families(v).join(', ');
      attrs[p] = v;
    }
  }
  if (tag === 'text') ctx.font(families(st.fontFamily), st, src.textContent, src.ownerDocument);
  const kids = [];
  for (const c of src.childNodes) {
    if (c.nodeType === 3) { if (['text', 'tspan', 'textPath', 'style'].includes(tag) && c.nodeValue) kids.push({ text: c.nodeValue }); } else if (c.nodeType === 1) kids.push(clone(c, prefix, ctx));
  }
  return h(tag === 'svg' ? 'g' : tag, attrs, kids);
}

export function inlineSvg(el, b, k, ctx) {
  const vb = el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width ? el.viewBox.baseVal : null;
  const par = el.getAttribute('preserveAspectRatio') || 'xMidYMid meet';
  let tr = `translate(${f6(b.x)} ${f6(b.y)}) scale(${f6(k)})`;
  if (vb) {
    let sx = b.w / vb.width;
    let sy = b.h / vb.height;
    let dx = 0;
    let dy = 0;
    if (!/none/.test(par)) {
      const s = /slice/.test(par) ? Math.max(sx, sy) : Math.min(sx, sy);
      dx = (b.w - vb.width * s) * (/xMid/.test(par) ? 0.5 : /xMax/.test(par) ? 1 : 0);
      dy = (b.h - vb.height * s) * (/YMid/.test(par) ? 0.5 : /YMax/.test(par) ? 1 : 0);
      sx = s;
      sy = s;
    }
    tr = `translate(${f6(b.x + dx)} ${f6(b.y + dy)}) scale(${f6(sx)} ${f6(sy)}) translate(${f6(-vb.x)} ${f6(-vb.y)})`;
  }
  const prefix = `${ctx.id('s')}-`;
  const root = clone(el, prefix, ctx);
  if (!root) return null;
  const inner = h('g', { transform: tr }, root.kids, null);
  // the svg's own paint (fill, stroke ...) on the group; its opacity is on the element's group already
  Object.assign(inner.attrs, Object.fromEntries(Object.entries(root.attrs).filter(([n]) => n !== 'id' && n !== 'opacity')));
  if (/slice/.test(par)) { // a sliced viewBox overflows the box: clip it
    const id = ctx.id('clip');
    ctx.defs.push(h('clipPath', { id }, [h('rect', { x: b.x, y: b.y, width: b.w, height: b.h })]));
    return h('g', { 'clip-path': `url(#${id})` }, [inner]);
  }
  return inner;
}
