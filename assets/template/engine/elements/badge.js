// badge: a small chip, e.g. "Works offline".
// { type:'badge', text:'Works offline' | {en,de}, icon?:'check'|'lock'|...|'brand/x.svg',
//   x (centre), y (top), r, z, size:40 (font size, stage units), style:'glass'|'solid'|'accent'|'dark',
//   iconColor?: 'var(--accent)' (default: primary on solid, accent on dark), weight?: 800, bleed? }
// A campaign badge (a bold brief) is louder: size 52-60, style 'accent' or 'dark', weight 800, r -4 to -6 to
// match the set's diagonal; a small 40-unit pill next to a 150+ unit headline reads as a caption.
// Place a badge in open field (under the stage, beside the headline), never on live UI: glass blurs the UI
// under it into a smudge, and a chip over a phone's tab bar or list rows hides what the image proves.
import { el, esc } from '../core/boot.js';
import { ICONS } from './icons.js';
import { at } from '../core/root.js';

export function badge(e, ctx) {
  const { fr } = ctx;
  const node = el('div', `badge ${e.style || 'solid'}`);
  node.style.fontSize = `${(e.size || 40) * fr.f}px`;
  if (e.iconColor) node.style.setProperty('--badge-icon', e.iconColor);
  if (e.weight) node.style.fontWeight = String(e.weight);
  let icon = '';
  if (e.icon && ICONS[e.icon]) {
    icon = `<span class="badge-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round">${ICONS[e.icon]}</svg></span>`;
  } else if (e.icon) {
    icon = `<span class="badge-icon"><img src="${esc(at(e.icon))}" alt=""></span>`;
  }
  node.innerHTML = `${icon}<span>${esc(e.text)}</span>`;
  node.dir = document.documentElement.dir || 'ltr';
  node.style.left = `${fr.X(e.x ?? fr.mid ?? 660)}px`;
  node.style.top = `${fr.Y(e.y ?? 0)}px`;
  node.style.transform = `translateX(-50%) rotate(${e.r || 0}deg)`;
  node.style.zIndex = String(e.z ?? 45);
  ctx.cv.el.appendChild(node);
  return node;
}
