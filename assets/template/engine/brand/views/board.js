// The brand board: one page for approval before any screen or store image is built.
//   logo on paper (big) | logo on the brand field | app icon | palette with contrast | type pair |
//   a UI card lifted from a real screen | a store-image thumbnail (tall, on the right)
// Everything is read from the files the engine will use (tokens, logo, mark, icon), not redrawn.
import { graphic } from '../../core/assets.js';
import { applyColors, loadFonts } from '../../core/theme.js';
import { contrast, onColor, level } from '../../../scripts/brand/lib/color.js';
import { el, esc, page, swatch, label, iconShape, today } from '../ui.js';
import { miniPanel } from '../thumb.js';
import { at } from '../../core/root.js';
import { brandFor } from '../../../scripts/lib/config.js';

const tile = (cls, title) => {
  const t = el('section', `bb-cell ${cls}`);
  if (title) t.append(label(title, 'bb-cell-label'));
  return t;
};

// the lockup, or the name set in the display face while no logo is chosen (sample.logo false)
async function logoTile(src, cls, color, width, name) {
  const g = src ? await graphic(src, 'bb-logo') : el('div', 'bb-logo bb-wordmark', esc(name));
  if (src) g.style.width = width;
  else g.dataset.share = String(parseFloat(width) / 100); // sized once it is in the page (fitWordmarks)
  g.style.color = color;
  return g;
}

// a text wordmark as wide as the lockup would be: its share of the tile's width
function fitWordmarks(root) {
  for (const g of root.querySelectorAll('.bb-wordmark[data-share]')) {
    const want = g.parentElement.clientWidth * Number(g.dataset.share);
    g.style.fontSize = '100px';
    g.style.fontSize = `${Math.round((100 * want) / Math.max(1, g.scrollWidth) * 0.7)}px`;
  }
}

function fieldBackdrop(node, preset, grain) {
  const r = node.getBoundingClientRect();
  const k = r.width / 1320;
  const cv = el('div', `canvas field-${preset}${grain ? ' grain' : ''}`);
  Object.assign(cv.style, { width: '1320px', height: `${r.height / k}px`, transform: `scale(${k})` });
  node.prepend(cv);
}

function palette(c) {
  const t = tile('colour', 'Colour');
  const row = el('div', 'bb-swatches big');
  for (const k of ['primary', 'secondary', 'deep', 'accent', 'ink', 'paper']) {
    const on = onColor(c[k], c.ink);
    const r = contrast(on, c[k]);
    row.append(swatch(k, c[k], `Aa ${r.toFixed(1)} · ${level(r)}`));
  }
  t.append(row);
  return t;
}

function type(f, weight, s) {
  const t = tile('type', 'Type');
  const fam = (x) => esc(x.family.replace(/ Variable$/, ''));
  const spec = (role, name, w, use, weights, sample, cls) => `<div class="bb-type-col">`
    + `<div class="top"><div class="aa" style="font-family:var(${role});font-weight:${w}">Aa</div>`
    + `<div><div class="fam" style="font-family:var(${role});font-weight:${w === 400 ? 600 : w}">${name}</div>`
    + `<div class="meta">${use}<br>${weights}</div></div></div>`
    + `<div class="sample ${cls}" style="font-family:var(${role})">${sample}</div></div>`;
  t.append(el('div', 'bb-type',
    spec('--font-display', fam(f.display), weight, 'Headlines, wordmark', `Weight ${weight}`, s.headline || '', 'display')
    + spec('--font-text', fam(f.text), 400, 'Sub lines, interface', `Weights ${f.text.weights.join(' ')}`, esc(s.oneLiner || ''), 'text')));
  return t;
}

