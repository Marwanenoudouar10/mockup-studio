// Ornament registry: 'brush' (two-stroke underline under the last line), 'highlight'
// (marker band behind the <em> word), 'none'. Add your own here.
import { brushUnderline } from './brush.js';
import { markerHighlight } from './highlight.js';

const ORNAMENTS = {
  brush: brushUnderline,
  highlight: markerHighlight,
  none: () => {},
};

export function applyOrnament(name, block, cv, opts) {
  const fn = ORNAMENTS[name];
  if (!fn) {
    console.warn(`unknown ornament "${name}" (known: ${Object.keys(ORNAMENTS).join(', ')})`);
    return;
  }
  fn(block, cv, opts);
}
