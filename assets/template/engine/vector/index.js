// A rendered page (a store image, a panorama strip, the feature graphic) -> layered SVG files for Figma,
// Illustrator and browsers. Loaded only by `npm run vector` (scripts/vector.js) through window.__vector, AFTER the
// PDF was printed: preparing the page changes it (pseudo-elements become spans, transforms are undone).
//   toSvg({ width, height, slices, fonts: 'embed'|'none', shadows: 'filter'|'none', fitText, outline }) ->
//     { files: [svg text per image], reports: [{ texts, groups, images, fonts, warnings, omitted }] }
// No <foreignObject> (Figma drops it): every box, text, image and inline SVG is drawn with SVG elements, in named
// groups (readable layer names, names.js: phone-home, screen-home, card-streak, text-recent, headline ...; never
// a bare tag such as "span-2"). Text stays text, fonts are embedded (fonts.js), live screens are nested groups
// with their real text, raster captures stay images. What has no SVG (or no Figma) equivalent is approximated
// or left out and listed per file in `omitted` (grain, backdrop blur, blend modes); `warnings` are things that
// went wrong.
import { h, serialize } from './tree.js';
import { documents, materialize, neutralize, embedImages } from './prepare.js';
import { emit } from './walk.js';
import { usedFonts, fontFaces } from './fonts.js';
import { cut, tidy, stats } from './tidy.js';

function context(opts) {
  let uid = 0;
  const warnings = new Set();
  const omitted = new Set();
  return {
    opts, defs: [], images: new Map(), orig: new WeakMap(), noBg: new Set(), extra: [], warnings, omitted,
    id: (base) => `vx${++uid}-${base}`, // defs: never the same as a layer name
    warn: (w) => warnings.add(w),
    omit: (w) => omitted.add(w),
    font: (families, st, text) => opts.extraFonts.push({ families, weight: st.fontWeight, style: st.fontStyle, text }), // svg <text>
  };
}

// <image href> -> xlink:href (older importers, Illustrator), on the way out
function legacyHref(n) {
  if (!n.tag) return;
  if ((n.tag === 'image' || n.tag === 'use') && n.attrs.href) {
    n.attrs['xlink:href'] = n.attrs.href;
    delete n.attrs.href;
  }
  n.kids.forEach(legacyHref);
}

export async function toSvg({ width, height, slices = 1, fonts = 'embed', shadows = 'filter', fitText = true, outline = false, root = '#canvas' } = {}) {
  const opts = { fonts, shadows, fitText, outline, extraFonts: [] };
  const ctx = context(opts);
  const top = document.querySelector(root) || document.body;
  const docs = documents(document);
  for (const d of docs) materialize(d, ctx);
  for (const d of docs) neutralize(d, ctx.orig);
  await embedImages(docs, ctx);
  const W = width || document.documentElement.clientWidth;
  const H = height || document.documentElement.clientHeight;
  const tree = emit(top, { M: new DOMMatrix(), s: 1, G: new DOMMatrix() }, ctx) || h('g', {});
  const files = [];
  const reports = [];
  const sw = W / slices;
  for (let i = 0; i < slices; i++) {
    const part = slices > 1 ? cut(tree, [i * sw, 0, (i + 1) * sw, H]) : tree;
    const { tree: t, defs } = tidy(part, ctx.defs);
    legacyHref(t);
    defs.forEach(legacyHref);
    const f = await fontFaces(usedFonts(t, opts.extraFonts), docs, fonts !== 'none');
    const style = f.css ? h('style', {}, [{ text: f.css }]) : null;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${sw}" height="${H}" `
      + `viewBox="${i * sw} 0 ${sw} ${H}" text-rendering="geometricPrecision">${serialize(h('defs', {}, [style, ...defs]))}${serialize(t)}</svg>`;
    files.push(svg);
    reports.push({ ...stats(t), fonts: f.report, warnings: [...ctx.warnings], omitted: [...ctx.omitted], bytes: svg.length });
  }
  return { files, reports };
}
