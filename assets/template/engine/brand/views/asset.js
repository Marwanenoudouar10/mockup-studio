// One SVG (logo or mark) drawn alone on a transparent page, for the brand kit PNGs:
//   ?view=asset&src=brand/logo.svg&color=#141327&w=1600
// Inlined like the engine does, so currentColor, var(--accent) and the display font apply. The dark logo (for
// light grounds) draws a pale accent in a colour that reads on paper (color.js accentOnPaper).
import { q } from '../../core/boot.js';
import { graphic } from '../../core/assets.js';
import { applyColors, loadFonts } from '../../core/theme.js';
import { luminance, accentOnPaper } from '../../../scripts/brand/lib/color.js';

export async function render(cfg) {
  applyColors(cfg.brand.colors);
  await loadFonts(cfg.brand, cfg.brand.name);
  const g = await graphic(q.get('src'), 'bb-asset');
  const w = Number(q.get('w') || 1200);
  const color = q.get('color') || cfg.brand.colors.ink;
  Object.assign(g.style, { width: `${w}px`, color });
  // a dark logo is for light grounds: a pale accent would vanish there (the brand board does the same)
  const onPaper = luminance(color) < 0.2 ? accentOnPaper(cfg.brand.colors) : null;
  if (onPaper) g.style.setProperty('--accent', onPaper);
  document.body.append(g);
  await document.fonts.ready;
  const r = g.getBoundingClientRect();
  return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
}