export async function render(cfg, data) {
  const b = cfg.brand;
  const c = b.colors;
  const s = data.sample || {};
  // the field as the first phone store renders it (brand.field may vary per store or platform)
  const field = brandFor(cfg).field;
  await loadFonts(b, `${s.name} ${s.oneLiner} Aa ${s.headline}`);
  const src = data.source || {};
  const main = page({
    eyebrow: data.label || 'Brand board · for approval',
    title: s.name || b.name,
    titleFont: 'var(--font-display)',
    sub: esc(s.oneLiner || ''),
    meta: [
      s.personality && s.personality.length ? `Personality <b>${s.personality.map(esc).join(' · ')}</b>` : '',
      src.palette ? `Colour <b>${esc(src.palette.replace(/^\d+ /, ''))}</b>` : '',
      `Type <b>${esc(b.fonts.display.family.replace(/ Variable$/, ''))} + ${esc(b.fonts.text.family.replace(/ Variable$/, ''))}</b>`,
    ].filter(Boolean),
    foot: [`${esc(s.name || b.name)} · brand board`, today()],
  });
  main.classList.add('bb-board');
  applyColors(c, main);

  const hero = tile('hero', 'Primary lockup');
  hero.style.background = c.paper;
  const logo = s.logo ? b.logo : null;
  hero.append(await logoTile(logo, 'hero', c.ink, '62%', s.name || b.name));
  if (s.personality && s.personality.length) hero.append(el('div', 'bb-words', s.personality.map(esc).join('<i></i>')));
  const reversed = tile('reversed', 'On the brand field');
  reversed.append(await logoTile(logo, 'rev', c.onField || '#FFFFFF', '74%', s.name || b.name));
  const icon = tile('icon', 'App icon');
  const icons = el('div', 'bb-icons');
  if (s.logo) icons.append(iconShape(at(cfg.icon.src), 96, 'ios'), iconShape(at(cfg.icon.src), 60, 'android'), iconShape(at(cfg.icon.src), 38, 'ios'));
  else icons.append(el('div', 'bb-icon-todo', 'Made from the logo<br>(npm run brand -- apply --logo)'));
  icon.append(icons, el('div', 'bb-icon-name', esc(s.name || b.name)));
  const ui = tile('ui', 'Interface');
  const shot = tile('panel', null);
  const typeTile = type(b.fonts, b.headlineWeight, s);
  // on a dark field the store images set the accent word in the accent, so the specimen does too
  const onField = data.specimen ? data.specimen === 'field' : field === 'dark';
  if (onField) typeTile.classList.add('on-field');
  main.append(hero, reversed, shot, icon, palette(c), typeTile, ui);
  fieldBackdrop(reversed, field, b.grain);
  fitWordmarks(main);

  const card = data.box || data.crop;
  if (card) await uiCard(ui, data);
  const W = shot.getBoundingClientRect().width;
  const H = Math.round((W * 2868) / 1320);
  shot.style.height = `${H}px`;
  // the phone shows another screen than the lifted card's (never the same card twice on one image)
  const two = data.phone && data.phone !== data.screen;
  await miniPanel(shot, {
    W, H, cfg, field,
    panel: { headline: s.headline, name: s.name, wordmark: !s.logo },
    stage: [
      { type: 'phone', screen: two ? data.phone : data.screen, w: 760, x: 660, y: 40, z: 20 },
      ...(two && card ? [{ type: 'lift', screen: data.screen, box: data.box, crop: data.crop, w: 640, x: 420, y: 1060, r: -4, z: 30 }] : []),
    ],
  });
  if (onField) fieldBackdrop(typeTile, field, b.grain); // last: the UI card and thumbnail set the row height
}

// the box (from the capture's boxes file) or the --crop, cut out at the tile's width (as the engine's lift does)
async function uiCard(t, data) {
  let box = data.crop;
  if (!box) {
    const r = await fetch(at(data.screen.replace(/\.\w+$/, '.boxes.json')));
    box = r.ok ? (await r.json())[data.box] : null;
  }
  if (!box) return console.warn(`board: box "${data.box}" not found for ${data.screen}`);
  const img = new Image();
  img.src = at(data.screen);
  await img.decode();
  const [x, y, w, h, rad = img.naturalWidth * 0.033] = Array.isArray(box) ? box : [box.x, box.y, box.w, box.h, box.r];
  const W = t.clientWidth - 56;
  const z = W / w;
  const card = el('div', 'bb-lift', `<img src="${at(data.screen)}" alt="" style="width:${img.naturalWidth * z}px;left:${-x * z}px;top:${-y * z}px">`);
  Object.assign(card.style, { width: `${W}px`, height: `${h * z}px`, borderRadius: `${rad * z}px` });
  t.append(card);
}
