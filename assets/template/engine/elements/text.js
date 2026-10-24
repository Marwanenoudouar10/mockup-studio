// text: display type used as a graphic element, e.g. the giant number that leads an image ("100", "5:12").
// { type:'text', text:'100' | {en,de}, x (centre), y (top of the line box), size:600 (font size, stage units),
//   r, z:5 (behind cards: a card may cross its foot), color:'text'|'ink'|'accent'|'primary'|'paper'|'em'|any CSS
//   colour (default 'text': the field's headline colour), outline?: true | <stroke in stage units> (letters drawn
//   as outlines, no fill: reads as a graphic, not as a second number next to a card's own), weight?: 900
//   (default: the headline weight), tracking?: -0.04 (em), opacity?, bleed?: true (cut by an edge on purpose) }
// One line, in the display face, with a tight line box (line-height .8), so y is close to the top of the digits.
// Checked for edges like a badge (render log), and its text is scanned by the store copy rules (validate).
// A giant numeral reads at sheet size only when its shape stays whole: let a card cover its foot (20-25% of
// its height), never its waist, and never put the same number on a card right under it.
import { el } from '../core/boot.js';

const ROLES = {
  text: 'var(--text)', ink: 'var(--ink)', accent: 'var(--accent)', primary: 'var(--primary)',
  paper: 'var(--paper)', em: 'var(--em)',
};

export function text(e, ctx) {
  const { fr } = ctx;
  const node = el('div', `stage-text${e.outline ? ' outline' : ''}`);
  const content = String(e.text ?? '');
  node.dataset.what = `text "${content.slice(0, 24)}"`;
  const size = e.size || 600;
  node.style.fontSize = `${size * fr.f}px`;
  node.style.setProperty('--tx', ROLES[e.color] || e.color || ROLES.text);
  if (e.outline) node.style.setProperty('--tx-stroke', `${(e.outline === true ? Math.max(4, size * 0.012) : Number(e.outline)) * fr.f}px`);
  if (e.weight) node.style.fontWeight = String(e.weight);
  if (e.tracking != null) node.style.letterSpacing = `${e.tracking}em`;
  if (e.opacity != null) node.style.opacity = String(e.opacity);
  node.textContent = content;
  node.dir = document.documentElement.dir || 'ltr';
  node.style.left = `${fr.X(e.x ?? fr.mid ?? 660)}px`;
  node.style.top = `${fr.Y(e.y ?? 0)}px`;
  node.style.transform = `translateX(-50%) rotate(${e.r || 0}deg)`;
  node.style.zIndex = String(e.z ?? 5);
  ctx.cv.el.appendChild(node);
  return node;
}
