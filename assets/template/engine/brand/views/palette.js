// Colour directions: one card per palette option, judged on a real store image (engine field, logo,
// headline + ornament, watermark, a phone showing the kit's sample screen in that palette), on the
// screen itself, on its swatches and ramps, and on its WCAG contrast checks.
import { el, esc, page, swatch, swatchKeys, ramp, checkRow } from '../ui.js';
import { loadFonts } from '../../core/theme.js';
import { miniPanel } from '../thumb.js';
import { at } from '../../core/root.js';

export async function render(cfg, data) {
  const s = data.sample || {};
  const opts = data.options || [];
  const failing = opts.map((o) => o.checks.filter((c) => !c.pass).length);
  // the thumbnails set the headline and the live-text wordmark in the brand faces (else a fallback sans, and
  // textLength squeezes the wordmark), as the other boards do
  await loadFonts(cfg.brand, `${s.name || ''} ${s.headline || ''}`);
  const main = page({
    eyebrow: `${s.name || cfg.brand.name} · Brand step 2 of 5`,
    title: 'Colour directions',
    sub: `${opts.length} palettes from the seed <b>${esc(data.seed)}</b> with a <b>${esc(data.mood)}</b> mood, each shown on a store image `
      + 'and on an app screen, with its contrast checks (WCAG 2).',
    meta: opts.map((o, i) => `<b>${o.id}</b> ${esc(o.name)} · ${failing[i] ? `${failing[i]} check${failing[i] > 1 ? 's' : ''} to watch` : 'all checks pass'}`),
    foot: [`${esc(s.name || cfg.brand.name)} · colour directions`],
  });
  main.classList.add('bb-cols');
  main.style.setProperty('--cols', String(Math.max(2, opts.length)));
  for (const o of opts) {
    const card = el('section', 'bb-card bb-opt');
    card.innerHTML = `<div class="bb-opt-head"><span class="bb-num">${String(o.id).padStart(2, '0')}</span>`
      + `<div><h2>${esc(o.name)}</h2><p>${esc(o.why)}</p></div></div>`;
    const slot = el('div', 'bb-thumb');
    const shot = `${data.dir}/sample-${o.id}.png`;
    const pair = el('div', 'bb-pair');
    pair.append(slot, el('div', 'bb-screen', `<img src="${at(shot)}" alt="">`));
    card.append(pair, el('div', 'bb-caption', '<span>Store image</span><span>App screen</span>'));
    const sw = el('div', 'bb-swatches');
    for (const { key, name } of swatchKeys(o.colors)) sw.append(swatch(name, o.colors[key]));
    const checks = el('div', 'bb-checks');
    for (const c of o.checks) checks.append(checkRow(c));
    card.append(sw, ramp(o.ramp, 'tint'), ramp(o.neutrals, 'neutral'), checks);
    main.append(card);
    const W = slot.getBoundingClientRect().width;
    slot.style.height = `${Math.round((W * 2868) / 1320)}px`;
    await miniPanel(slot, {
      W, H: Math.round((W * 2868) / 1320), cfg, colors: o.colors, field: o.field,
      panel: { headline: s.headline, name: s.name, wordmark: !s.logo },
      stage: [
        { type: 'phone', screen: shot.replace(/\.png$/, '-phone.png'), w: 760, x: 660, y: 40, z: 20 }, // without the lifted card
        { type: 'lift', screen: shot, box: 'card', w: 640, x: 420, y: 1060, r: -4, z: 30 },
      ],
    });
  }
}
