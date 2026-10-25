// npm run vector end to end, on a temporary copy of the template, one Chrome at a time:   node tests/vector.js
// 1 the editable demo (live screens): appstore 1, og, producthunt 3 (the trio) and the feature graphic; the
//   screenshots example's appstore 1 (captures stay images); a panorama strip cut into its images
// 2 each SVG: parses as XML (Chrome's DOMParser), no <foreignObject>, enough <text> elements, every text's font
//   embedded or listed, unique and readable ids (never a bare tag: "span-2"), rotations kept at full precision;
//   rendered by Chrome it matches the PNG (the grain is left out of both): blurred mean <= 2.0, worst tile <= 45
// 3 each PDF: one page of the target's size (CSS px x 0.75 pt), real text (/ToUnicode; pdftotext when installed),
//   and drawn by poppler (pdftoppm, when installed) it looks like the PNG
// 4 --outline-text: no <text> left, and still the same picture
// 5 validate covers the vector files: ok as made, FAIL for a <foreignObject>, a warning when older than the PNG
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tempProject, checker } from './lib/project.js';
import { compare } from './lib/diff.js';

const t = checker('vector export (SVG + PDF)');
const tp = tempProject('vector');
const V = 'out/qa/vec/vector/en';
const LIMITS = { blurMean: 2.0, worstTile: 45 };
const BARE = /^(span|div|b|i|em|p|a|small|strong|svg|g|section|article|main|body|html|li|ul|h[1-6]|layer|element)(-\d+)?$/;

// [label, panel page query, W, H, svg (from the project root), min texts]
const LIVE = [
  ['appstore 1', 'store=appstore&panel=1', 1320, 2868, `${V}/appstore/01.svg`, 100],
  ['og', 'store=og&panel=6', 1200, 630, `${V}/og/01.svg`, 90],
  ['producthunt 3', 'store=producthunt&panel=8', 1270, 760, `${V}/producthunt/03.svg`, 90],
  ['feature graphic', null, 1024, 500, `${V}/playstore/feature-graphic.svg`, 40],
];

async function look(jobs) {
  const { openSession, capture } = await import(path.join(tp.root, 'scripts/lib/session.js'));
  const { flattenPng } = await import(path.join(tp.root, 'scripts/lib/png.js'));
  const s = await openSession();
  const out = [];
  try {
    for (const [label, q, W, H, svg, , cfg = 'studio.config.js', clip = 0] of jobs) {
      const page = q ? `engine/panel.html?config=${cfg}&locale=en&${q}` : `engine/feature.html?config=${cfg}&locale=en`;
      await capture(s, page, { width: W, height: H, dpr: 1 });
      await s.page.addStyleTag({ content: '.canvas.grain::after{display:none!important}' });
      await s.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const w = clip || W;
      const ref = flattenPng(Buffer.from(await s.page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: H } })));
      await s.page.setViewport({ width: w, height: H, deviceScaleFactor: 1 });
      await s.page.goto(`${s.origin}/${svg}`, { waitUntil: 'load' });
      await s.page.evaluate(async () => { await document.fonts.ready; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
      const pic = flattenPng(Buffer.from(await s.page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: H } })));
      const xml = await s.page.evaluate(async (u) => {
        const doc = new DOMParser().parseFromString(await (await fetch(u)).text(), 'image/svg+xml');
        return doc.querySelector('parsererror') ? doc.querySelector('parsererror').textContent.slice(0, 120) : null;
      }, `/${svg}`);
      fs.mkdirSync(tp.file('out/qa/vec/look'), { recursive: true });
      fs.writeFileSync(tp.file(`out/qa/vec/look/${label.replace(/\W+/g, '-')}.svg.png`), pic);
      out.push({ label, d: compare(ref, pic), xml });
      s.drain();
    }
  } finally { await s.close(); }
  return out;
}

