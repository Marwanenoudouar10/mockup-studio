// The walk: every element, in paint order, as a named <g>, with its own paint (box.js), its text (text.js),
// inline SVGs (svg.js), images, and the live screens' documents (iframes) as clipped screen groups.
// Frames: each transformed element (prepare.js recorded and neutralized it) and each iframe starts a frame
//   M = the page matrix of the frame's document coordinates, s = its scale, G = M x S(1/s)
// A group carries rotation and translation only (G relative to its parent's G); leaves carry geometry x s, so
// a text inside a scaled phone keeps its real size (font-size 41, not 41 inside a 0.4 scale), as Figma wants.
// node.meta: bbox (the element's box on the page, for cutting a panorama into its images), quad (its four page
// corners: hidden.js leaves out what a clip hides) and name + level (its layer name, names.js; tidy.js turns it
// into a unique id per file).
import { h, mat, isIdentity, rrect, radii, scaleR } from './tree.js';
import { paintBox } from './box.js';
import { textRuns } from './text.js';
import { inlineSvg } from './svg.js';
import { parseColor, paintAttrs } from './color.js';
import { nameOf } from './names.js';
import { image } from './image.js';
import { quadOf, within } from './hidden.js';

const scaleOf = (m) => Math.hypot(m.a, m.b);

function ownMatrix(o, rc) {
  const parts = [];
  if (o.translate && o.translate !== 'none') parts.push(`translate(${o.translate.split(' ').join(',')})`);
  if (o.rotate && o.rotate !== 'none') parts.push(`rotate(${o.rotate})`);
  if (o.scale && o.scale !== 'none') parts.push(`scale(${o.scale.split(' ').join(',')})`);
  const t = o.transform && o.transform !== 'none' ? o.transform : '';
  if (!t && !parts.length) return null;
  const [ox, oy] = o.transformOrigin.split(' ').map(parseFloat);
  let m = new DOMMatrix();
  for (const p of parts) m = m.multiply(new DOMMatrix(p));
  if (t) m = m.multiply(new DOMMatrix(t));
  const [X, Y] = [rc.left + ox, rc.top + oy];
  return new DOMMatrix().translate(X, Y).multiply(m).translate(-X, -Y);
}

function enter(frame, extra) {
  const M = frame.M.multiply(extra);
  const s = scaleOf(M);
  const G = M.multiply(new DOMMatrix().scale(1 / s));
  return { frame: { M, s, G }, rel: frame.G.inverse().multiply(G) };
}

