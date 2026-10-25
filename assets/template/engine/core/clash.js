// The accent word and the logo's accent shapes against the field they sit on. On a field painted in the accent
// itself (a one-accent brand's vivid feature graphic, a solid field in the primary when accent = primary) both
// vanish while every other check passes. Measured on computed colours: the canvas background-color (a preset's
// base colour; the gradient preset has none, so --primary), the <em> colour, and the logo's --accent
// (--logo-accent, engine/styles/field.css). Under 1.6:1 is an issue.
import { contrast } from '../../scripts/brand/lib/color.js';
import { issue } from './issues.js';
import { hexOf } from '../vector/color.js'; // any CSS colour -> '#rrggbb', or null when (nearly) transparent

const LIMIT = 1.6;

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
