// Brand colours -> CSS variables, fontsource stylesheets -> loaded faces (before anything is measured).
// --accent-on-paper: the accent deepened to 3:1 on paper when the accent itself is too pale to read there
// (scripts/brand/lib/color.js accentOnPaper); the light field presets draw the logo's accent shapes in it
// (engine/styles/field.css), as the brand board's paper lockup does.
import { at } from './root.js';
import { accentOnPaper } from '../../scripts/brand/lib/color.js';

export function applyColors(colors, root = document.documentElement) {
  for (const [k, v] of Object.entries(colors || {})) root.style.setProperty(`--${k}`, v);
  let lit = null;
  try { lit = colors && colors.accent && colors.paper ? accentOnPaper(colors) : null; } catch { /* not a hex colour */ }
  if (lit) root.style.setProperty('--accent-on-paper', lit); else root.style.removeProperty('--accent-on-paper');
}

function addSheet(href) {
  const url = at(href);
  if (document.querySelector(`link[data-font="${url}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.dataset.font = url;
    link.onload = () => resolve();
    link.onerror = () => {
      console.warn(`font stylesheet not found: ${url} (npm install the matching @fontsource package)`);
      resolve();
    };
    document.head.appendChild(link);
  });
}

const stack = (f, extra) => [f && `"${f.family}"`, ...extra.map((x) => `"${x.family}"`), 'system-ui', 'sans-serif']
  .filter(Boolean).join(', ');

// sample: the actual text on the page, so unicode-range subsets (latin-ext, cyrillic...) load too.
export async function loadFonts(brand, sample = '') {
  const { display, text, extra = [] } = brand.fonts;
  const specs = [display, text, ...extra].filter(Boolean);
  await Promise.all([...new Set(specs.flatMap((f) => f.css))].map(addSheet));
  const root = document.documentElement.style;
  root.setProperty('--font-display', stack(display, extra));
  root.setProperty('--font-text', stack(text, extra));
  root.setProperty('--headline-weight', String(brand.headlineWeight || 800));
  const probe = `${sample} AaBb0123`;
  const loads = [];
  for (const f of specs) {
    for (const w of f.weights || [400]) loads.push(document.fonts.load(`${w} 64px "${f.family}"`, probe));
  }
  await Promise.all(loads.map((p) => p.catch(() => null)));
  await document.fonts.ready;
}
