// Colour math for the brand step, in OKLCH (perceptual: equal steps in L look equally light).
//   toOklch('#6C5CE7') -> { l, c, h }      oklch(l, c, h) -> '#RRGGBB' (gamut mapped: chroma is
//   reduced, lightness and hue kept, until the colour fits sRGB)
//   contrast(a, b) -> WCAG 2 ratio (1..21)  mix(a, b, t) -> blend in OKLab
// Pure ESM: the Node scripts and the board pages (over the local server) both import it.

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function parseHex(hex) {
  const h = String(hex).trim().replace(/^#/, '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex colour: "${hex}" (use #RRGGBB)`);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
}

const toHex = (rgb) => `#${rgb.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

// '#abc' / 'ABCDEF' -> '#AABBCC'
export const normHex = (hex) => toHex(parseHex(hex));

function rgbToOklab([r, g, b]) {
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

// OKLab -> LINEAR sRGB (may fall outside 0..1 when the colour is out of gamut)
function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const linearToHex = (rgb) => toHex(rgb.map((v) => gam(clamp01(v))));

export function toOklch(hex) {
  const [L, a, b] = rgbToOklab(parseHex(hex));
  const c = Math.hypot(a, b);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l: L, c, h: c < 1e-4 ? 0 : (h + 360) % 360 };
}

function lchLinear(l, c, h) {
  const r = (h * Math.PI) / 180;
  return oklabToLinear([l, c * Math.cos(r), c * Math.sin(r)]);
}
const fits = (rgb) => rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6);

export function oklch(l, c, h) {
  const L = clamp01(l);
  let hi = Math.max(0, c);
  if (fits(lchLinear(L, hi, h))) return linearToHex(lchLinear(L, hi, h));
  let lo = 0;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (fits(lchLinear(L, mid, h))) lo = mid;
    else hi = mid;
  }
  return linearToHex(lchLinear(L, lo, h));
}

export function mix(a, b, t) {
  const A = rgbToOklab(parseHex(a));
  const B = rgbToOklab(parseHex(b));
  return linearToHex(oklabToLinear(A.map((v, i) => v + (B[i] - v) * t)));
}

export function luminance(hex) {
  const [r, g, b] = parseHex(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// WCAG 2 level of a ratio: AAA (7), AA (4.5), AA large (3: text >= 24px, or >= 18.66px bold), or fail.
export function level(ratio) {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'fail';
}

// White or the given ink, whichever reads better on bg.
export const onColor = (bg, ink = '#111111') => (contrast('#FFFFFF', bg) >= contrast(ink, bg) ? '#FFFFFF' : ink);

export const rot = (h, d) => (((h + d) % 360) + 360) % 360;
// signed shortest turn from hue a to hue b (-180..180)
export const turn = (a, b) => ((((b - a) % 360) + 540) % 360) - 180;
