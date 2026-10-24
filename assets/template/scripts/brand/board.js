// npm run brand -- board [--screen today --box tasks | --crop x,y,w,h] [--phone home] [--platform ios]
// The brand board for approval, BEFORE any mock screen or store image: the logo on paper and on the field,
// the app icon, the palette with its contrast, the type pair, a UI card and a store-image thumbnail,
// all from brand/tokens.json + brand/logo.svg, mark.svg, icon.svg (the files the engine will use).
//   default    the kit's sample screen dressed in the tokens (out/brand/board/sample.png); the thumbnail's
//              phone shows it without the card it lifts out (sample-phone.png), so no card shows twice
//   --screen   Mode A: a client capture instead (raw/<platform>/<name>.png); its UI card is --box (from
//              <name>.boxes.json, default: the first box) or --crop x,y,w,h in capture pixels (no boxes yet)
//   --phone    the capture in the thumbnail's phone (default: another capture of that platform; with none,
//              the phone shows --screen and nothing is lifted)
// Before `apply --logo` the boards set the name as text (scripts/brand/lib/brief.js logoReady).
// -> final/brand/brand-board.png, plus the brand kit PNGs on transparent: logo.png (ink),
//    logo-white.png and mark.png (for the client's other uses: web, socials, documents)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/cli.js';
import { readBrief, sampleCopy, logoReady } from './lib/brief.js';
import { writeJson, OUT } from './lib/tokens-io.js';
import { shootBoard, shootSample, shootAsset } from './lib/shoot.js';
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
      await shootSample(session, `${dir}/sample.png`, { tokens: t });
      await shootSample(session, `${dir}/sample-phone.png`, { tokens: t, hide: 'card' });
      shot = { screen: `${dir}/sample.png`, box: 'card', crop: null, phone: `${dir}/sample-phone.png` };
    }
    writeJson(`${dir}/board.json`, { sample: sampleCopy(brief, cfg, tokens), audience: brief.audience || '', ...shot, source: (tokens && tokens.source) || {} });
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
