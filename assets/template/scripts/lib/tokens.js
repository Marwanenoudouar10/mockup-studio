// Brand tokens: brand/tokens.json, written by `npm run brand -- apply`, is the ONE source of the brand's
// colours and fonts. Two consumers read it:
//   the panel engine   studio.config.js brand.tokens -> withTokens(raw, tokens) fills brand.colors,
//                      brand.fonts, field, headlineWeight and icon.background (explicit config values win)
//   the screen kit     <meta name="kit-tokens" content="/brand/tokens.json"> -> kitVars(tokens) as CSS
//                      variables (--tint, --tint-2, --accent, --app-bg, --font-display, --font-app ...)
// Pure ESM: imported by the Node scripts, the engine pages and the kit pages alike.
import { fontSpec } from './config.js';

const ENGINE_COLORS = ['primary', 'secondary', 'deep', 'accent', 'ink', 'paper', 'onField'];

export function withTokens(raw = {}, tokens = null) {
  if (!tokens) return raw;
  const b = raw.brand || {};
  const f = b.fonts || {};
  const tf = tokens.fonts || {};
  const tc = tokens.colors || {};
  const colors = Object.fromEntries(ENGINE_COLORS.filter((k) => tc[k]).map((k) => [k, tc[k]]));
  return {
    ...raw,
    brand: {
      ...b,
      name: b.name || tokens.name,
      colors: { ...colors, ...(b.colors || {}) },
      fonts: { ...f, display: f.display || tf.display, text: f.text || tf.text },
      field: b.field || tokens.field,
      headlineWeight: b.headlineWeight || tokens.headlineWeight,
    },
    icon: { ...(tc.primary ? { background: tc.primary } : {}), ...(raw.icon || {}) },
  };
}

// Config values that override a token (so `apply` can say why a choice does not show up).
export function overrides(raw = {}, tokens = {}) {
  const b = raw.brand || {};
  const out = [];
  for (const k of Object.keys(b.colors || {})) if (tokens.colors && tokens.colors[k]) out.push(`brand.colors.${k}`);
  for (const k of ['display', 'text']) if (b.fonts && b.fonts[k]) out.push(`brand.fonts.${k}`);
  if (b.field && tokens.field) out.push('brand.field');
  return out;
}

const DISPLAY_W = [600, 700, 800];
const TEXT_W = [400, 500, 600];
const stack = (spec, fallback) => (spec ? `"${spec.family}", ${fallback}` : null);

export function fontsOf(tokens = {}) {
  const f = tokens.fonts || {};
  const display = fontSpec(f.display, DISPLAY_W);
  return { display, text: fontSpec(f.text, TEXT_W) || display, app: fontSpec(f.app, DISPLAY_W) || display };
}

// Every fontsource stylesheet the tokens need, as paths from the project root.
export function fontFiles(tokens) {
  const { display, text, app } = fontsOf(tokens);
  return [...new Set([display, text, app].filter(Boolean).flatMap((s) => s.css))];
}

// tokens -> { '--tint': '#..', ... } for the mock-screen kit (screens/kit/brand.js).
export function kitVars(tokens = {}) {
  const c = tokens.colors || {};
  const ui = tokens.ui || {};
  const { display, text, app } = fontsOf(tokens);
  const v = {
    '--tint': ui.tint || c.primary,
    '--tint-2': ui.tint2,
    '--on-tint': ui.onTint,
    '--accent': c.accent,
    '--app-bg': ui.bg,
    // dark app surfaces from the palette (older token files have none: the kit keeps Apple / M3 dark greys)
    '--app-bg-dark': ui.bgDark,
    '--app-surface-dark': ui.surfaceDark,
    '--app-raised-dark': ui.raisedDark,
    '--app-bg-android-dark': ui.bgDark,
    '--app-surface-android-dark': ui.surfaceDark,
    '--font-display': stack(display, 'system-ui, sans-serif'),
    '--font-text': stack(text, 'system-ui, sans-serif'),
    '--font-app': stack(app, 'system-ui, sans-serif'),
  };
  for (const k of ENGINE_COLORS) v[`--brand-${k}`] = c[k];
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x));
}
