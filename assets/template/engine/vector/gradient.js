// CSS gradients (computed values) -> SVG gradients in user space, which Figma imports as editable gradient fills.
//   gradient(css, box, k, ctx) -> { def, fill } | null    box = { x, y, w, h } in output units, k = output units per CSS px
// linear: an angle or 'to <side>', over CSS's gradient line (|w sin a| + |h cos a| long, through the centre).
// radial: '<rx> <ry> at <x> <y>', circle / ellipse, farthest-corner by default; an ellipse is a circle scaled by
// gradientTransform. Stops: CSS's distribution of missing positions, and a fully transparent stop takes its
// neighbour's colour (CSS interpolates premultiplied, SVG does not: no grey fringe). Repeating and conic
// gradients are not converted (the caller warns).
import { h, f2, f6, split, words } from './tree.js';
import { parseColor } from './color.js';

function stops(list, len) {
  const raw = list.map((s) => {
    const w = words(s);
    const c = parseColor(w[0]) || { rgb: '#000000', a: 0 };
    const at = (v) => (v == null ? null : v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v) / len);
    return { c, off: at(w[1]), off2: at(w[2]) };
  }).flatMap((s) => (s.off2 != null ? [{ c: s.c, off: s.off }, { c: s.c, off: s.off2 }] : [s])); // 'red 10% 40%'
  if (raw[0].off == null) raw[0].off = 0;
  if (raw[raw.length - 1].off == null) raw[raw.length - 1].off = 1;
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].off != null) { raw[i].off = Math.max(raw[i].off, raw[i - 1].off); continue; }
    let j = i;
    while (raw[j].off == null) j++;
    for (let n = i; n < j; n++) raw[n].off = raw[i - 1].off + ((raw[j].off - raw[i - 1].off) * (n - i + 1)) / (j - i + 1);
  }
  raw.forEach((s, i) => {
    if (s.c.a > 0) return;
    const nb = raw[i - 1] && raw[i - 1].c.a ? raw[i - 1] : raw[i + 1];
    if (nb) s.c = { rgb: nb.c.rgb, a: 0 };
  });
  return raw.map((s) => h('stop', { offset: f6(Math.max(0, Math.min(1, s.off))), 'stop-color': s.c.rgb, 'stop-opacity': s.c.a === 1 ? null : f2(s.c.a) }));
}

const KEY_ANGLE = (t) => (t.includes('top') ? (t.includes('left') ? 315 : t.includes('right') ? 45 : 0)
  : t.includes('bottom') ? (t.includes('left') ? 225 : t.includes('right') ? 135 : 180) : t.includes('left') ? 270 : 90);

function linear(args, b, k, id) {
  let ang = 180;
  const first = args[0];
  const hasDir = /deg$|turn$|rad$|grad$|^to /.test(first);
  if (/deg$|turn$|rad$|grad$/.test(first)) {
    const unit = first.endsWith('turn') ? 360 : first.endsWith('grad') ? 0.9 : first.endsWith('rad') ? 180 / Math.PI : 1;
    ang = parseFloat(first) * unit;
  } else if (first.startsWith('to ')) {
    // 'to top right' on a non-square box: the line is perpendicular to the other diagonal (CSS), so the
    // corners get the end colours
    ang = KEY_ANGLE(first);
    if (/(left|right)/.test(first) && /(top|bottom)/.test(first)) {
      const t = Math.atan2(b.h, b.w) * (180 / Math.PI);
      ang = { 45: t, 135: 180 - t, 225: 180 + t, 315: 360 - t }[ang];
    }
  }
  const list = hasDir ? args.slice(1) : args;
  const a = (ang * Math.PI) / 180;
  const L = Math.abs(b.w * Math.sin(a)) + Math.abs(b.h * Math.cos(a));
  const [cx, cy] = [b.x + b.w / 2, b.y + b.h / 2];
  const [dx, dy] = [(Math.sin(a) * L) / 2, (-Math.cos(a) * L) / 2];
  return h('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy }, stops(list, L / k));
}

function radial(args, b, k, id) {
  let shape = args[0];
  let list = args.slice(1);
  if (!/ at |px|%|circle|ellipse|closest|farthest/.test(shape)) { shape = 'ellipse farthest-corner at 50% 50%'; list = args; }
  const [size, pos = '50% 50%'] = shape.split(/\s*\bat\b\s*/);
  const pw = words(pos);
  const len = (s, base) => (s.endsWith('%') ? (parseFloat(s) / 100) * base : parseFloat(s) * k);
  const KW = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  const ox = pw[0] in KW ? KW[pw[0]] * b.w : len(pw[0], b.w);
  const oy = (pw[1] || 'center') in KW ? KW[pw[1] || 'center'] * b.h : len(pw[1], b.h);
  const sw = words(size).filter((t) => !['circle', 'ellipse'].includes(t));
  const circle = /circle/.test(size);
  let rx;
  let ry;
  if (sw.length && /px|%/.test(sw[0])) {
    rx = len(sw[0], b.w);
    ry = sw[1] ? len(sw[1], b.h) : rx;
  } else {
    const near = /closest/.test(size);
    const fx = near ? Math.min(ox, b.w - ox) : Math.max(ox, b.w - ox);
    const fy = near ? Math.min(oy, b.h - oy) : Math.max(oy, b.h - oy);
    const side = /side/.test(size);
    if (circle) rx = ry = side ? (near ? Math.min(fx, fy) : Math.max(fx, fy)) : Math.hypot(fx, fy);
    else if (side) { rx = fx; ry = fy; } else { rx = fx * Math.SQRT2; ry = fy * Math.SQRT2; }
  }
  const [cx, cy] = [b.x + ox, b.y + oy];
  rx = Math.max(rx, 0.01);
  return h('radialGradient', {
    id, gradientUnits: 'userSpaceOnUse', cx, cy, r: rx,
    gradientTransform: Math.abs(ry - rx) > 0.01 ? `translate(${f2(cx)} ${f2(cy)}) scale(1 ${f6(ry / rx)}) translate(${f2(-cx)} ${f2(-cy)})` : null,
  }, stops(list, rx / k));
}

export function gradient(css, b, k, ctx) {
  const m = /^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/s.exec(css);
  if (!m || m[1] || m[2] === 'conic') return null;
  const id = ctx.id('gradient');
  const args = split(m[3]);
  const def = m[2] === 'linear' ? linear(args, b, k, id) : radial(args, b, k, id);
  return { def, fill: `url(#${id})` };
}
