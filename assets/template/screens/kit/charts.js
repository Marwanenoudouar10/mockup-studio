// Charts for mock screens, drawn as inline SVG at the box's real size (so text and strokes stay crisp).
//   <div class="chart" data-chart="bars" data-values="3,4,6,5" data-labels="M,T,W,T" style="height:150px"></div>
// Labels and notes go through the screen's strings.json (kit.t): data-labels is looked up as ONE key first
// ("M,T,W,T,F": "L,M,X,J,V"), else each label on its own ("Mon": "Lun"); data-note is one key.
// Types and their attributes:
//   bars   data-values data-labels? data-colors? (one colour or one per bar) data-hl? (index, the rest fade) data-note? (bubble on hl)
//          data-min? / data-max? (value range; a min above 0 makes small differences visible)
//          data-colors splits on top-level commas only, so color-mix(...) and var(--x, #fff) work; with one colour
//          per bar the bars keep their own colours (no fade), --bar-fade still tunes the fade otherwise
//   line   data-values data-labels? data-color? data-compare? (2nd series, dashed) data-dots? data-grid?
//          data-min? / data-max? (y range; default = the data's own range, so big values never look flat)
//          data-label-at? ("0,7,14,25": the data index under each label; default = spread evenly). The first
//          and last labels are anchored inside the plot (start / end), never centred on its edges.
//          data-bands? ("113,132,151,170": thresholds in data units, e.g. heart-rate zones; one band per zone
//          behind the line) data-band-colors? (one per zone, low to high) data-band-opacity? (.16)
//          data-line-by-band? (the line takes each zone's colour) data-avg? (a dashed average line)
//          data-ring? (the dots' ring colour; default var(--chart-ring, var(--surface)): set it to the card's
//          own colour on a coloured card, or the end dot gets a white "sticker" ring)
//   spark  data-values data-color?                       (tiny line, no axes)
//   ring   data-values (0..1, one per ring, outer first) data-colors? data-stroke?   children = centre label
//   donut  data-values (any numbers: shares) data-colors? data-stroke?              children = centre label
// '' or '3,,4' must not turn into zeros: an empty piece is dropped before Number() (Number('') is 0)
const nums = (s) => String(s || '').split(',').map((v) => v.trim()).filter(Boolean).map(Number).filter((v) => !Number.isNaN(v));
// split on commas outside brackets: "color-mix(in srgb, #fff 20%, transparent), var(--a, #000)" is two values
function strs(s) {
  if (!s) return [];
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(s)) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}
const f1 = (n) => Number(n.toFixed(1));
// the labels in this language: the whole string when strings.json has it, else label by label (an empty piece
// stays empty: "Mon,,,Thu" is a sparse axis)
function labelsOf(n, kit) {
  const raw = n.dataset.labels || '';
  if (!raw) return [];
  if (kit.has && !kit.has(raw)) return strs(raw).map((l) => (l ? kit.t(l) : ''));
  return strs(kit.t(raw));
}
let uid = 0;

function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] || pts[i], pts[i], pts[i + 1], pts[i + 2] || pts[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

function bars(n, w, h, kit) {
  const v = nums(n.dataset.values);
  const labels = labelsOf(n, kit);
  const note = n.dataset.note ? kit.t(n.dataset.note) : '';
  const colors = strs(n.dataset.colors);
  const own = colors.length > 1 && colors.length >= v.length; // one colour per bar: the colours carry the highlight
  const hl = n.dataset.hl !== undefined ? Number(n.dataset.hl) : -1;
  const max = Number(n.dataset.max) || Math.max(...v) || 1;
  const min = Number(n.dataset.min) || 0;
  const lh = labels.length ? 22 : 0;
  const top = note ? 32 : 4;
  const slot = w / v.length;
  const bw = Math.min(slot * 0.56, Number(n.dataset.bar) || 34);
  const fs = kit.family === 'android' ? 12 : 12.5;
  let out = '';
  v.forEach((val, i) => {
    const bh = Math.max(bw, ((h - lh - top) * (val - min)) / (max - min || 1));
    const x = slot * i + (slot - bw) / 2;
    const y = h - lh - bh;
    const fill = colors[i] || colors[0] || 'var(--tint)';
    const fade = hl >= 0 && i !== hl && !own ? ';opacity:var(--bar-fade, .34)' : '';
    out += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(bw)}" height="${f1(bh)}" rx="${f1(bw / 2)}" style="fill:${fill}${fade}"/>`;
    if (labels[i]) out += `<text x="${f1(x + bw / 2)}" y="${h - 4}" text-anchor="middle" font-size="${fs}" style="fill:${i === hl ? 'var(--text)' : 'var(--text-2)'}" font-weight="${i === hl ? 600 : 400}">${labels[i]}</text>`;
    if (i === hl && note) {
      const tw = note.length * 6.6 + 18;
      const cx = Math.min(Math.max(x + bw / 2, tw / 2), w - tw / 2);
      out += `<rect x="${f1(cx - tw / 2)}" y="${f1(y - 32)}" width="${f1(tw)}" height="24" rx="12" style="fill:var(--text)"/>`
        + `<text x="${f1(cx)}" y="${f1(y - 15.5)}" text-anchor="middle" font-size="12" font-weight="600" style="fill:var(--bg)">${note}</text>`;
    }
  });
  return out;
}

