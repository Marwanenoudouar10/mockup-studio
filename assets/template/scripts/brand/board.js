// npm run brand -- board [--screen today --box tasks | --crop x,y,w,h] [--phone home] [--platform ios]
//                        [--label "Brand board"] [--specimen field|paper] [--theme dark] [--sample screens/_sample.html]
//                        [--lift progress#load] [--swatches "primary:Signal,ink:Ink,paper:Paper"] [--reversed solid]
// The brand board for approval, BEFORE any mock screen or store image: the logo on paper and on the field,
// the app icon, the palette with its contrast, the type pair, a UI card and a store-image thumbnail,
// all from brand/tokens.json + brand/logo.svg, mark.svg, icon.svg (the files the engine will use).
//   default    the kit's sample screen dressed in the tokens (out/brand/board/sample.png); the thumbnail's
//              phone shows it without the card it lifts out (sample-phone.png), so no card shows twice
//   --screen   Mode A: a client capture instead (raw/<platform>/<name>.png); its UI card is --box (from
//              <name>.boxes.json, default: the first box) or --crop x,y,w,h in capture pixels (no boxes yet)
//   --phone    the capture in the thumbnail's phone (default: another capture of that platform; with none,
//              the phone shows --screen and nothing is lifted)
//   --label    the eyebrow (default "Brand board · for approval"; "Brand board" once approved, for a portfolio)
//   --specimen field: the type tile on the brand field with the accent word in the accent (default for a dark
//              field, where the store images set it that way); paper: on paper with the word in the primary
//   --theme    the sample screen's theme (default: the config's screens.theme); --sample: another sample page
//              (copy screens/kit/sample.html to screens/_sample.html and give it the app's own content; keep
//              its data-box="card" and the ?hide script), so a finance brand is not judged on habit-app copy;
//              screens/_sample.html is used by default when it exists
//   --lift     a card lifted over the thumbnail's phone, <capture>#<box> (default: none, so the Interface tile's
//              card never shows twice on one board; pick a DIFFERENT card than --box)
//   --swatches the colour row: keys with optional names, e.g. "primary:Signal,ink:Ink,paper:Paper" (default: the
//              six colours, with accent dropped when it equals primary: a one-accent brand)
//   --reversed the "on colour" tile: a field preset (gradient, solid, dark, light, paper, mesh) or primary / ink
//              (default: the brand field; on a light field, the primary, so the tile never repeats the hero)
//   Mode B once real mock screens exist: --screen home --box <card> shows the real app on the board, so the
//              board and the delivered set never show two different apps.
// Before `apply --logo` the boards set the name as text (scripts/brand/lib/brief.js logoReady).
// -> final/brand/brand-board.png, plus the brand kit PNGs on transparent: logo.png (ink),
//    logo-white.png and mark.png (for the client's other uses: web, socials, documents)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/cli.js';
import { readBrief, sampleCopy, logoReady } from './lib/brief.js';
import { writeJson, OUT } from './lib/tokens-io.js';
import { shootBoard, shootSample, shootAsset, samplePage } from './lib/shoot.js';
import { openSession } from '../lib/session.js';

const val = (v) => (v === undefined || v === true ? null : String(v));

const EXT = ['png', 'jpg', 'jpeg', 'webp'];
const findCapture = (platform, name) => EXT.map((e) => `raw/${platform}/${name}.${e}`).find((f) => fs.existsSync(path.join(ROOT, f)));

function otherCapture(platform, name) {
  const dir = path.join(ROOT, 'raw', platform);
  if (!fs.existsSync(dir)) return null;
  const names = fs.readdirSync(dir).filter((f) => EXT.some((e) => f.endsWith(`.${e}`))).map((f) => f.replace(/\.\w+$/, '')).sort();
  return names.find((n) => n !== name) || null;
}

function parseCrop(v) {
  const c = String(v).split(/[\s,]+/).map(Number);
  if (c.length !== 4 || !c.every(Number.isFinite) || c[2] <= 0 || c[3] <= 0) throw new Error(`--crop ${v}: use x,y,w,h in capture pixels`);
  return c;
}

const REVERSED = ['gradient', 'solid', 'dark', 'light', 'paper', 'mesh', 'primary', 'ink'];
const KEYS = ['primary', 'secondary', 'deep', 'accent', 'ink', 'paper'];

// "primary:Signal,ink:Ink,paper" -> [{ key, name }]
function parseSwatches(v) {
  if (!v) return null;
  return v.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const [key, ...name] = s.split(':');
    if (!KEYS.includes(key.trim())) throw new Error(`--swatches ${key}: use ${KEYS.join(', ')}`);
    return { key: key.trim(), name: name.join(':').trim() || key.trim() };
  });
}

