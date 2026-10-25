// --outline-text (npm run vector): every <text> of an SVG becomes a <path> of its glyphs, for tools that do not
// have the fonts (a print shop, an older Illustrator). The text is no longer editable as text, so this is an
// option, never the default. Needs the optional dependency fontkit (npm install keeps it; MIT).
//   outlineText(svg, report) -> { svg, outlined, kept }
// The fonts are the faces the SVG embeds (its <style> @font-face rules, exactly what Chrome used), variable axes
// set to the text's weight and optical size. Each glyph sits at the x Chrome gave its character (data-gx,
// written by engine/vector/text.js), so wrapping, letter-spacing and textLength need no re-layout. Right-to-left
// runs (Arabic) are shaped by fontkit and set from the run's right edge: best effort.
import { createRequire } from 'node:module';
import { ROOT } from './cli.js';

let fontkit = null;
function load() {
  if (fontkit) return fontkit;
  try {
    fontkit = createRequire(`${ROOT}/package.json`)('fontkit');
  } catch {
    throw new Error('--outline-text needs fontkit: npm install (it is an optional dependency of the project)');
  }
  return fontkit;
}

const attr = (s, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(s);
  return m ? m[1] : null;
};
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function faces(svg) {
  const out = [];
  for (const m of unesc(svg).matchAll(/@font-face\{([^}]*)\}/g)) {
    const body = m[1];
    const get = (k) => (new RegExp(`${k}:([^;]*)`).exec(body) || [])[1];
    const data = /url\(data:[^;,]*;base64,([^)]*)\)/.exec(body);
    if (!data) continue;
    const [lo, hi = lo] = String(get('font-weight') || '400').trim().split(/\s+/).map(Number);
    out.push({
      family: String(get('font-family') || '').replace(/"/g, ''), style: get('font-style') || 'normal', lo, hi,
      range: get('unicode-range') || '', data: data[1], font: null,
    });
  }
  return out;
}

const inRange = (range, cp) => !range || range.split(',').some((part) => {
  const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(part.trim());
  if (!m) return false;
  const lo = parseInt(m[1].replace(/\?/g, '0'), 16);
  const hi = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'F'), 16);
  return cp >= lo && cp <= hi;
});

// fontkit cannot apply variations to a WOFF2 file (getVariation re-reads it as TTF; its glyph decoder breaks).
// Work around it: decode the glyphs first, then set the coordinates and run gvar on each glyph's points.
function woff2Variation(buf, v) {
  const f = load().create(buf);
  f.getGlyph(0); // decodes the transformed glyf table while no variation is set
  // the processor comes from a second, untouched instance (fontkit caches the first one's "no variation")
  const p = load().create(buf);
  p.variationCoords = p.fvar.axis.map((a) => Math.max(a.minValue, Math.min(a.maxValue, v[a.axisTag.trim()] ?? a.defaultValue)));
  const proc = p._variationProcessor;
  const get = f.getGlyph.bind(f);
  f.getGlyph = (id, chars) => {
    const g = get(id, chars);
    if (!g || g.varied || !proc) return g;
    g.varied = true;
    const decode = g._decode.bind(g);
    g._decode = () => {
      const d = decode();
      if (!d || !d.points || !d.points.length) return d;
      const P = d.points[0].constructor;
      const m = f.hmtx.metrics.get(id) || { advance: 0, bearing: 0 };
      const xMin = d.xMin ?? m.bearing;
      const pts = d.points.map((p) => new P(p.onCurve, p.endContour, p.x, p.y));
      pts.push(new P(false, true, xMin - m.bearing, 0), new P(false, true, xMin - m.bearing + m.advance, 0), new P(false, true, 0, 0), new P(false, true, 0, 0));
      proc.transformPoints(id, pts);
      return { ...d, points: pts.slice(0, -4) };
    };
    return g;
  };
  return f;
}

const variants = new Map();
function fontFor(face, weight, opsz) {
  if (!face.font) face.font = load().create(Buffer.from(face.data, 'base64'));
  const axes = face.font.variationAxes || {};
  if (!axes.wght && !axes.opsz) return face.font;
  const key = `${face.data.length}|${face.data.slice(0, 64)}|${weight}|${opsz}`;
  if (!variants.has(key)) {
    const v = {};
    if (axes.wght) v.wght = Math.max(axes.wght.min, Math.min(axes.wght.max, weight));
    if (axes.opsz && opsz) v.opsz = Math.max(axes.opsz.min, Math.min(axes.opsz.max, opsz));
    variants.set(key, woff2Variation(Buffer.from(face.data, 'base64'), v));
  }
  return variants.get(key);
}

const r2 = (n) => Math.round(n * 100) / 100;
const FEAT = { 'tabular-nums': 'tnum', 'lining-nums': 'lnum', 'oldstyle-nums': 'onum', 'proportional-nums': 'pnum', 'slashed-zero': 'zero', 'diagonal-fractions': 'frac' };
const pathAt = (glyph, s, x, y) => glyph.path.scale(s, -s).translate(x, y).toSVG().replace(/-?\d+\.\d+/g, (v) => String(r2(+v)));

