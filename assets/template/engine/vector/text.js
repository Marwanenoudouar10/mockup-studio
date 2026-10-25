// Text nodes -> one <text> per rendered line: live, editable text in Figma (not outlines). The browser already
// broke the lines; each character's box comes from a Range, so wrapping, alignment and letter-spacing are
// Chrome's own. Baseline = the line's top + the font's ascent (canvas fontBoundingBoxAscent, rounded at the
// page's pixel ratio as Chrome does). textLength pins each line to the width Chrome gave it (Figma ignores it).
//   textRuns(textNode, k, ctx) -> [<text> nodes]     k = output units per CSS px of the text's frame
// Also: text-transform, white-space (pre keeps spaces), -webkit-text-stroke, -webkit-line-clamp and
// text-overflow: ellipsis (cut, then "…"), the optical size pinned to the CSS size (a scaled frame would pick
// another), font families mapped to the names design tools use ("Inter Variable" -> "Inter").
import { h, f2 } from './tree.js';
import { parseColor, paintAttrs } from './color.js';

const metrics = new Map();
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system']);

// '"Inter Variable", system-ui' -> ['Inter', 'system-ui']
export const families = (css) => [...new Set(String(css || '').split(',').map((f) => f.trim().replace(/^["']|["']$/g, '').replace(/ Variable$/, '')).filter(Boolean))];
const familyAttr = (list) => list.map((f) => (GENERIC.has(f) || /^[\w-]+$/.test(f) ? f : `'${f}'`)).join(', ');

function fontOf(st) {
  return `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
}

function measure(doc, st, s = 'Hg') {
  const key = `${fontOf(st)}|${s}`;
  if (!metrics.has(key)) {
    const c = doc.createElement('canvas').getContext('2d');
    c.font = fontOf(st);
    const m = c.measureText(s);
    metrics.set(key, { asc: m.fontBoundingBoxAscent, w: m.width });
  }
  return metrics.get(key);
}

const caseOf = (s, t) => (t === 'uppercase' ? s.toUpperCase() : t === 'lowercase' ? s.toLowerCase()
  : t === 'capitalize' ? s.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()) : s);

// the characters of a text node grouped into the lines Chrome laid out: [{ top, left, right, chars: [{ ch, l, r }] }]
function lines(t) {
  const doc = t.ownerDocument;
  const r = doc.createRange();
  const out = [];
  let cur = null;
  const s = t.nodeValue;
  for (let i = 0; i < s.length; i++) {
    const code = s.codePointAt(i);
    const n = code > 0xffff ? 2 : 1;
    r.setStart(t, i);
    r.setEnd(t, i + n);
    const rc = [...r.getClientRects()].find((x) => x.width > 0 || x.height > 0);
    if (rc) {
      if (!cur || Math.abs(rc.top - cur.top) > rc.height * 0.5) {
        cur = { top: rc.top, bottom: rc.bottom, chars: [] };
        out.push(cur);
      }
      cur.chars.push({ ch: s.slice(i, i + n), l: rc.left, r: rc.right });
    }
    i += n - 1;
  }
  return out;
}

// line-clamp or a one-line ellipsis on the text's parent: cut the lines it hides, add "…" where Chrome paints it
function clamp(ls, el, st, doc) {
  const win = doc.defaultView;
  const box = el.getBoundingClientRect();
  const ell = measure(doc, st, '…').w;
  const n = parseInt(st.webkitLineClamp, 10);
  if (n > 0 && ls.length > n) {
    const last = ls.slice(0, n);
    const end = last[n - 1];
    while (end.chars.length && end.chars[end.chars.length - 1].r > box.right - ell - 0.5) end.chars.pop();
    while (end.chars.length && /\s/.test(end.chars[end.chars.length - 1].ch)) end.chars.pop();
    end.chars.push({ ch: '…', l: end.chars.length ? end.chars[end.chars.length - 1].r : box.left, r: 0 });
    end.chars[end.chars.length - 1].r = end.chars[end.chars.length - 1].l + ell;
    return last;
  }
  if (st.textOverflow === 'ellipsis' && win.getComputedStyle(el).overflow !== 'visible' && el.scrollWidth > el.clientWidth + 1) {
    for (const ln of ls) {
      if (!ln.chars.some((c) => c.r > box.right + 0.5)) continue;
      while (ln.chars.length && ln.chars[ln.chars.length - 1].r > box.right - ell - 0.5) ln.chars.pop();
      const l = ln.chars.length ? ln.chars[ln.chars.length - 1].r : box.left;
      ln.chars.push({ ch: '…', l, r: l + ell });
    }
  }
  return ls;
}

export function textRuns(t, k, ctx) {
  const el = t.parentElement;
  const doc = t.ownerDocument;
  const st = doc.defaultView.getComputedStyle(el);
  if (st.visibility === 'hidden' || !t.nodeValue.trim()) return [];
  const fill = parseColor(st.webkitTextFillColor || st.color);
  const strokeW = parseFloat(st.webkitTextStrokeWidth) || 0;
  const stroke = strokeW ? parseColor(st.webkitTextStrokeColor) : null;
  if ((!fill || fill.a === 0) && !stroke) return [];
  const fams = families(st.fontFamily);
  const size = parseFloat(st.fontSize);
  const ls = st.letterSpacing === 'normal' ? 0 : parseFloat(st.letterSpacing) || 0;
  const pre = /pre/.test(st.whiteSpace);
  const rtl = st.direction === 'rtl';
  const z = doc.defaultView.devicePixelRatio || 1;
  const asc = Math.round(measure(doc, st).asc * z) / z;
  if (st.textShadow && st.textShadow !== 'none') ctx.omit('text shadows left out');
  const out = [];
  for (const ln of clamp(lines(t), el, st, doc)) {
    let chars = ln.chars;
    if (!pre) {
      while (chars.length && /\s/.test(chars[0].ch)) chars = chars.slice(1);
      while (chars.length && /\s/.test(chars[chars.length - 1].ch)) chars = chars.slice(0, -1);
    }
    if (!chars.length) continue;
    // collapsed white space, one character per glyph slot (data-gx stays aligned with the string)
    if (!pre) chars = chars.filter((c, i) => !(/\s/.test(c.ch) && i && /\s/.test(chars[i - 1].ch))).map((c) => (/\s/.test(c.ch) ? { ...c, ch: ' ' } : c));
    const str = caseOf(chars.map((c) => c.ch).join(''), st.textTransform);
    const left = Math.min(...chars.map((c) => c.l));
    const right = Math.max(...chars.map((c) => c.r));
    const width = right - left - (ls > 0 ? ls : 0);
    const attrs = {
      x: (rtl ? right : left) * k, y: (ln.top + asc) * k,
      textLength: ctx.opts.fitText && width > 0 && str.length > 1 ? width * k : null,
      lengthAdjust: ctx.opts.fitText && width > 0 && str.length > 1 ? 'spacing' : null,
      'font-family': familyAttr(fams), 'font-size': size * k, 'font-weight': st.fontWeight,
      'font-style': st.fontStyle === 'normal' ? null : st.fontStyle, 'letter-spacing': ls ? ls * k : null,
      direction: rtl ? 'rtl' : null,
      ...(fill && fill.a > 0 ? paintAttrs(fill) : { fill: 'none' }),
      ...(stroke ? { ...paintAttrs(stroke, 'stroke'), 'stroke-width': strokeW * k } : {}),
      style: `font-variation-settings:'opsz' ${f2(size)};white-space:pre${st.fontVariantNumeric !== 'normal' ? `;font-variant-numeric:${st.fontVariantNumeric}` : ''}`,
      // --outline-text (scripts/lib/outline.js): Chrome's x for every character, so the glyphs land where Chrome put them
      'data-gx': ctx.opts.outline ? chars.map((c) => f2((rtl ? c.r : c.l) * k)).join(' ') : null,
    };
    out.push(h('text', attrs, [{ text: str }], { run: { chars: chars.map((c) => [c.ch]), families: fams, weight: st.fontWeight, style: st.fontStyle } }));
  }
  return out;
}
