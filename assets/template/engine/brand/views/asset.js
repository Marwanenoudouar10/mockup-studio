// One SVG (logo or mark) drawn alone on a transparent page, for the brand kit PNGs:
//   ?view=asset&src=brand/logo.svg&color=#141327&w=1600
// Inlined like the engine does, so currentColor, var(--accent) and the display font apply.
import { q } from '../../core/boot.js';
import { graphic } from '../../core/assets.js';
import { applyColors, loadFonts } from '../../core/theme.js';

export async function render(cfg) {
  applyColors(cfg.brand.colors);
  await loadFonts(cfg.brand, cfg.brand.name);
  const g = await graphic(q.get('src'), 'bb-asset');
  const w = Number(q.get('w') || 1200);
  Object.assign(g.style, { width: `${w}px`, color: q.get('color') || cfg.brand.colors.ink });
  document.body.append(g);
  await document.fonts.ready;
  const r = g.getBoundingClientRect();
  return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
}
