// npm run brand -- logos [--dir brand/logo-options] [--icon-style gradient|solid|night|paper|ink] [--icon-scale 0.56]
// Compares every logo direction in the folder: <id>.svg (the lockup: symbol + wordmark), <id>.mark.svg
// (the symbol alone) and, if you drew one, <id>.icon.svg. Without an icon file the app icon is derived
// from the symbol with the current token colours (out/brand/logos/<id>.icon.svg), exactly as
// `apply --logo <id>` will write it. Build the SVGs with brand/README.md (logo recipes).
// -> out/brand/logos/logos.json + out/brand/logos/logo-board.png
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/cli.js';
import { readBrief, sampleCopy } from './lib/brief.js';
import { makeIcon, svgProblems, titleOf } from './lib/icon.js';
import { writeJson, OUT } from './lib/tokens-io.js';
import { shootBoard } from './lib/shoot.js';
import { openSession } from '../lib/session.js';

const val = (v) => (v === undefined || v === true ? null : String(v));

export async function run(flags, { cfg, tokens, rel }) {
  const dirRel = (val(flags.dir) || 'brand/logo-options').replace(/\/+$/, '');
  const dir = path.join(ROOT, dirRel);
  if (!fs.existsSync(dir)) throw new Error(`${dirRel}/ not found: draw 2-3 directions there first (brand/README.md)`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'));
  const ids = [...new Set(files.filter((f) => !/\.(mark|icon)\.svg$/.test(f)).map((f) => f.replace(/\.svg$/, '')))].sort();
  if (!ids.length) throw new Error(`no <id>.svg lockups in ${dirRel}/`);
  const style = val(flags['icon-style']) || (tokens && tokens.icon && tokens.icon.style) || 'gradient';
  const scale = Number(val(flags['icon-scale']) || (tokens && tokens.icon && tokens.icon.scale) || 0.56);
  const out = `${OUT}/logos`;
  fs.mkdirSync(path.join(ROOT, out), { recursive: true });
  const options = [];
  console.log(`logos  ${dirRel}/ · ${ids.length} direction(s) · icon ${style} ${scale}`);
  for (const id of ids) {
    const text = (f) => (files.includes(f) ? fs.readFileSync(path.join(dir, f), 'utf8') : null);
    const lockup = text(`${id}.svg`);
    const mark = text(`${id}.mark.svg`);
    const ownIcon = text(`${id}.icon.svg`);
    let icon = ownIcon ? `${dirRel}/${id}.icon.svg` : null;
    if (!icon && mark) {
      icon = `${out}/${id}.icon.svg`;
      fs.writeFileSync(path.join(ROOT, icon), makeIcon(mark, cfg.brand.colors, { style, scale }));
    }
    const problems = [...svgProblems(lockup).map((p) => `${id}.svg: ${p}`), ...(mark ? svgProblems(mark).map((p) => `${id}.mark.svg: ${p}`) : [])];
    if (!mark) problems.push(`${id}.mark.svg missing: no watermark symbol and no derived icon`);
    const { title, desc } = titleOf(lockup);
    options.push({ id, title: title || id, desc, lockup: `${dirRel}/${id}.svg`, mark: mark ? `${dirRel}/${id}.mark.svg` : null, icon, problems });
    console.log(`  ${id}  ${(title || id).padEnd(22)} ${mark ? 'symbol' : 'no symbol'} · icon ${ownIcon ? 'hand-made' : icon ? 'derived' : '-'}`);
    for (const p of problems) console.log(`      warn: ${p}`);
  }
  writeJson(`${out}/logos.json`, { sample: sampleCopy(readBrief(), cfg, tokens), iconStyle: style, options });
  const session = await openSession();
  try {
    await shootBoard(session, rel, 'logos', { data: `${out}/logos.json` }, `${out}/logo-board.png`);
  } finally {
    await session.close();
  }
  console.log(`\n  next: look at ${out}/logo-board.png, then  npm run brand -- apply --logo <id>\n`);
}
