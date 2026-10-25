// Live screens (editable projects) vs captures (screenshots projects): the same demo panels both ways, on a
// temporary copy of the template, one Chrome at a time:   node tests/parity.js
// 1 page rules: scripts/lib/pages.js resolves every captured screen to the page the capture used
// 2 layout parity: every data-box measured live (DSF 1, as in a store image) equals raw/<platform>/*.boxes.json
//   (DSF 3, the capture), on iOS and Android, in English and Spanish
// 3 pixels: appstore 1, 2 (rotated), 3 (tile), playstore 5, producthunt 8 (the responsive trio) rendered with
//   --screens raster and --screens live: blurred mean <= 1.0, blurred pixels over 8 <= 3%, worst 48 px tile <= 25
//   (the differences are glyph anti-aliasing: the capture lays text out at 3x, the live screen at 1x)
// 4 sharpness: at --scale 2 and 3 the live render has no upscale warning and more edge detail in the phone's
//   screen than the raster one, which warns (its captures are 1x)
// 5 a mixed project: in an editable project a screen with no page (a real capture in raw/) is drawn from raw/
import fs from 'node:fs';
import path from 'node:path';
import { tempProject, checker } from './lib/project.js';
import { compare, sharpness } from './lib/diff.js';

const t = checker('live screens vs captures');
const tp = tempProject('parity');
const JOBS = [['appstore', 1], ['appstore', 2], ['appstore', 3], ['playstore', 5], ['producthunt', 8]];
const LIMITS = { blurMean: 1.0, blurOver8: 3, worstTile: 25 };