function svgChecks(label, rel, minTexts, report) {
  const svg = tp.read(rel);
  const texts = svg.match(/<text\b[^>]*>/g) || [];
  t.ok(!/<foreignObject/i.test(svg), `${label}: no <foreignObject>`);
  t.ok(texts.length >= minTexts, `${label}: ${texts.length} <text> elements (>= ${minTexts})`);
  const r = report[rel] || {};
  const known = new Set((r.fonts || []).map((f) => f.family));
  const generic = /^(serif|sans-serif|monospace|system-ui|ui-[\w-]+|-apple-system|cursive|fantasy)$/;
  const unknown = [...new Set(texts.map((x) => (/font-family="([^"]*)"/.exec(x) || [])[1]).filter(Boolean)
    .map((f) => f.split(',')[0].trim().replace(/^'|'$/g, '')).filter((f) => !known.has(f) && !generic.test(f)))];
  t.ok(!unknown.length, `${label}: every text font embedded or listed (${[...known].join(', ')})`, unknown.join(', '));
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  t.ok(ids.length === new Set(ids).size, `${label}: ${ids.length} ids, all unique`);
  return svg;
}

try {
  if (!tp.exists('raw/ios/home.png')) tp.run('screens');
  console.log('1. export');
  tp.run('render', ['--out', 'out/qa/vec', '--locale', 'en', '--store', 'appstore,og,producthunt,playstore']);
  tp.run('feature', ['--out', 'out/qa/vec', '--locale', 'en']);
  const log = tp.run('vector', ['--out', 'out/qa/vec', '--locale', 'en', '--store', 'appstore,og,producthunt,playstore']).out;
  t.ok(/15 image\(s\) as SVG \+ PDF/.test(log), 'npm run vector: 15 images (appstore 5, og 1, producthunt 3, playstore 5 + feature)', (log.match(/\d+ image\(s\).*/) || [''])[0]);
  tp.run('vector', ['--config', 'examples/raster.config.js', '--out', 'out/qa/vec-raster', '--store', 'appstore', '--panel', '1', '--locale', 'en']);
  tp.run('render', ['--config', 'examples/panorama.config.js', '--out', 'out/qa/vec-pano', '--store', 'appstore']);
  tp.run('vector', ['--config', 'examples/panorama.config.js', '--out', 'out/qa/vec-pano', '--store', 'appstore']);
  const report = JSON.parse(tp.read('out/qa/vec/vector/vector-report.json'));
  const rreport = JSON.parse(tp.read('out/qa/vec-raster/vector/vector-report.json'));

  console.log('2. SVG files');
  const p1 = svgChecks('appstore 1', `${V}/appstore/01.svg`, 60, report);
  // what a clip hides is left out: the lifts of "insights" carry their cards, not the whole screen
  t.ok(!/>Mood this week</i.test(p1) && />Current streak</i.test(p1), 'a lift carries its card only (no hidden text of its screen: "Mood this week" is not in the file)');
  for (const [label, , , , rel, min] of LIVE.slice(1)) svgChecks(label, rel, min, report);
  const rs = svgChecks('raster appstore 1', 'out/qa/vec-raster/vector/en/appstore/01.svg', 4, rreport);
  t.ok((rs.match(/<image\b/g) || []).length >= 3 && /data:image\/png;base64/.test(rs), 'raster: the captures are embedded PNG images');
  const sizes = [...rs.matchAll(/href="data:image\/png;base64,([^"]+)"/g)].map((m) => m[1].length).sort((a, b) => b - a);
  t.ok(sizes.length >= 3 && sizes.slice(1).every((n) => n < sizes[0] * 0.4), `raster: a lift embeds its card only, not the whole capture again (${sizes.map((n) => Math.round(n / 1024)).join(', ')} KB of base64)`);
  const rot = [...p1.matchAll(/matrix\(([^)]+)\)/g)].map((m) => m[1].split(' ').slice(0, 4)).filter((f) => Math.abs(+f[1]) > 0.001);
  t.ok(rot.length >= 2 && rot.every((f) => f.some((v) => (v.split('.')[1] || '').length >= 4)), `rotations keep 4+ decimals (${rot.length} rotated groups, e.g. ${rot[0] && rot[0].join(' ')})`);
  t.ok(/id="phone-home"/.test(p1) && /id="screen-home"/.test(p1) && /id="headline"/.test(p1) && /id="card-streak"/.test(p1)
    && /id="badge-private-default"/.test(p1) && /id="text-recent"/.test(p1), 'readable layer names (phone-home, screen-home, headline, card-streak, badge-private-default, text-recent)');
  for (const [label, rel] of [['appstore 1', `${V}/appstore/01.svg`], ['og', `${V}/og/01.svg`], ['feature graphic', `${V}/playstore/feature-graphic.svg`]]) {
    const bare = [...tp.read(rel).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((id) => BARE.test(id));
    t.ok(!bare.length, `${label}: no layer named after a bare tag (span, span-2, b, div ...)`, bare.slice(0, 8).join(' '));
  }
  const pano = fs.readdirSync(tp.file('out/qa/vec-pano/vector/en/appstore')).filter((f) => f.endsWith('.svg'));
  t.ok(pano.length === 3, `panorama: one SVG per image (${pano.join(' ')})`);
  t.ok(/viewBox="1320 0 1320 2868"/.test(tp.read('out/qa/vec-pano/vector/en/appstore/02.svg')), 'panorama image 2 is the strip seen through x 1320-2640');
  const looks = await look([...LIVE, ['raster appstore 1', 'store=appstore&panel=1', 1320, 2868, 'out/qa/vec-raster/vector/en/appstore/01.svg', 0, 'examples/raster.config.js'],
    ['panorama 1', 'store=appstore&strip=1', 3960, 2868, 'out/qa/vec-pano/vector/en/appstore/01.svg', 0, 'examples/panorama.config.js', 1320]]);
  for (const { label, d, xml } of looks) {
    t.ok(!xml, `${label}: well-formed XML (DOMParser)`, xml || '');
    t.ok(d.blurMean <= LIMITS.blurMean && d.worstTile <= LIMITS.worstTile, `${label}: the SVG in Chrome looks like the PNG`, `blurMean ${d.blurMean}, worst tile ${d.worstTile}`);
  }

  console.log('3. PDF files');
  const { pdfInfo } = await import(path.join(tp.root, 'scripts/lib/vector-pdf.js'));
  for (const [label, rel, W, H] of [['appstore 1', `${V}/appstore/01.pdf`, 1320, 2868], ['og', `${V}/og/01.pdf`, 1200, 630], ['feature graphic', `${V}/playstore/feature-graphic.pdf`, 1024, 500], ['panorama 3', 'out/qa/vec-pano/vector/en/appstore/03.pdf', 1320, 2868]]) {
    const i = pdfInfo(fs.readFileSync(tp.file(rel)));
    t.ok(i && i.pages === 1 && Math.abs(i.width - W * 0.75) < 1 && Math.abs(i.height - H * 0.75) < 1 && i.unicode, `${label}: 1 page, ${W * 0.75} x ${H * 0.75} pt, text`, JSON.stringify(i));
  }
  // the PDFs drawn by poppler (when installed) look like the PNGs: catches a print that shrank or shifted
  const pngOf = (rel) => rel.replace('/vector/', '/').replace(/\.pdf$/, '.png');
  for (const [rel, W, H] of [[`${V}/appstore/01.pdf`, 1320, 2868], [`${V}/og/01.pdf`, 1200, 630], [`${V}/producthunt/03.pdf`, 1270, 760], ['out/qa/vec-pano/vector/en/appstore/02.pdf', 1320, 2868]]) {
    const r = spawnSync('pdftoppm', ['-scale-to-x', String(W), '-scale-to-y', String(H), '-png', '-singlefile', tp.file(rel), tp.file(rel.replace(/\.pdf$/, '.pdfview'))]);
    if (r.status !== 0) { t.note(`pdftoppm not installed: ${rel} not drawn`); continue; }
    const d = compare(tp.file(pngOf(rel)), tp.file(rel.replace(/\.pdf$/, '.pdfview.png')));
    t.ok(!d.error && d.blurMean <= 3.5 && d.worstTile <= 60, `${rel.split('/vector/')[1]}: the PDF looks like the PNG (poppler)`, d.error || `blurMean ${d.blurMean}, worst tile ${d.worstTile}`);
  }
  const pt = spawnSync('pdftotext', [tp.file(`${V}/appstore/01.pdf`), '-'], { encoding: 'utf8' });
  if (pt.status === 0) t.ok(/one page at a time/.test(pt.stdout.replace(/\s+/g, ' ')) && /Good morning, Sam/.test(pt.stdout), 'pdftotext reads the headline and the screen text');
  else t.note('pdftotext not installed: text extraction skipped');

  console.log('4. --outline-text');
  tp.run('vector', ['--out', 'out/qa/vec-outline', '--store', 'appstore', '--panel', '1', '--locale', 'en', '--svg-only', '--outline-text']);
  const o = tp.read('out/qa/vec-outline/vector/en/appstore/01.svg');
  t.ok(!/<text\b/.test(o) && /aria-label="Good morning, Sam"/.test(o), 'every text is a path (named by its words)');
  const [ol] = await look([['outline appstore 1', 'store=appstore&panel=1', 1320, 2868, 'out/qa/vec-outline/vector/en/appstore/01.svg']]);
  t.ok(ol.d.blurMean <= LIMITS.blurMean && ol.d.worstTile <= LIMITS.worstTile, 'outlined, it still looks like the PNG', `blurMean ${ol.d.blurMean}, worst tile ${ol.d.worstTile}`);

  console.log('5. validate');
  let v = tp.run('validate', ['--out', 'out/qa/vec'], { allowFail: true }).out;
  t.ok(/ok\s+out\/qa\/vec\/vector\/en\/appstore\/01\.svg\s+SVG \d+ texts/.test(v) && /ok\s+out\/qa\/vec\/vector\/en\/og\/01\.pdf\s+PDF 1 page, 900x473 pt/.test(v), 'vector files are checked (ok)');
  t.ok(/note\s+out\/qa\/vec\/vector\/\s+SVG: grain texture left out/.test(v), 'what the SVG leaves out is a note');
  const og = tp.read(`${V}/og/01.svg`);
  tp.write(`${V}/og/01.svg`, og.replace('</svg>', '<foreignObject width="10" height="10"></foreignObject></svg>'));
  v = tp.run('validate', ['--out', 'out/qa/vec'], { allowFail: true }).out;
  t.ok(/FAIL\s+out\/qa\/vec\/vector\/en\/og\/01\.svg\s+has a <foreignObject>/.test(v), 'a <foreignObject> fails validate');
  tp.write(`${V}/og/01.svg`, og.replace('</svg>', '<g>'));
  v = tp.run('validate', ['--out', 'out/qa/vec'], { allowFail: true }).out;
  t.ok(/FAIL\s+out\/qa\/vec\/vector\/en\/og\/01\.svg\s+.*(never closed|does not close)/.test(v), 'broken XML fails validate');
  tp.write(`${V}/og/01.svg`, og);
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(tp.file(`${V}/og/01.svg`), old, old);
  v = tp.run('validate', ['--out', 'out/qa/vec'], { allowFail: true }).out;
  t.ok(/warn\s+out\/qa\/vec\/vector\/en\/og\/01\.svg\s+.*older than the PNG/.test(v), 'a vector file older than its PNG is a warning');
  t.ok((v.match(/ out\/qa\/vec\/vector\/en\/og\/01\.svg /g) || []).length === 1, 'one row per file (never FAIL and ok for the same file)');
  fs.copyFileSync(tp.file(`${V}/appstore/05.svg`), tp.file(`${V}/appstore/06.svg`));
  v = tp.run('validate', ['--out', 'out/qa/vec'], { allowFail: true }).out;
  t.ok(/warn\s+out\/qa\/vec\/vector\/en\/appstore\/06\.svg\s+(no |.*stale|image 06)/.test(v), 'a vector file of an image the set no longer has is a warning, not ok', (v.match(/.*appstore\/06\.svg.*/) || [''])[0].trim());
  t.done();
} finally {
  tp.rm();
}