// "progress#load" -> { screen: 'raw/ios/progress.png', box: 'load' }
function parseLift(v, platform) {
  if (!v) return null;
  const [name, box] = v.split('#');
  const screen = findCapture(platform, name) || (fs.existsSync(path.join(ROOT, name)) ? name : null);
  if (!screen || !box) throw new Error(`--lift ${v}: use <capture>#<box>, a capture in raw/${platform}/ and a box from its .boxes.json`);
  return { screen, box };
}

function realScreen(flags) {
  const platform = val(flags.platform) || 'ios';
  const name = val(flags.screen);
  const hit = findCapture(platform, name);
  if (!hit) throw new Error(`--screen ${name}: no raw/${platform}/${name}.png (put the client's captures in raw/${platform}/ first, see references/capture.md)`);
  const boxesFile = path.join(ROOT, hit.replace(/\.\w+$/, '.boxes.json'));
  const boxes = fs.existsSync(boxesFile) ? JSON.parse(fs.readFileSync(boxesFile, 'utf8')) : {};
  const crop = val(flags.crop) ? parseCrop(flags.crop) : null;
  const box = crop ? null : val(flags.box) || Object.keys(boxes)[0] || null;
  if (box && !boxes[box]) {
    throw new Error(`--box ${box}: not in ${path.relative(ROOT, boxesFile)} (has ${Object.keys(boxes).join(', ') || 'none'}): name it there, or pass --crop x,y,w,h`);
  }
  if (!box && !crop) console.log(`  note: no box for ${name}: the board shows no UI card (pass --crop x,y,w,h in capture pixels)`);
  const phoneName = val(flags.phone) || otherCapture(platform, name);
  const phone = phoneName ? findCapture(platform, phoneName) : null;
  if (val(flags.phone) && !phone) throw new Error(`--phone ${phoneName}: no raw/${platform}/${phoneName}.png`);
  return { screen: hit, box, crop, phone };
}

export async function run(flags, { cfg, raw, tokens, rel }) {
  if (!tokens) console.log('  note: no brand/tokens.json yet: the board shows the config colours (npm run brand -- apply first)');
  const brief = readBrief();
  const dir = `${OUT}/board`;
  const session = await openSession();
  try {
    console.log('brand board');
    let shot = val(flags.screen) ? realScreen(flags) : null;
    if (!shot) {
      const t = tokens ? raw.brand.tokens : null;
      const theme = val(flags.theme) || (cfg.screens && cfg.screens.theme) || null;
      const page = samplePage(flags.sample);
      await shootSample(session, `${dir}/sample.png`, { tokens: t, theme, page });
      await shootSample(session, `${dir}/sample-phone.png`, { tokens: t, hide: 'card', theme, page });
      shot = { screen: `${dir}/sample.png`, box: 'card', crop: null, phone: `${dir}/sample-phone.png` };
    }
    const extra = { label: val(flags.label) || null, specimen: val(flags.specimen) || null, reversed: val(flags.reversed) || null,
      swatches: parseSwatches(val(flags.swatches)), lift: parseLift(val(flags.lift), val(flags.platform) || 'ios') };
    if (extra.specimen && !['field', 'paper'].includes(extra.specimen)) throw new Error(`--specimen ${extra.specimen}: use field or paper`);
    if (extra.reversed && !REVERSED.includes(extra.reversed)) throw new Error(`--reversed ${extra.reversed}: use ${REVERSED.join(', ')}`);
    writeJson(`${dir}/board.json`, { sample: sampleCopy(brief, cfg, tokens), audience: brief.audience || '', ...shot, ...extra, source: (tokens && tokens.source) || {} });
    await shootBoard(session, rel, 'board', { data: `${dir}/board.json` }, 'final/brand/brand-board.png');
    const c = cfg.brand.colors;
    if (!logoReady(cfg, tokens, brief.name || cfg.brand.name)) console.log('  note: no logo chosen yet (npm run brand -- apply --logo <id>): the board sets the name as text');
    else {
      await shootAsset(session, rel, cfg.brand.logo, c.ink, 1600, 'final/brand/logo.png');
      await shootAsset(session, rel, cfg.brand.logo, '#FFFFFF', 1600, 'final/brand/logo-white.png');
      if (cfg.brand.mark) await shootAsset(session, rel, cfg.brand.mark, c.ink, 1024, 'final/brand/mark.png');
    }
  } finally {
    await session.close();
  }
  console.log('\n  next: look at final/brand/brand-board.png and send it for approval; then screens (npm run screens or captures) and npm run export\n');
}