function outlineOne(tag, text, all) {
  const families = String(attr(tag, 'font-family') || '').split(',').map((f) => f.trim().replace(/^'|'$/g, ''));
  const size = parseFloat(attr(tag, 'font-size'));
  const weight = +(attr(tag, 'font-weight') || 400);
  const style = attr(tag, 'font-style') || 'normal';
  const opsz = +((/'opsz'\s*([\d.]+)/.exec(attr(tag, 'style') || '') || [])[1] || 0);
  const x0 = parseFloat(attr(tag, 'x')) || 0;
  const y = parseFloat(attr(tag, 'y')) || 0;
  const gx = attr(tag, 'data-gx') ? attr(tag, 'data-gx').split(' ').map(Number) : [];
  const chars = [...unesc(text)];
  const pick = (cp) => families.map((f) => all.find((fc) => fc.family === f && fc.style === style && weight >= fc.lo && weight <= fc.hi && inRange(fc.range, cp))).find(Boolean);
  let d = '';
  if (attr(tag, 'direction') === 'rtl') {
    const face = pick(chars[0].codePointAt(0));
    if (!face) return null;
    const font = fontFor(face, weight, opsz);
    const s = size / font.unitsPerEm;
    const run = font.layout(chars.join(''), undefined, undefined, undefined, 'rtl');
    let x = x0 - run.advanceWidth * s;
    run.glyphs.forEach((g, i) => { d += pathAt(g, s, x + run.positions[i].xOffset * s, y - run.positions[i].yOffset * s); x += run.positions[i].xAdvance * s; });
    return d;
  }
  // glyphs by fontkit's layout (ligatures, tabular digits ...), one layout per run of characters that share a face
  const faceOf = chars.map((ch) => pick(ch.codePointAt(0)));
  if (chars.some((ch, i) => !faceOf[i] && /\S/.test(ch))) return null;
  const features = ((/font-variant-numeric:([^;]*)/.exec(attr(tag, 'style') || '') || [])[1] || '').trim().split(/\s+/).map((k) => FEAT[k]).filter(Boolean);
  const glyphs = [];
  for (let i = 0; i < chars.length;) {
    let j = i;
    while (j < chars.length && faceOf[j] === faceOf[i]) j++;
    if (faceOf[i]) {
      const font = fontFor(faceOf[i], weight, opsz);
      const s = size / font.unitsPerEm;
      const run = font.layout(chars.slice(i, j).join(''), features);
      let ci = i;
      run.glyphs.forEach((g, k) => { glyphs.push({ g, ci, s, adv: run.positions[k].xAdvance * s }); ci += Math.max(1, g.codePoints.length); });
    }
    i = j;
  }
  if (!gx.length) {
    // an inline SVG's own <text> (a chart label) has no data-gx: placed from its x and text-anchor
    const ls = parseFloat(attr(tag, 'letter-spacing')) || 0;
    const width = glyphs.reduce((w, q) => w + q.adv + ls, 0) - ls;
    const anchor = attr(tag, 'text-anchor');
    let at = x0 - (anchor === 'middle' ? width / 2 : anchor === 'end' ? width : 0);
    for (const q of glyphs) { q.x = at; at += q.adv + ls; }
  } else {
    let at = x0;
    for (const q of glyphs) { if (Number.isFinite(gx[q.ci])) at = gx[q.ci]; q.x = at; at += q.adv; }
  }
  for (const q of glyphs) d += pathAt(q.g, q.s, q.x, y);
  return d;
}

const PAINT = ['fill', 'fill-opacity', 'stroke', 'stroke-opacity', 'stroke-width'];

export async function outlineText(svg, report = {}) {
  const all = faces(svg);
  let outlined = 0;
  let kept = 0;
  const out = svg.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (whole, tag, text) => {
    const d = outlineOne(tag, text, all);
    if (d === null) { kept++; return whole; }
    outlined++;
    const paint = PAINT.map((p) => [p, attr(tag, p)]).filter(([, v]) => v !== null).map(([p, v]) => ` ${p}="${v}"`).join('');
    return `<path d="${d || 'M0 0'}"${paint} aria-label="${text.replace(/"/g, '&quot;')}"/>`;
  });
  if (kept) (report.warnings ||= []).push(`${kept} text(s) kept as text (no embedded face covers them)`);
  report.outlined = outlined;
  // the faces are no longer needed when every text is a path
  return { svg: kept ? out : out.replace(/<style>[^<]*<\/style>/, ''), outlined, kept };
}

// a font file (a fontsource woff / woff2) set to a weight, for glyph outlines outside an SVG (the quick wordmark,
// scripts/brand/lib/wordmark.js): a variable face gets the weight on its wght axis (the woff2 workaround above)
export function fontAt(buf, weight) {
  const f = load().create(buf);
  const axes = f.variationAxes || {};
  return axes.wght ? woff2Variation(buf, { wght: Math.max(axes.wght.min, Math.min(axes.wght.max, weight)) }) : f;
}
