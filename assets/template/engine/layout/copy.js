// The copy block: logo (optional), headline with <em> accent, sub line.
// Long translations never clip: the headline and sub shrink until they fit their max line count.
// panel.wordmark (brand boards before a logo is chosen): the name as live text in the display face instead
// of brand.logo, so the colour and font boards never show another brand's lockup.
import { el, esc } from '../core/boot.js';
import { graphic } from '../core/assets.js';
import { lineRects } from '../ornaments/lines.js';
import { designRect } from './canvas.js';

export async function buildCopy(panel, { cv, slice = 0, brand, layout, ornament, sizes = {} }) {
  const tall = cv.tall;
  const side = sizes.side ?? layout.side;
  const align = panel.align || brand.align;
  const copy = el('div', `copy ornament-${ornament}${align === 'center' ? ' center' : ''}`);
  copy.dir = document.documentElement.dir || 'ltr';
  copy.style.left = `${sizes.left ?? slice * cv.designW + side}px`;
  copy.style.width = `${(sizes.width ?? cv.designW - 2 * side)}px`;
  copy.style.top = `${sizes.top ?? (tall ? layout.top : layout.topShort)}px`;
  if (panel.logo && (brand.logo || panel.wordmark)) {
    const width = sizes.logo ?? (tall ? layout.logo : layout.logoShort);
    const logo = panel.wordmark || !brand.logo ? el('div', 'logo wordmark', esc(panel.name || brand.name)) : await graphic(brand.logo, 'logo');
    if (logo.classList.contains('wordmark')) logo.style.fontSize = `${Math.round(width * 0.2)}px`;
    else logo.style.width = `${width}px`;
    if (sizes.logoGap != null) logo.style.marginBlockEnd = `${sizes.logoGap}px`;
    copy.appendChild(logo);
  }
  const h1 = el('h1', 'headline', panel.headline || '');
  const hs = sizes.headline ?? (tall ? layout.headline : layout.headlineShort);
  h1.style.fontSize = `${hs}px`;
  copy.appendChild(h1);
  let sub = null;
  if (panel.sub) {
    sub = el('p', 'sub', esc(panel.sub));
    sub.style.fontSize = `${sizes.sub ?? (tall ? layout.sub : layout.subShort)}px`;
    if (sizes.subGap != null) sub.style.marginTop = `${sizes.subGap}px`;
    copy.appendChild(sub);
  }
  cv.el.appendChild(copy);
  return { copy, h1, sub, base: hs, slice };
}

function shrink(node, base, maxLines, k, floor = 0.6) {
  if (!node) return;
  let size = parseFloat(node.style.fontSize) || base;
  let guard = 0;
  while (lineRects(node).length > maxLines && size > base * floor && guard++ < 30) {
    size *= 0.955;
    node.style.fontSize = `${size.toFixed(1)}px`;
  }
  if (lineRects(node).length > maxLines) {
    console.warn(`copy still over ${maxLines} lines at ${Math.round(size)}px: "${node.textContent.slice(0, 60)}"`);
  }
}

export function fitCopy(block, cv, layout, lines = {}) {
  shrink(block.h1, block.base, lines.headline ?? layout.maxLines, cv.k);
  if (block.sub) shrink(block.sub, parseFloat(block.sub.style.fontSize), lines.sub ?? layout.subMaxLines, cv.k, 0.75);
}

// Bottom of the copy block in design units (the stage hangs under it).
export function copyBottom(block, cv) {
  return designRect(block.copy, cv).bottom;
}
