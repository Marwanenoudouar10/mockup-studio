// The value rules of edits.json, for the Studio's writes. A copy of the template's scripts/lib/edits.js rules
// (Mockup Studio also serves projects made from older templates that lack that file): keep the two in step.
//   screen edit  text (per locale, <= 500 chars), color / bg (kit token, #hex, rgb(); bg also 'none'),
//                size 6-200, weight 100-900, hidden, dx / dy -500..500 (CSS px), only (a platform), of (8 hex)
//   headline     <em>, <br> and a few entities survive, <= 300 chars; sub: plain text
export const SCREEN_KEY = /^[\w-]{1,64}$/;
export const EID = /^[@\w:./-]{1,160}$/;
export const TOKEN = /^[a-z][a-z0-9-]{0,40}$/;
export const COLOR = /^(#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*([,/]\s*[\d.]+%?\s*)?\))$/i;
export const LOCALE = /^[a-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function sanitizeHeadline(html) {
  const s = String(html ?? '').slice(0, 300);
  return s.replace(/<(\/?em|br\s*\/?)>|&(nbsp|amp|lt|gt|quot);|[<>&"]/gi, (m, tag, ent) => {
    if (tag) return `<${tag.toLowerCase().replace(/\s*\/$/, '').replace(/^br.*/, 'br')}>`;
    if (ent) return `&${ent.toLowerCase()};`;
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m];
  });
}

export const plainText = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, max);

// one screen element's edit -> { clean, errors } (unknown keys dropped)
export function cleanScreenEdit(v) {
  const out = {};
  const errors = [];
  if (!isObj(v)) return { clean: out, errors: ['an edit must be an object'] };
  if (v.text !== undefined) {
    if (!isObj(v.text)) errors.push('text must be { <locale>: "..." }');
    else {
      for (const [l, s] of Object.entries(v.text)) {
        if (!LOCALE.test(l)) errors.push(`text: "${l}" is not a locale`);
        else if (typeof s !== 'string' || s.length > 500) errors.push(`text.${l} must be a string of 500 characters at most`);
        else (out.text ||= {})[l] = plainText(s, 500);
      }
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
