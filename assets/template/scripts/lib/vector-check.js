// The editable files in <out>/vector/ (npm run vector), checked by validate.js:
//   SVG  well-formed XML (a small tag-balance parser), an <svg> root with the SVG namespace, no <foreignObject>
//        (Figma drops it), the target's size, and the vector report's warnings (things that went wrong)
//   PDF  a PDF with one page of the target's size (CSS px x 0.75 pt)
//   both older than the PNG of the same image: stale (run npm run vector again); no PNG of the same image at all:
//        left over from a bigger set (npm run export removes such files, scripts/lib/stale.js)
// One row per file: FAIL (a broken file), warn (stale or left over) or ok.
// What the SVG approximates or leaves out on purpose (grain, backdrop blur, blend modes) is one note per kind.
import fs from 'node:fs';
import path from 'node:path';
import { STORES, ASSETS } from './stores.js';
import { pdfInfo } from './vector-pdf.js';

// -> [problems] for one SVG text
export function svgProblems(text) {
  const out = [];
  const s = String(text);
  if (/<foreignObject[\s>]/i.test(s)) out.push('has a <foreignObject> (Figma drops it)');
  const root = /^\s*(<\?xml[^>]*\?>\s*)?<svg\b([^>]*)>/.exec(s);
  if (!root) out.push('does not start with <svg>');
  else if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(root[2])) out.push('the <svg> has no SVG namespace');
  const stack = [];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|<|&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m[0] === '<') { out.push(`a stray "<" at ${m.index}`); break; }
    if (m[0] === '&') { out.push(`an unescaped "&" at ${m.index}`); break; }
    if (!m[2]) continue;
    if (m[4]) continue; // <tag/>
    if (!m[1]) { stack.push(m[2]); continue; }
    if (stack.pop() !== m[2]) { out.push(`</${m[2]}> does not close the open element at ${m.index}`); break; }
  }
  if (!out.length && stack.length) out.push(`${stack.length} element(s) never closed (${stack.slice(-1)[0]})`);
  return out;
}

const sizeOf = (cfg, id, file) => {
  if (/^feature-graphic\./.test(path.basename(file))) return ASSETS['feature-graphic'].size;
  const st = cfg.stores.find((s) => s.id === id) || STORES[id];
  return st ? st.size : null;
};

// rows into validate's table: ok(label, text), fail(label, text), warn(label, text), note(label, text)
export function checkVectors(cfg, out, { rel, ok, fail, warn, note, stale }) {
  const root = path.join(out, 'vector');
  if (!fs.existsSync(root)) return 0;
  let report = {};
  try { report = JSON.parse(fs.readFileSync(path.join(root, 'vector-report.json'), 'utf8')); } catch { /* none */ }
  const omitted = new Set();
  let n = 0;
  for (const locale of fs.readdirSync(root).sort()) {
    const ldir = path.join(root, locale);
    if (!fs.statSync(ldir).isDirectory() || stale.has(ldir)) continue;
    for (const id of fs.readdirSync(ldir).sort()) {
      const dir = path.join(ldir, id);
      if (!fs.statSync(dir).isDirectory() || stale.has(dir)) continue;
      for (const f of fs.readdirSync(dir).filter((x) => /\.(svg|pdf)$/i.test(x)).sort()) {
        const file = path.join(dir, f);
        if (stale.has(file)) continue; // listed as stale by validate already
        const size = sizeOf(cfg, id, file);
        const buf = fs.readFileSync(file);
        n++;
        const bad = [];
        let desc = '';
        if (/\.svg$/i.test(f)) {
          const text = buf.toString('utf8');
          bad.push(...svgProblems(text));
          const w = /<svg\b[^>]*\bwidth="([\d.]+)"/.exec(text);
          const h = /<svg\b[^>]*\bheight="([\d.]+)"/.exec(text);
          if (size && w && h && (Math.round(+w[1]) !== size[0] || Math.round(+h[1]) !== size[1])) bad.push(`${w[1]}x${h[1]}, not ${size[0]}x${size[1]}`);
          const r = report[rel(file)] || {};
          desc = `SVG ${(text.match(/<text\b/g) || []).length} texts, ${Math.round(buf.length / 1024)} KB`;
          for (const x of r.warnings || []) warn(rel(file), `vector: ${x}`);
          for (const x of r.omitted || []) omitted.add(x);
          for (const fnt of (r.fonts || []).filter((x) => !x.embedded)) note(rel(file), `font ${fnt.family} is not embedded (a system font): the file shows it only where it is installed`);
        } else {
          const info = pdfInfo(buf);
          if (!info) bad.push('not a PDF file');
          else {
            if (info.pages !== 1) bad.push(`${info.pages} pages, not 1`);
            if (size && info.width && (Math.abs(info.width - size[0] * 0.75) > 1 || Math.abs(info.height - size[1] * 0.75) > 1)) {
              bad.push(`${Math.round(info.width)}x${Math.round(info.height)} pt, not ${size[0] * 0.75}x${size[1] * 0.75}`);
            }
            desc = `PDF ${info.pages} page, ${Math.round(info.width)}x${Math.round(info.height)} pt${info.unicode ? ', text' : ''}`;
          }
        }
        const png = path.join(out, locale, id, f.replace(/\.(svg|pdf)$/i, '.png'));
        const jpg = png.replace(/\.png$/, '.jpg');
        const img = fs.existsSync(png) ? png : fs.existsSync(jpg) ? jpg : null;
        if (bad.length) fail(rel(file), bad.join('; '));
        else if (!img) warn(rel(file), `no ${rel(png)}: left over from an image the set no longer has (npm run export removes it): never deliver it`);
        else if (fs.statSync(img).mtimeMs > fs.statSync(file).mtimeMs + 1000) {
          warn(rel(file), `${desc}, older than the PNG of the same image: run npm run vector (or export --vector) again`);
        } else ok(rel(file), desc);
      }
    }
  }
  for (const x of omitted) note(`${rel(root)}/`, `SVG: ${x}`);
  return n;
}
