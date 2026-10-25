// Brand tokens -> the kit. brand/tokens.json (written by `npm run brand -- apply`) is the one source
// of the brand's colours and fonts; a screen opts in with
//   <meta name="kit-tokens" content="/brand/tokens.json">
// and ?tokens=/out/brand/palette/option-2.tokens.json previews another token file (the brand boards);
// ?tokens=none keeps the kit's defaults (a brand board before any `apply`).
// Cascade: kit defaults (tokens.css) < brand tokens (inserted right after kit.css) < screens/app.css,
// so app.css only holds what is specific to this app (and deliberate overrides).
// Also fills [data-brand="name"] (or any other top-level token key) with the token's text.
import { kitVars, fontFiles } from '../../scripts/lib/tokens.js';

function addSheet(href) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/${href.replace(/^\/+/, '')}`;
    link.onload = () => resolve();
    link.onerror = () => {
      console.warn(`kit: font stylesheet not found: ${href} (npm install the matching @fontsource package)`);
      resolve();
    };
    document.head.appendChild(link);
  });
}

export async function applyBrand(q) {
  const meta = document.querySelector('meta[name="kit-tokens"]');
  const src = q.get('tokens') || (meta && meta.content);
  if (!src || src === 'none') return null;
  let tokens;
  try {
    const r = await fetch(new URL(src, location.href));
    if (!r.ok) throw new Error(`${r.status}`);
    tokens = await r.json();
  } catch (err) {
    console.warn(`kit: could not read brand tokens ${src} (${err.message})`);
    return null;
  }
  const css = Object.entries(kitVars(tokens)).map(([k, v]) => `${k}: ${v};`).join(' ');
  const style = document.createElement('style');
  style.id = 'kit-brand';
  style.textContent = `:root { ${css} }`;
  const kitCss = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => /kit\.css(\?|$)/.test(l.getAttribute('href')));
  if (kitCss) kitCss.after(style);
  else document.head.appendChild(style);
  await Promise.all(fontFiles(tokens).map(addSheet));
  for (const n of document.querySelectorAll('[data-brand]')) {
    const v = tokens[n.dataset.brand];
    if (typeof v === 'string') n.textContent = v;
  }
  return tokens;
}
