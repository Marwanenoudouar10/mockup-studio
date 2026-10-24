// The accent word and the logo's accent shapes against the field they sit on. On a field painted in the accent
// itself (a one-accent brand's vivid feature graphic, a solid field in the primary when accent = primary) both
// vanish while every other check passes. Measured on computed colours: the canvas background-color (a preset's
// base colour; the gradient preset has none, so --primary), the <em> colour, and the logo's --accent
// (--logo-accent, engine/styles/field.css). Under 1.6:1 is an issue.
import { contrast } from '../../scripts/brand/lib/color.js';
import { issue } from './issues.js';

const LIMIT = 1.6;
let probe = null;

// any CSS colour (rgb, color(srgb ...), oklab from color-mix) -> '#rrggbb', or null when (nearly) transparent
function hexOf(css) {
  if (!css || !String(css).trim()) return null;
  probe = probe || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000000';
  probe.fillStyle = String(css).trim();
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  if (a < 200) return null;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function accentClash(cv, where = '') {
  const cs = getComputedStyle(cv.el);
  const field = hexOf(cs.backgroundColor) || hexOf(cs.getPropertyValue('--primary'));
  if (!field) return;
  const at = where ? `${where}: ` : '';
  const em = cv.el.querySelector('.headline em');
  const emHex = em && hexOf(getComputedStyle(em).color);
  if (emHex && contrast(emHex, field) < LIMIT) {
    issue(`${at}the accent word is ${contrast(emHex, field).toFixed(2)}:1 on this field (it vanishes): another field, `
      + 'or set --em for this field in brand/theme.css');
  }
  const logo = cv.el.querySelector('.copy .logo');
  if (logo && logo.innerHTML.includes('--accent')) {
    const acc = hexOf(getComputedStyle(logo).getPropertyValue('--accent'));
    if (acc && contrast(acc, field) < LIMIT) {
      issue(`${at}the logo's accent shapes are ${contrast(acc, field).toFixed(2)}:1 on this field (they vanish): set `
        + '--logo-accent: var(--paper) (or var(--ink)) on that .canvas.field-<name> in brand/theme.css');
    }
  }
}