try {
  if (!tp.exists('raw/ios/home.png')) tp.run('screens');

  console.log('1. page rules');
  const { pagesFor, resolvePage } = await import(path.join(tp.root, 'scripts/lib/pages.js'));
  const { screenPages } = await import(path.join(tp.root, 'scripts/lib/server.js'));
  const listing = screenPages(tp.root);
  let n = 0;
  for (const plat of ['ios', 'android', 'ipad', 'web']) {
    for (const j of pagesFor(listing, plat, { phones: plat !== 'ipad' })) {
      const r = resolvePage(listing, j.name, plat);
      if (!(r && r.page === j.page && r.query === j.query)) t.ok(false, `${plat} "${j.name}" resolves to ${j.page}?${j.query}`, JSON.stringify(r));
      n++;
    }
  }
  t.ok(n >= 14, `${n} captured screens resolve to their own page`);

  console.log('2. layout parity: boxes live (1x) = boxes captured (3x)');
  const { openSession, capture } = await import(path.join(tp.root, 'scripts/lib/session.js'));
  const { PLATFORMS } = await import(path.join(tp.root, 'scripts/lib/stores.js'));
  const s = await openSession();
  let worst = 0;
  let boxes = 0;
  const missing = [];
  try {
    for (const plat of ['ios', 'android']) {
      for (const name of ['home', 'entry', 'insights', 'privacy', 'remind']) {
        for (const loc of ['en', 'es']) {
          const [w, h] = PLATFORMS[plat].css;
          await capture(s, `screens/${name}.html?platform=${plat}&locale=${loc}`, { width: w, height: h, dpr: 1, readyMode: 'auto' });
          const live = (await s.page.evaluate((k) => window.kit.boxes(k), PLATFORMS[plat].dpr)).boxes;
          const ref = JSON.parse(tp.read(`raw/${plat}/${loc === 'en' ? '' : 'es/'}${name}.boxes.json`));
          for (const [k, b] of Object.entries(ref)) {
            const l = live[k];
            if (!l) { missing.push(`${plat} ${loc} ${name} "${k}"`); continue; }
            worst = Math.max(worst, ...['x', 'y', 'w', 'h', 'r'].map((p) => Math.abs(l[p] - b[p])));
            boxes++;
          }
          s.drain();
        }
      }
    }
  } finally { await s.close(); }
  t.ok(!missing.length, 'every captured box exists live', missing.join(', '));
  t.ok(worst === 0, `${boxes} boxes: the same capture px both ways (x, y, w, h, radius)`, `worst delta ${worst}`);

  console.log('3. pixels: raster vs live');
  for (const [store, panel] of JOBS) {
    const out = {};
    for (const mode of ['raster', 'live']) {
      const r = tp.run('render', ['--store', store, '--panel', String(panel), '--locale', 'en', '--screens', mode, '--out', `out/qa/parity/${mode}`]).out;
      out[mode] = r;
    }
    const n = store === 'producthunt' ? panel - 5 : panel; // producthunt shows panels 6-8 as its images 1-3
    const file = (m) => tp.file(`out/qa/parity/${m}/en/${store}/${String(n).padStart(2, '0')}.png`);
    const d = compare(file('raster'), file('live'));
    const ok = d.blurMean <= LIMITS.blurMean && d.blurOver8 <= LIMITS.blurOver8 && d.worstTile <= LIMITS.worstTile;
    t.ok(ok, `${store} panel ${panel}`, `blurMean ${d.blurMean}, blur>8 ${d.blurOver8}%, worst tile ${d.worstTile}, raw >8 ${d.over8}%`);
    t.ok(!/warn:/.test(out.live) || /warn:/.test(out.raster), `${store} panel ${panel}: no new warnings live`, (out.live.match(/warn:.*/g) || []).join(' | '));
  }

  console.log('4. sharp at --scale 2 with no recapture');
  const live2 = tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--scale', '2', '--screens', 'live', '--out', 'out/qa/parity/x2-live']).out;
  const ras2 = tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--scale', '2', '--screens', 'raster', '--out', 'out/qa/parity/x2-raster']).out;
  t.ok(!/upscaled/.test(live2), 'live at 2x: no upscale warning');
  t.ok(/upscaled/.test(ras2), 'raster at 2x: warns (its captures are 1x)', (ras2.match(/warn: .*upscaled.*/) || [''])[0].trim().slice(0, 90));
  const region = [560, 2000, 1400, 1400]; // the phone's screen (cards and text) in the 2640 x 5736 image
  const [sl, sr] = ['x2-live', 'x2-raster'].map((d) => sharpness(tp.file(`out/qa/parity/${d}/portfolio/en/appstore/01.png`), region));
  t.ok(sl > sr * 1.1, 'live at 2x is sharper than raster at 2x (edge energy)', `${sl} vs ${sr}`);
  const live3 = tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--scale', '3', '--screens', 'live', '--out', 'out/qa/parity/x3-live']).out;
  t.ok(!/upscaled/.test(live3) && tp.exists('out/qa/parity/x3-live/portfolio/en/appstore/01.png'), 'live at 3x: no upscale warning, no recapture');

  console.log('5. a mixed project: a real capture (no page in screens/) in an editable project');
  for (const [from, to] of [['insights', 'realshot'], ['privacy', 'realphone']]) {
    for (const ext of ['png', 'boxes.json']) fs.copyFileSync(tp.file(`raw/ios/${from}.${ext}`), tp.file(`raw/ios/${to}.${ext}`));
  }
  tp.write('examples/mixed.config.js', `import base from '../studio.config.js';
export default { ...base, stores: ['appstore'], locales: ['en'], panels: [{ headline: 'A real capture', stage: [
  { type: 'phone', screen: 'realphone', w: 700, x: 660, y: 60, z: 20 },
  { type: 'lift', screen: 'realshot', box: 'streak', w: 520, x: 960, y: 300, z: 30 },
  { type: 'phone', screen: 'home', w: 500, x: 330, y: 500, z: 10 }] }] };\n`);
  const mixed = {};
  for (const mode of ['live', 'raster']) {
    mixed[mode] = tp.run('render', ['--config', 'examples/mixed.config.js', '--screens', mode, '--out', `out/qa/parity/mixed-${mode}`]).out;
  }
  t.ok(!/missing|warn:/.test(mixed.live), 'live: the capture is found in raw/ (no missing screen, no warning)', (mixed.live.match(/warn:.*/g) || []).join(' | '));
  const html = await (async () => {
    const s2 = await openSession();
    try {
      await capture(s2, 'engine/panel.html?config=examples/mixed.config.js&store=appstore&locale=en&panel=1', { width: 1320, height: 2868, dpr: 1 });
      return await s2.page.evaluate(() => [...document.querySelectorAll('.device, .lift')].map((n) => (n.querySelector('iframe.live-screen') ? 'live' : n.querySelector('img') ? 'img' : 'none')));
    } finally { await s2.close(); }
  })();
  t.ok(html.join(' ') === 'img img live', 'the capture is drawn as an image, the mock screen live', html.join(' '));
  const dm = compare(tp.file('out/qa/parity/mixed-live/en/appstore/01.png'), tp.file('out/qa/parity/mixed-raster/en/appstore/01.png'));
  t.ok(dm.blurMean <= LIMITS.blurMean && dm.worstTile <= LIMITS.worstTile, 'and it looks like the screenshots project', `blurMean ${dm.blurMean}, worst tile ${dm.worstTile}`);
  t.done();
} finally {
  tp.rm();
}
