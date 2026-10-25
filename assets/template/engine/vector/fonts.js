// The fonts an SVG uses, embedded as @font-face rules with woff2 data: URIs, under the names design tools use
// ("Inter Variable" -> "Inter"), so the file renders the same anywhere a browser opens it. Only the faces that
// are needed: the family, a weight and style the text uses, a unicode-range that covers its characters (the
// fontsource files are split per script). Figma ignores embedded faces and uses its own copy of the family
// (Inter, Poppins, Roboto, Newsreader, Space Grotesk, Noto Sans Arabic are all Google Fonts it ships).
//   usedFonts(tree)               -> Map stack -> { families, weights:Set, styles:Set, chars:Set } (the <text> runs)
//   fontFaces(used, docs, embed)  -> { css, report: [{ family, embedded, faces }] }
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[\w-]+|-apple-system|emoji|math)$/;

export function usedFonts(tree, extra = []) {
  const used = new Map(); // font stack -> { families, weights, styles, chars }
  const add = (families, weight, style, text) => {
    const key = families.join(',');
    const u = used.get(key) || { families, weights: new Set(), styles: new Set(), chars: new Set() };
    u.weights.add(Number(weight) || 400);
    u.styles.add(style === 'italic' || style === 'oblique' ? 'italic' : 'normal');
    for (const ch of String(text)) if (/\S/.test(ch)) u.chars.add(ch);
    used.set(key, u);
  };
  const walk = (n) => {
    if (n.meta && n.meta.run) {
      const r = n.meta.run;
      add(r.families, r.weight, r.style, r.chars.map(([c]) => c).join(''));
    }
    for (const k of n.kids || []) if (k.tag) walk(k);
  };
  walk(tree);
  for (const x of extra) add(x.families, x.weight, x.style, x.text);
  return used;
}

function rulesOf(docs) {
  const rules = [];
  const read = (sheet) => {
    let list;
    try { list = sheet.cssRules; } catch { return; }
    for (const r of list) {
      if (r.type === CSSRule.IMPORT_RULE && r.styleSheet) read(r.styleSheet);
      else if (r.type === CSSRule.FONT_FACE_RULE) rules.push({ r, base: r.parentStyleSheet.href || sheet.href });
    }
  };
  for (const d of docs) for (const s of d.styleSheets) read(s);
  return rules;
}

const covers = (range, chars) => !range || [...chars].some((ch) => range.split(',').some((part) => {
  const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(part.trim());
  if (!m) return false;
  const lo = parseInt(m[1].replace(/\?/g, '0'), 16);
  const hi = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'F'), 16);
  const cp = ch.codePointAt(0);
  return cp >= lo && cp <= hi;
}));

function weightOk(desc, weights) {
  const [lo, hi = lo] = String(desc || '400').replace('normal', '400').replace('bold', '700').split(/\s+/).map(Number);
  return [...weights].some((w) => w >= lo && w <= hi);
}

const toData = (blob) => new Promise((res) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = () => res(null);
  fr.readAsDataURL(blob);
});
const cache = new Map();

// each font stack's families in order: a family with @font-face rules embeds the faces its characters need, and
// the characters its faces do not cover go on to the next family (Arabic in the extra font); a stack whose first
// family has no rules at all (a system font) is reported as not embedded
export async function fontFaces(used, docs, embed = true) {
  const all = rulesOf(docs);
  let css = '';
  const fams = new Map(); // family -> { embedded, faces }
  const seen = new Set();
  for (const u of used.values()) {
    let left = new Set(u.chars);
    for (const [i, family] of u.families.entries()) {
      if (!left.size) break;
      if (GENERIC.test(family)) break;
      const faces = all.filter(({ r }) => r.style.getPropertyValue('font-family').replace(/^["']|["']$/g, '').replace(/ Variable$/, '') === family);
      if (!faces.length) {
        if (i === 0) fams.set(family, fams.get(family) || { embedded: false, faces: 0 });
        continue;
      }
      const rec = fams.get(family) || { embedded: false, faces: 0 };
      fams.set(family, rec);
      const covered = new Set();
      for (const { r, base } of faces) {
        const style = (r.style.getPropertyValue('font-style') || 'normal').replace('oblique', 'italic');
        const range = r.style.getPropertyValue('unicode-range');
        if (!u.styles.has(style.split(' ')[0]) || !weightOk(r.style.getPropertyValue('font-weight'), u.weights) || !covers(range, left)) continue;
        for (const ch of left) if (covers(range, [ch])) covered.add(ch);
        const src = /url\("?([^")]+)"?\)/.exec(r.style.getPropertyValue('src'));
        if (!src) continue;
        const url = new URL(src[1], base).href;
        if (seen.has(`${family}|${url}`)) continue;
        seen.add(`${family}|${url}`);
        rec.faces++;
        if (!embed) continue;
        if (!cache.has(url)) cache.set(url, fetch(url).then((x) => (x.ok ? x.blob() : null)).then((b) => b && toData(b)).catch(() => null));
        const data = await cache.get(url);
        if (!data) continue;
        rec.embedded = true;
        css += `@font-face{font-family:"${family}";font-style:${style};font-weight:${r.style.getPropertyValue('font-weight') || '400'};`
          + `${range ? `unicode-range:${range};` : ''}src:url(${data.replace(/^data:[^;,]*/, 'data:font/woff2')}) format("woff2")}`;
      }
      left = new Set([...left].filter((ch) => !covered.has(ch)));
    }
  }
  return { css, report: [...fams].map(([family, r]) => ({ family, ...r })) };
}
