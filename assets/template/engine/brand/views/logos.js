// Logo directions: one row per option. The lockup on paper, on ink and on the brand field (the
// engine's own field + grain), the symbol at small sizes (64 to 16 px), and the derived app icon as
// iOS and Android mask it. Also checks each lockup in the page (printed as warnings): wordmark
// width vs its textLength in the chosen display font, and nothing drawn outside the viewBox.
import { graphic } from '../../core/assets.js';
import { applyColors, loadFonts } from '../../core/theme.js';
import { el, esc, page, iconShape } from '../ui.js';
import { at } from '../../core/root.js';
import { brandFor } from '../../../scripts/lib/config.js';
import { accentOnPaper } from '../../../scripts/brand/lib/color.js';

const LIGHT = ['light', 'paper', 'mesh'];

function checkLockup(node, id) {
  const svg = node.querySelector('svg');
  if (!svg) return;
  for (const t of svg.querySelectorAll('text[textLength]')) {
    const probe = t.cloneNode(true);
    probe.removeAttribute('textLength');
    probe.removeAttribute('lengthAdjust');
    svg.appendChild(probe);
    const natural = probe.getComputedTextLength();
    probe.remove();
    const set = parseFloat(t.getAttribute('textLength'));
    if (Math.abs(natural - set) / set > 0.04) {
      console.warn(`logo ${id}: the wordmark is ${Math.round(natural)} wide in this font but textLength is ${set}: set textLength="${Math.round(natural)}" and widen the viewBox to match`);
    }
  }
  const vb = svg.viewBox.baseVal;
  const b = inkBox(svg);
  if (vb && vb.width && b && (b.x0 < vb.x - 1 || b.y0 < vb.y - 1 || b.x1 > vb.x + vb.width + 1 || b.y1 > vb.y + vb.height + 1)) {
    const r = (v) => Math.round(v);
    console.warn(`logo ${id}: the drawing (${r(b.x0)} ${r(b.y0)} to ${r(b.x1)} ${r(b.y1)}) runs outside the viewBox `
      + `(${vb.x} ${vb.y} ${vb.width} ${vb.height}): it will be clipped`);
  }
}

// Union of what is actually drawn: shapes by getBBox, text by the glyphs' ink (a text's getBBox is its
// whole line box, ascent to descent, which would flag every wordmark).
function inkBox(svg) {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x0, y0, x1, y1) => Object.assign(box, { x0: Math.min(box.x0, x0), y0: Math.min(box.y0, y0), x1: Math.max(box.x1, x1), y1: Math.max(box.y1, y1) });
  for (const n of svg.querySelectorAll('path, circle, ellipse, rect, polygon, polyline, line')) {
    const b = n.getBBox();
    if (b.width || b.height) add(b.x, b.y, b.x + b.width, b.y + b.height);
  }
  const ctx = document.createElement('canvas').getContext('2d');
  for (const t of svg.querySelectorAll('text')) {
    const cs = getComputedStyle(t);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(t.textContent);
    const x = parseFloat(t.getAttribute('x')) || 0;
    const y = parseFloat(t.getAttribute('y')) || 0;
    const len = parseFloat(t.getAttribute('textLength')) || t.getComputedTextLength();
    add(x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent, x + len, y + m.actualBoundingBoxDescent);
  }
  return box.x0 === Infinity ? null : box;
}

// the engine's field preset as a backdrop, at design scale (radial lights are sized in design units)
function field(tile, preset, w, h, grain) {
  const k = w / 1320;
  const cv = el('div', `canvas field-${preset}${grain ? ' grain' : ''}`);
  Object.assign(cv.style, { width: '1320px', height: `${h / k}px`, transform: `scale(${k})` });
  tile.prepend(cv);
}

async function lockupTile(src, cls, width, colors, color) {
  const tile = el('div', `bb-tile ${cls}`);
  applyColors(colors, tile);
  const g = await graphic(src, 'bb-logo');
  g.style.width = width;
  if (color) g.style.color = color;
  tile.append(g);
  return tile;
}

async function sizesTile(o, colors) {
  const tile = el('div', 'bb-tile sizes');
  applyColors(colors, tile);
  const row = el('div', 'bb-sizes');
  for (const px of [64, 32, 20, 16]) {
    const cell = el('div', 'cell');
    const g = await graphic(o.mark || o.lockup, 'bb-mark');
    g.style.width = `${px}px`;
    cell.append(g, el('span', '', `${px}`));
    row.append(cell);
  }
  const small = await graphic(o.lockup, 'bb-logo');
  small.style.width = '120px';
  tile.append(row, small, el('span', 'cap', 'lockup at 120 px'));
  return tile;
}

export async function render(cfg, data) {
  const c = cfg.brand.colors;
  const fieldName = brandFor(cfg).field; // per-store variants resolved, as the brand board does
  const s = data.sample || {};
  const name = s.name || cfg.brand.name || '';
  await loadFonts(cfg.brand, `${name} ${name.toLowerCase()} ${name.toUpperCase()}`);
  const opts = data.options || [];
  const main = page({
    eyebrow: `${s.name || cfg.brand.name} · Brand step 4 of 5`,
    title: 'Logo directions',
    sub: `${opts.length} directions, each tested where it will live: light and dark surfaces, the brand field, `
      + 'tiny sizes, and the app icon the stores will show.',
    meta: opts.map((o) => `<b>${esc(o.id.toUpperCase())}</b> ${esc(o.title)}`),
    foot: [`${esc(s.name || cfg.brand.name)} · logo directions`],
  });
  main.classList.add('bb-rows');
  for (const o of opts) {
    const card = el('section', 'bb-card bb-logo-row');
    card.innerHTML = `<div class="bb-opt-head"><span class="bb-num">${esc(o.id.toUpperCase())}</span>`
      + `<div><h2>${esc(o.title)}</h2><p>${esc(o.desc)}</p></div></div>`;
    const grid = el('div', 'bb-logo-grid');
    const paper = await lockupTile(o.lockup, 'paper', '76%', c, c.ink);
    const onPaper = accentOnPaper(c); // a pale accent would vanish on paper (brand board: the same)
    if (onPaper) paper.querySelector('.bb-logo').style.setProperty('--accent', onPaper);
    const ink = await lockupTile(o.lockup, 'ink', '74%', c, '#FFFFFF');
    // a light field (light, paper, mesh) takes the ink lockup even when onField was left white
    const brand = await lockupTile(o.lockup, 'brand', '74%', c, LIGHT.includes(fieldName) ? c.ink : c.onField || '#FFFFFF');
    const icon = el('div', 'bb-tile icon');
    if (o.icon) icon.append(iconShape(at(o.icon), 112, 'ios'), iconShape(at(o.icon), 72, 'android'));
    grid.append(paper, ink, brand, await sizesTile(o, c), icon);
    const caps = el('div', 'bb-logo-caps', ['On paper', 'On ink', 'On the brand field', 'Small sizes (px)', 'App icon · iOS, Android']
      .map((t) => `<span>${t}</span>`).join(''));
    card.append(grid, caps);
    main.append(card);
    paper.style.background = c.paper;
    ink.style.background = c.ink;
    const r = brand.getBoundingClientRect();
    field(brand, fieldName, r.width, r.height, cfg.brand.grain);
    checkLockup(paper, o.id);
  }
  for (const n of document.querySelectorAll('.bb-tile .bb-logo, .bb-tile .bb-mark')) n.style.position = 'relative';
  return null;
}