// zone bands behind a line (data-bands) and, with data-line-by-band, a stroke that takes each zone's colour
function zones(n, w, lo, hi, Y, id) {
  const bands = nums(n.dataset.bands).filter((b) => b > lo && b < hi).sort((a, b) => a - b);
  if (!bands.length) return { out: '' };
  const given = strs(n.dataset.bandColors);
  const zone = (i) => given[i] || `color-mix(in oklab, var(--tint) ${Math.round(30 + (70 * i) / bands.length)}%, var(--surface))`;
  const edge = (i) => (i <= 0 ? lo : i > bands.length ? hi : bands[i - 1]);
  let out = '';
  for (let i = 0; i <= bands.length; i++) {
    const [a, b] = [edge(i), edge(i + 1)];
    out += `<rect x="0" width="${w}" y="${f1(Y(b))}" height="${f1(Y(a) - Y(b))}" style="fill:${zone(i)}" opacity="${n.dataset.bandOpacity || 0.16}"/>`;
  }
  if (n.dataset.lineByBand === undefined) return { out };
  const [y0, y1] = [Y(hi), Y(lo)];
  const off = (v) => f1(Math.min(1, Math.max(0, (Y(v) - y0) / ((y1 - y0) || 1))));
  let stops = '';
  for (let i = bands.length; i >= 0; i--) stops += `<stop offset="${off(edge(i + 1))}" style="stop-color:${zone(i)}"/><stop offset="${off(edge(i))}" style="stop-color:${zone(i)}"/>`;
  out += `<defs><linearGradient id="${id}z" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(y0)}" x2="0" y2="${f1(y1)}">${stops}</linearGradient></defs>`;
  return { out, stroke: `url(#${id}z)` };
}

function line(n, w, h, kit, spark = false) {
  const v = nums(n.dataset.values);
  const cmp = nums(n.dataset.compare);
  const labels = spark ? [] : labelsOf(n, kit);
  const color = n.dataset.color || 'var(--tint)';
  const all = [...v, ...cmp];
  const lo = n.dataset.min !== undefined ? Number(n.dataset.min) : Math.min(...all);
  const hi = n.dataset.max !== undefined ? Number(n.dataset.max) : Math.max(...all);
  const lh = labels.length ? 22 : 0;
  const pad = spark ? 3 : 8;
  const X = (i, len) => pad + ((w - pad * 2) * i) / Math.max(1, len - 1);
  const Y = (val) => pad + (h - lh - pad * 2) * (1 - (val - lo) / (hi - lo || 1));
  const pts = v.map((val, i) => [X(i, v.length), Y(val)]);
  const id = `ch${++uid}`;
  let out = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color}" stop-opacity=".28"/><stop offset="1" style="stop-color:${color}" stop-opacity="0"/></linearGradient></defs>`;
  const z = spark ? { out: '', stroke: color } : zones(n, w, lo, hi, Y, id);
  out += z.out;
  const stroke = z.stroke || color;
  if (n.dataset.grid !== undefined) {
    for (let g = 0; g < 3; g++) {
      const gy = f1(pad + ((h - lh - pad * 2) * g) / 2);
      out += `<line x1="0" x2="${w}" y1="${gy}" y2="${gy}" style="stroke:var(--line)" stroke-dasharray="3 4"/>`;
    }
  }
  const d = smooth(pts);
  out += `<path d="${d}L${f1(pts[pts.length - 1][0])} ${h - lh}L${f1(pts[0][0])} ${h - lh}Z" fill="url(#${id})"/>`;
  if (cmp.length) out += `<path d="${smooth(cmp.map((val, i) => [X(i, cmp.length), Y(val)]))}" fill="none" style="stroke:var(--text-3)" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round"/>`;
  if (n.dataset.avg !== undefined) {
    const ay = f1(Y(Number(n.dataset.avg)));
    out += `<line x1="0" x2="${w}" y1="${ay}" y2="${ay}" style="stroke:var(--text-3)" stroke-width="1.5" stroke-dasharray="5 5"/>`;
  }
  out += `<path d="${d}" fill="none" style="stroke:${stroke}" stroke-width="${spark ? 2 : 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (!spark) {
    const dots = n.dataset.dots !== undefined ? pts : [pts[pts.length - 1]];
    const ring = n.dataset.ring || 'var(--chart-ring, var(--surface))';
    for (const [x, y] of dots) out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5.5" style="fill:${stroke};stroke:${ring}" stroke-width="3"/>`;
  }
  const fs = kit.family === 'android' ? 12 : 12.5;
  const at = nums(n.dataset.labelAt);
  labels.forEach((t, i) => {
    if (!t) return; // a sparse axis ("Mon,,,Thu"): no empty <text> (data-label-at places fewer labels instead)
    const x = at.length === labels.length ? X(Math.min(at[i], v.length - 1), v.length) : X(i, labels.length);
    const anchor = labels.length > 1 && i === 0 ? 'start' : labels.length > 1 && i === labels.length - 1 ? 'end' : 'middle';
    const ax = anchor === 'start' ? Math.max(0, x - pad) : anchor === 'end' ? Math.min(w, x + pad) : x;
    out += `<text x="${f1(ax)}" y="${h - 4}" text-anchor="${anchor}" font-size="${fs}" style="fill:var(--text-2)">${t}</text>`;
  });
  return out;
}