function bboxOf(G, b) {
  const pts = quadOf(G, b);
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

// paint order inside a parent: negative z, in-flow content, positioned (z auto / 0), positive z
function ordered(el, ctx) {
  const win = el.ownerDocument.defaultView;
  const flexy = /flex|grid/.test(win.getComputedStyle(el).display);
  const items = [];
  let i = 0;
  for (const c of el.childNodes) {
    i++;
    if (c.nodeType === 3) { items.push({ n: c, layer: 1, z: 0, i }); continue; }
    if (c.nodeType !== 1) continue;
    const st = win.getComputedStyle(c);
    if (st.display === 'none') continue;
    const pos = st.position !== 'static';
    const z = st.zIndex === 'auto' ? null : parseInt(st.zIndex, 10);
    const sc = ((pos || flexy) && z !== null) || ctx.orig.has(c) || parseFloat(st.opacity) < 1;
    const layer = sc && z !== null && z < 0 ? 0 : pos || sc ? 2 : 1;
    items.push({ n: c, layer, z: z || 0, i });
  }
  return items.sort((a, b) => a.layer - b.layer || a.z - b.z || a.i - b.i);
}

// a live screen (iframe): its document in a group at the iframe's content box, clipped to the viewport, with
// the document's canvas background (the root's, or the body's, which CSS propagates to the viewport)
function screenGroup(el, st, rc, fr, ctx) {
  const doc = el.contentDocument;
  const bl = parseFloat(st.borderLeftWidth) + parseFloat(st.paddingLeft);
  const bt = parseFloat(st.borderTopWidth) + parseFloat(st.paddingTop);
  const e = enter(fr, new DOMMatrix().translate(rc.left + bl, rc.top + bt));
  const kk = e.frame.s;
  const [vw, vh] = [el.clientWidth * kk, el.clientHeight * kk];
  const win = doc.defaultView;
  const rootBg = parseColor(win.getComputedStyle(doc.documentElement).backgroundColor);
  const bodyBg = parseColor(win.getComputedStyle(doc.body).backgroundColor);
  const canvas = rootBg && rootBg.a > 0 ? rootBg : bodyBg;
  if (!(rootBg && rootBg.a > 0) && bodyBg) ctx.noBg.add(doc.body);
  const id = ctx.id('clip-screen');
  ctx.defs.push(h('clipPath', { id }, [h('rect', { x: 0, y: 0, width: vw, height: vh })]));
  const name = `screen-${el.dataset.screen || (el.getAttribute('src') || '').split('/').pop().split('?')[0].replace(/\.html$/, '')}`;
  const vb = { x: 0, y: 0, w: vw, h: vh };
  // what lies outside the viewport (below the fold) is left out (hidden.js)
  const kids = [canvas && canvas.a > 0 ? h('rect', { x: 0, y: 0, width: vw, height: vh, ...paintAttrs(canvas) }) : null, ...within([emit(doc.body, e.frame, ctx)], e.frame.G, [0, 0, vw, vh])];
  return h('g', { transform: isIdentity(e.rel) ? null : mat(e.rel), 'clip-path': `url(#${id})` }, kids, { bbox: bboxOf(e.frame.G, vb), quad: quadOf(e.frame.G, vb), name, level: 2 });
}

export function emit(el, frame, ctx) {
  const win = el.ownerDocument.defaultView;
  const st = win.getComputedStyle(el);
  if (st.display === 'none') return null;
  const rc = el.getBoundingClientRect();
  let fr = frame;
  let transform = null;
  const o = ctx.orig.get(el);
  const own = o && ownMatrix(o, rc);
  if (own) {
    const e = enter(frame, own);
    fr = e.frame;
    if (!isIdentity(e.rel)) transform = mat(e.rel); // a skew or a stretch stays in the matrix
  }
  const k = fr.s;
  const b = { x: rc.left * k, y: rc.top * k, w: rc.width * k, h: rc.height * k };
  const hidden = st.visibility === 'hidden';
  const kids = [];
  let box = { body: [], filter: null, mask: null, clip: null };
  if (!hidden && el.localName !== 'svg' && !ctx.noBg.has(el)) box = paintBox(el, st, b, k, ctx);
  kids.push(...box.body);
  if (el.localName === 'svg') {
    if (!hidden) kids.push(inlineSvg(el, b, k, ctx));
  } else if (el.localName === 'img') {
    if (!hidden && el.currentSrc) kids.push(image(el, st, b, k, ctx));
  } else if (el.localName === 'canvas') {
    if (!hidden) try { kids.push(h('image', { href: el.toDataURL('image/png'), x: b.x, y: b.y, width: b.w, height: b.h, preserveAspectRatio: 'none' })); } catch { ctx.warn('a canvas could not be read'); }
  } else if (el.localName === 'iframe') {
    if (el.contentDocument && el.contentDocument.body) kids.push(screenGroup(el, st, rc, fr, ctx));
  } else {
    let inner = [];
    for (const it of ordered(el, ctx)) {
      if (it.n.nodeType === 3) { if (!hidden) inner.push(...textRuns(it.n, k, ctx)); } else inner.push(emit(it.n, fr, ctx));
    }
    inner = inner.filter(Boolean);
    if (inner.length && st.overflow !== 'visible' && !['HTML', 'BODY'].includes(el.tagName)) {
      const id = ctx.id('clip');
      const s = rrect(b.x, b.y, b.w, b.h, scaleR(radii(st, rc.width, rc.height), k));
      ctx.defs.push(h('clipPath', { id }, [h(s.tag, s.attrs)]));
      inner = within(inner, fr.G, [b.x, b.y, b.x + b.w, b.y + b.h]); // what the clip hides is left out (hidden.js)
      if (inner.length) inner = [h('g', { 'clip-path': `url(#${id})` }, inner)];
    }
    kids.push(...inner);
  }
  const body = kids.filter(Boolean);
  if (!body.length) return null;
  const op = parseFloat(st.opacity);
  const blend = st.mixBlendMode && st.mixBlendMode !== 'normal' ? st.mixBlendMode : null;
  if (blend) ctx.omit(`blend mode ${blend} kept as a style (Figma does not keep blend modes)`);
  const nm = nameOf(el);
  return h('g', {
    transform, opacity: op < 1 ? +op.toFixed(4) : null, filter: box.filter, mask: box.mask,
    'clip-path': box.clip, style: blend ? `mix-blend-mode:${blend}` : null,
  }, body, { bbox: bboxOf(fr.G, b), quad: quadOf(fr.G, b), name: nm.raw, level: nm.level }); // the id: tidy.js, once per file
}
