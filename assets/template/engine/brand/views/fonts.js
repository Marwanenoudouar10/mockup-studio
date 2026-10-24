// Type pairings: one row per pair. Left, the top of a real store image set in the pair (logo
// wordmark, headline with its ornament, sub line); middle, the display face; right, the text face
// in a paragraph and a small UI card in the brand colours.
import { el, esc, page, face, label } from '../ui.js';
import { miniPanel } from '../thumb.js';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 &amp; ? ! @ € %';

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const licence = (l) => (!l ? '' : /OFL/.test(l) ? ` · ${l}, free for commercial use` : ` · ${l}`);

function row(p, s, c) {
  const card = el('section', 'bb-card bb-font');
  card.innerHTML = `<div class="bb-opt-head"><span class="bb-num">${String(p.id).padStart(2, '0')}</span>`
    + `<div><h2>${esc(p.label)}</h2><p>${esc(cap(p.about.display))} headlines, ${esc(p.about.text)} text${licence(p.about.license)}</p></div></div>`;
  const grid = el('div', 'bb-font-grid');
  const slot = el('div', 'bb-thumb');
  const dw = p.display.weights.join(' · ');
  const tw = p.text.weights.join(' · ');
  grid.append(
    slot,
    el('div', 'bb-spec display', `${label('Display · headlines, wordmark').outerHTML}<div class="aa-row"><div class="aa">Aa</div>`
      + `<div><div class="fam">${esc(p.display.family)}</div><div class="meta">Weights ${dw}<br>Headlines at ${p.headlineWeight}</div></div></div>`
      + `<div class="glyphs">${GLYPHS}</div>`),
    el('div', 'bb-spec text', `${label('Text · sub lines, interface').outerHTML}<div class="fam">${esc(p.text.family)}</div>`
      + `<div class="meta">Weights ${tw}</div><p class="para">${esc(s.oneLiner || s.sub || '')} Every word on the store page and in the app is set in these two faces.</p>`
      + `<div class="bb-ui" style="--tint:${c.primary};--acc:${c.accent}"><div class="t">Your first step is ready</div>`
      + '<div class="b">Five quiet minutes today keeps your streak going.</div>'
      + '<div class="r"><span class="btn">Get started</span><span class="chip">5 min</span></div></div>'),
  );
  card.append(grid);
  return { card, slot };
}

export async function render(cfg, data) {
  const s = data.sample || {};
  const pairs = (data.pairs || []).filter((p) => !p.missing);
  const main = page({
    eyebrow: `${s.name || cfg.brand.name} · Brand step 3 of 5`,
    title: 'Type pairings',
    sub: `${pairs.length} pairings: a display face for the store headlines and the wordmark, a text face for sub lines and the app. `
      + 'Each is shown on the top of a real store image.',
    meta: pairs.map((p) => `<b>${p.id}</b> ${esc(p.label)}`),
    foot: [`${esc(s.name || cfg.brand.name)} · type pairings`],
  });
  main.classList.add('bb-rows');
  for (const p of pairs) {
    const [fd, ft] = [await face(p.display, [600, 700, 800]), await face(p.text, [400, 500, 600])];
    const { card, slot } = row(p, s, cfg.brand.colors);
    card.style.setProperty('--fd', fd);
    card.style.setProperty('--ft', ft);
    card.style.setProperty('--fw', String(p.headlineWeight));
    main.append(card);
    const W = slot.getBoundingClientRect().width;
    const H = Math.round(W * 0.7);
    slot.style.height = `${H}px`;
    await miniPanel(slot, {
      W, H, cfg,
      vars: { '--font-display': fd, '--font-text': ft, '--headline-weight': String(p.headlineWeight) },
      panel: { headline: s.headline, sub: s.sub, name: s.name, wordmark: !s.logo },
    });
  }
}