function arc(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${f1(x0)} ${f1(y0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`;
}

function rings(n, w, h, donut) {
  const v = nums(n.dataset.values || n.dataset.value);
  const colors = strs(n.dataset.colors);
  const size = Math.min(w, h);
  const sw = Number(n.dataset.stroke) || size * (donut ? 0.13 : 0.1);
  const cx = w / 2;
  const cy = h / 2;
  let out = '';
  if (donut) {
    const total = v.reduce((a, b) => a + b, 0) || 1;
    const r = size / 2 - sw / 2;
    const gap = (sw * 1.1) / r;
    let a = 0;
    v.forEach((val, i) => {
      const span = (Math.PI * 2 * val) / total;
      out += `<path d="${arc(cx, cy, r, a + gap / 2, a + Math.max(span - gap / 2, gap / 2 + 0.01))}" fill="none" style="stroke:${colors[i] || 'var(--tint)'}" stroke-width="${f1(sw)}" stroke-linecap="round"/>`;
      a += span;
    });
    return out;
  }
  v.forEach((val, i) => {
    const r = size / 2 - sw / 2 - i * (sw + 3);
    const c = colors[i] || 'var(--tint)';
    out += `<circle cx="${cx}" cy="${cy}" r="${f1(r)}" fill="none" style="stroke:${c}" stroke-opacity=".18" stroke-width="${f1(sw)}"/>`;
    const end = Math.min(val, 0.999) * Math.PI * 2;
    out += `<path d="${arc(cx, cy, r, 0, end)}" fill="none" style="stroke:${c}" stroke-width="${f1(sw)}" stroke-linecap="round"/>`;
  });
  return out;
}

export function drawCharts(kit, root = document) {
  for (const n of root.querySelectorAll('[data-chart]')) {
    if (!n.getClientRects().length) continue; // hidden at this viewport size
    const { width: w, height: h } = n.getBoundingClientRect();
    if (!w || !h) {
      console.warn(`kit: chart "${n.dataset.chart}" has no size (give it a height)`);
      continue;
    }
    const type = n.dataset.chart;
    let body;
    if (type === 'bars') body = bars(n, w, h, kit);
    else if (type === 'line' || type === 'spark') body = line(n, w, h, kit, type === 'spark');
    else if (type === 'ring' || type === 'donut') body = rings(n, w, h, type === 'donut');
    else {
      console.warn(`kit: unknown chart "${type}"`);
      continue;
    }
    const svg = `<svg viewBox="0 0 ${f1(w)} ${f1(h)}" width="${f1(w)}" height="${f1(h)}" style="position:absolute;inset:0;overflow:visible;font-family:var(--font-ui)" aria-hidden="true">${body}</svg>`;
    n.insertAdjacentHTML('afterbegin', svg);
  }
}
