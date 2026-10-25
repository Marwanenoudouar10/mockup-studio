// Computed CSS colours -> SVG paint. Chrome serializes computed colours as rgb(), rgba(), color(srgb ...) or,
// from color-mix in oklab, oklab(...): the first two are parsed, anything else goes through a 1 x 1 canvas.
//   parseColor(css) -> { rgb: '#rrggbb', a: 0..1 } | null      (null = none / transparent keyword)
//   hexOf(css)      -> '#rrggbb' | null (null when nearly transparent): the accent clash check (core/clash.js)
let probe = null;
const ctx2d = () => {
  probe = probe || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  return probe;
};
const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const alpha = (s) => (s == null ? 1 : s.endsWith('%') ? parseFloat(s) / 100 : Number(s));

export function parseColor(css) {
  if (!css || css === 'transparent' || css === 'none' || css === 'currentcolor') return null;
  let m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(css);
  if (m) return { rgb: hex(+m[1], +m[2], +m[3]), a: +alpha(m[4]).toFixed(4) };
  m = /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\)$/.exec(css);
  if (m) return { rgb: hex(+m[1] * 255, +m[2] * 255, +m[3] * 255), a: +alpha(m[4]).toFixed(4) };
  const am = /\/\s*([\d.]+%?)\s*\)$/.exec(css);
  const c = ctx2d();
  c.clearRect(0, 0, 1, 1);
  c.fillStyle = '#000';
  c.fillStyle = css.replace(/\/\s*[\d.]+%?\s*\)$/, ')');
  c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
  return { rgb: hex(r, g, b), a: +alpha(am && am[1]).toFixed(4) };
}

// fill / stroke attributes for a colour: { fill: '#hex', 'fill-opacity': a } (opacity left out when 1)
export function paintAttrs(c, prop = 'fill', times = 1) {
  if (!c || c.a * times <= 0) return { [prop]: 'none' };
  const a = c.a * times;
  return { [prop]: c.rgb, [`${prop}-opacity`]: a < 1 ? +a.toFixed(4) : null };
}

export function hexOf(css) {
  if (!css || !String(css).trim()) return null;
  const c = ctx2d();
  c.clearRect(0, 0, 1, 1);
  c.fillStyle = '#000000';
  c.fillStyle = String(css).trim();
  c.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
  if (a < 200) return null;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
