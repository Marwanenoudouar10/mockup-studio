// edits.json: content edits of an editable project, made in Mockup Studio (or by hand), next to the config like
// layout.json. Pure ESM: the Node scripts, the engine pages and the screen kit (screens/kit/edits.js) import it.
//
//   {
//     "version": 1,
//     "screens": { "<screen>": { "<element id>": { "text": { "en": "Good evening, Sam" }, "of": "9c1e2a07" } } },
//     "copy":    { "<panel>": { "headline": { "en": "..." }, "sub": { "es": "..." }, "stale": { "headline": ["es"] } },
//                  "feature": { "headline": {..} } },
//     "stage":   { "<panel>": { "<element id>": { "text": { "en": "Private by default" } } } }
//   }
// screens   overrides INSIDE a mock screen, applied by the kit before every capture and live screen:
//           text (per locale, plain text, <= 500 chars), color and bg (a kit token name such as tint, accent,
//           text-2, surface, brand-primary, or #hex / rgb(); bg also 'none'), size (font size, CSS px 6-200),
//           weight (100-900), hidden: true (visibility, nothing moves), dx / dy (CSS px nudge, -500..500),
//           only: 'ios' | 'android' (one platform), of: the element's fingerprint when the edit was made.
// element id  data-id="greeting" on the element, else its data-box name, else an automatic path
//           "@<anchor>/<tag.class:n>/..." from the nearest element with one of those (or body); kit-built chrome:
//           nav:title, nav:subtitle, tabs:1..n, status:time, fab:label. The fingerprint `of` (tag, classes, icon,
//           authored text) keeps an edit off the wrong element when a screen changes: an automatic id that no
//           longer matches moves to the one element with that fingerprint ("re-anchored"), else it is skipped
//           with a warning (render log, render-report.json, validate). Explicit ids always apply.
// copy      the panel's headline (sanitized: <em>, <br>, &nbsp; and &amp; only, <= 300 chars) and sub (plain
//           text), per locale; "feature" = the Play feature graphic. Applied right after the config loads, so
//           renders, Mockup Studio, validate and bake all see the edited words. stale: the languages not retyped
//           since another language's words changed in Mockup Studio (validate warns until each is retyped there,
//           kept with "Keep as is", or removed from the list by hand; bake leaves the marker in place).
// stage     the text of a stage element (a badge, a text numeral) by panel and element id (as in layout.json).
// Copy and stage edits are applied by scripts/lib/edit-copy.js. `npm run bake` folds them into studio.config.js;
// screen edits stay here (the kit applies them on every capture and live screen).
export const VERSION = 1;
export const SCREEN_KEY = /^[\w-]{1,64}$/;
export const EID = /^[@\w:./-]{1,160}$/;
export const TOKEN = /^[a-z][a-z0-9-]{0,40}$/;
export const COLOR = /^(#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*([,/]\s*[\d.]+%?\s*)?\))$/i;
export const LOCALE = /^[a-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// studio.config.js -> edits.json; examples/web.config.js -> examples/web.edits.json (as layoutFile)
export function editsFile(configRel = 'studio.config.js') {
  const rel = String(configRel || 'studio.config.js').replace(/^\.?\//, '');
  if (rel === 'studio.config.js') return 'edits.json';
  return `${rel.replace(/(\.config)?\.[cm]?js$/, '')}.edits.json`;
}

export function parseEdits(text) {
  if (!text || !String(text).trim()) return {};
  const v = JSON.parse(text);
  return isObj(v) ? v : {};
}

// FNV-1a 32 bit -> 8 hex digits
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// the headline as HTML: only <em>, </em>, <br> and a few entities survive; everything else is shown as text
export function sanitizeHeadline(html) {
  const s = String(html ?? '').slice(0, 300);
  return s.replace(/<(\/?em|br\s*\/?)>|&(nbsp|amp|lt|gt|quot);|[<>&"]/gi, (m, tag, ent) => {
    if (tag) return `<${tag.toLowerCase().replace(/\s*\/$/, '').replace(/^br.*/, 'br')}>`;
    if (ent) return `&${ent.toLowerCase()};`;
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m];
  });
}

export const plainText = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, max);

// one screen element's edit, cleaned: unknown keys dropped, values checked -> { clean, errors }
export function cleanScreenEdit(v) {
  const out = {};
  const errors = [];
  if (!isObj(v)) return { clean: out, errors: ['an edit must be an object'] };
  if (v.text !== undefined) {
    if (!isObj(v.text)) errors.push('text must be { <locale>: "..." }');
    else {
      const t = {};
      for (const [l, s] of Object.entries(v.text)) {
        if (!LOCALE.test(l)) errors.push(`text: "${l}" is not a locale`);
        else if (typeof s !== 'string' || s.length > 500) errors.push(`text.${l} must be a string of 500 characters at most`);
        else t[l] = plainText(s, 500);
      }
      if (Object.keys(t).length) out.text = t;
    }
  }
  for (const k of ['color', 'bg']) {
    if (v[k] === undefined) continue;
    const c = String(v[k]).trim();
    if (TOKEN.test(c) || COLOR.test(c) || (k === 'bg' && c === 'none')) out[k] = c;
    else errors.push(`${k} must be a kit token (tint, accent, text-2 ...), #hex or rgb()`);
  }
  const num = (k, lo, hi) => {
    if (v[k] === undefined) return;
    const n = Number(v[k]);
    if (!Number.isFinite(n) || n < lo || n > hi) errors.push(`${k} must be a number from ${lo} to ${hi}`);
    else out[k] = Math.round(n * 100) / 100;
  };
  num('size', 6, 200);
  num('weight', 100, 900);
  num('dx', -500, 500);
  num('dy', -500, 500);
  if (v.hidden !== undefined) out.hidden = !!v.hidden;
  if (v.only !== undefined) {
    if (/^[a-z]{2,12}$/.test(String(v.only))) out.only = String(v.only);
    else errors.push('only must be a platform (ios, android ...)');
  }
  if (v.of !== undefined) {
    if (/^[0-9a-f]{8}$/.test(String(v.of))) out.of = String(v.of);
    else errors.push('of must be 8 hex digits');
  }
  return { clean: out, errors };
}

// [[eid, edit]] for one screen on one platform (family = ios | android | web)
export function screenEdits(edits, name, platform, family = platform) {
  const all = isObj(edits) && isObj(edits.screens) && isObj(edits.screens[name]) ? edits.screens[name] : {};
  return Object.entries(all).filter(([eid, e]) => EID.test(eid) && isObj(e)
    && (!e.only || e.only === platform || e.only === family));
}
