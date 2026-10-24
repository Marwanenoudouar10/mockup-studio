// Store Studio end to end, on a real project (default: the template's Brimpage demo), with ONE Chrome at a time
// and renders run one after another:
//   node test/e2e.js [--project ../assets/template]
// 1 baseline render  2 drag a lift -> layout.json + the frame moved, undo / redo  3 screenshot of the workspace
// 4 an outside edit of layout.json reloads the frame live  5 drop a screen onto an image (add), undo
// 6 a note for Claude  7 npm run render shows the move  8 Reset to config. The project's own layout.json and
// notes.json are put back exactly as they were.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { start } from '../server/index.js';
import { projectTools, until } from './lib/project.js';
import { framesReady, find, point, rectInFrame, drag, sel, clickButton, waitFrameReload, frameSrc } from './lib/page.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const root = path.resolve(process.cwd(), arg('project', path.join(HERE, '..', '..', 'assets', 'template')));
const T = projectTools(root);
const QA = 'out/qa/workspace';
const SHOT = `${QA}/workspace.png`;
let passed = 0;
const ok = (cond, msg) => { if (!cond) throw new Error(`FAIL: ${msg}`); passed++; console.log(`  ok  ${msg}`); };
const inBox = (b, x, y, pad = 4) => x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;
const lastOf = (layout, id) => layout && layout.appstore && layout.appstore['1'] && layout.appstore['1'][id];

async function open(app) {
  const browser = await T.launchChrome();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
  await page.goto(`${app.url}?project=${app.registry.live()[0].slug}`, { waitUntil: 'load' });
  await framesReady(page);
  return { browser, page, errors };
}

const key = async (page, combo) => {
  const [mods, k] = [combo.slice(0, -1), combo[combo.length - 1]];
  for (const m of mods) await page.keyboard.down(m);
  await page.keyboard.press(k);
  for (const m of mods.reverse()) await page.keyboard.up(m);
};

async function main() {
  const state = path.join(os.tmpdir(), `store-studio-test-${process.pid}.json`);
  T.backup();
  let app = null;
  let s = null;
  try {
    console.log('1. baseline render (App Store 01, en)');
    if (T.ensureScreens()) console.log('  (captured the mock screens first: npm run screens)');
    T.clean(QA);
    T.render(`${QA}/before`, ['--store', 'appstore', '--panel', '1', '--locale', 'en']);

    console.log('2. Store Studio: drag a lift');
    app = await start([root, '--port', '0', '--state', state], { log: () => {} });
    const bad = await fetch(`${app.url}api/layout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' }, body: '{}' });
    ok(bad.status === 403, 'a POST from another origin is refused (403)');
    const trav = await fetch(`${app.url}p/${app.registry.live()[0].slug}/..%2f..%2fpackage.json`);
    ok(trav.status === 403, 'path traversal under /p/<slug>/ is refused (403)');
    s = await open(app);
    const { page } = s;
    const lift = await find(page, 'appstore', 1, { box: 'streak' });
    ok(lift && lift.id, `App Store 01 reports its lift "streak" (element ${lift && lift.id})`);
    const r0 = await rectInFrame(page, lift.key, lift.id);
    const p0 = await point(page, lift.key, { id: lift.id, panel: 1 });
    const z = await page.evaluate(() => window.__studio.state.view.z);
    await drag(page, p0, { x: p0.x + 14, y: p0.y + 10 });
    const o = (await until(() => lastOf(T.read('layout.json'), lift.id), 'layout.json after the drag'));
    const ex = lift.values.x + 14 / (z * lift.s * lift.map.ux);
    const ey = lift.values.y + 10 / (z * lift.s * lift.map.uy);
    ok(Math.abs(o.x - ex) <= 1.5 && Math.abs(o.y - ey) <= 1.5, `layout.json appstore.1.${lift.id} = x ${o.x}, y ${o.y} (config ${lift.values.x}, ${lift.values.y})`);
    ok(o.of === 'lift:insights:streak', `the override carries its fingerprint (${o.of})`);
    // the server writes layout.json before it answers, and the page records the move for undo only when
    // the answer arrives (then it shows the "Saved position" toast): wait for that, or Ctrl+Z can come too early
    await until(() => page.evaluate(() => document.getElementById('toast').textContent.startsWith('Saved position')), 'the move recorded for undo');
    // the frame applies the drag's last step a moment after the pointer: read the lift once it stops moving
    let last = null;
    const r1 = await until(async () => {
      const r = await rectInFrame(page, lift.key, lift.id);
      const still = r && last && r.left === last.left && r.top === last.top;
      last = r;
      return still && r;
    }, 'the frame after the drag');
    ok(r1.left > r0.left && r1.top > r0.top, `the lift moved inside the frame (${r0.left},${r0.top} -> ${r1.left},${r1.top})`);
    const moved = await find(page, 'appstore', 1, { box: 'streak' });
    ok(String((await sel(page)).id) === String(lift.id), 'the lift stays selected');
    await key(page, ['Control', 'z']);
    await until(() => !lastOf(T.read('layout.json'), lift.id), 'undo');
    const ru = await until(async () => { const r = await rectInFrame(page, lift.key, lift.id); return r && r.left === r0.left && r; }, 'the frame after undo');
    ok(ru.top === r0.top, 'Ctrl+Z: layout.json entry gone, lift back in place');
    await key(page, ['Control', 'Shift', 'Z']);
    const o2 = await until(() => lastOf(T.read('layout.json'), lift.id), 'redo');
    ok(o2.x === o.x && o2.y === o.y, 'Ctrl+Shift+Z: the move is back');
    // redo redraws from layout.json's stored numbers, the drag from the pointer's: allow 1 px of rounding
    await until(async () => { const r = await rectInFrame(page, lift.key, lift.id); return r && Math.abs(r.left - r1.left) <= 1; }, 'the frame after redo');

    console.log('3. screenshot');
    fs.mkdirSync(path.join(root, QA), { recursive: true });
    await page.screenshot({ path: path.join(root, SHOT) });
    ok(fs.existsSync(path.join(root, SHOT)), `workspace screenshot: ${SHOT}`);

    console.log('4. live: layout.json edited outside the workspace');
    const badge = await find(page, 'appstore', 1, { type: 'badge' });
    const view0 = await page.evaluate(() => JSON.stringify(window.__studio.state.view));
    const src0 = await frameSrc(page, badge.key);
    const t0 = Date.now();
    const d = T.read('layout.json');
    d.appstore['1'][badge.id] = { x: badge.values.x + 200, y: badge.values.y };
    T.write('layout.json', d);
    await waitFrameReload(page, badge.key, src0);
    const ms = Date.now() - t0;
    const b1 = await until(async () => { const b = await find(page, 'appstore', 1, { type: 'badge' }); return b.values.x === badge.values.x + 200 && b; }, 'badge boxes');
    ok(ms < 3000, `the frame reloaded ${ms} ms after the file changed; badge x ${badge.values.x} -> ${b1.values.x}`);
    ok(view0 === await page.evaluate(() => JSON.stringify(window.__studio.state.view)), 'zoom and pan kept');
    ok(String((await sel(page)).id) === String(lift.id), 'selection kept across the reload');
    delete d.appstore['1'][badge.id];
    const src1 = await frameSrc(page, badge.key);
    T.write('layout.json', d);
    await waitFrameReload(page, badge.key, src1);

    console.log('5. drop a screen onto an image');
    const target = await find(page, 'appstore', 2, { type: 'phone' });
    const thumb = await page.$('.thumb[data-name="entry"]');
    const tb = await thumb.boundingBox();
    const drop = await point(page, target.key, { fx: 0.32, fy: 0.62 });
    await drag(page, { x: tb.x + tb.width / 2, y: tb.y + tb.height / 2 }, drop, 16);
    const add = await until(() => ((T.read('layout.json') || {}).add || []).find((a) => a.screen === 'entry'), 'the add entry');
    ok(add.store === 'appstore' && add.panel === 2 && add.type === 'phone', `layout.json add: ${add.id} = ${add.type} "${add.screen}" on appstore panel ${add.panel} at x ${add.x}, y ${add.y}`);
    ok(await until(() => rectInFrame(page, target.key, add.id), 'the dropped phone in the frame'), 'the dropped phone is drawn live in App Store 02');
    await key(page, ['Control', 'z']);
    await until(() => !(T.read('layout.json') || {}).add, 'undo of the add');
    await until(async () => !(await rectInFrame(page, target.key, add.id)), 'the phone removed');
    ok(true, 'undo removes the added phone from layout.json and the frame');

    console.log('6. a note for Claude');
    const p1 = await point(page, lift.key, { id: lift.id, panel: 1 });
    await page.mouse.click(p1.x, p1.y);
    await page.type('#note-text', 'Make the streak card a little bigger');
    await clickButton(page, 'Pin note to this element');
    const notes = await until(() => { const n = T.read('notes.json'); return n && n.notes.length && n.notes; }, 'notes.json');
    ok(notes[0].store === 'appstore' && notes[0].panel === 1 && notes[0].element === String(lift.id), `notes.json: "${notes[0].text}" on appstore panel 1, element ${notes[0].element}`);
    ok(await until(() => page.$('.pin'), 'the pin'), 'the note shows as a pin on the image');
    await page.evaluate(() => [...document.querySelectorAll('.note-row button')].find((b) => b.textContent === 'delete').click());
    await until(() => (T.read('notes.json') || { notes: [1] }).notes.length === 0, 'note deleted');
    ok(s.errors.length === 0, `no page errors${s.errors.length ? `: ${s.errors.join('; ')}` : ''}`);
    await s.browser.close();
    s = null;

    console.log('7. npm run render with the move');
    T.render(`${QA}/after`, ['--store', 'appstore', '--panel', '1', '--locale', 'en']);
    const df = T.diff(`${QA}/before/en/appstore/01.png`, `${QA}/after/en/appstore/01.png`);
    ok(df.n > 500 && inBox(df.box, lift.rect.cx, lift.rect.cy) && inBox(df.box, moved.rect.cx, moved.rect.cy),
      `the rendered PNG changed where the lift was and where it went (${df.n} px in ${df.box.x0},${df.box.y0}-${df.box.x1},${df.box.y1})`);

    console.log('8. Reset to config');
    s = await open(app);
    const p2 = await point(s.page, lift.key, { id: lift.id, panel: 1 });
    await s.page.mouse.click(p2.x, p2.y);
    const src2 = await frameSrc(s.page, lift.key);
    await clickButton(s.page, 'Reset to config');
    await until(() => !lastOf(T.read('layout.json'), lift.id), 'reset');
    await waitFrameReload(s.page, lift.key, src2);
    const rr = await rectInFrame(s.page, lift.key, lift.id);
    ok(rr.left === r0.left && rr.top === r0.top, 'Reset to config: entry removed, the lift is back where the config puts it');
    ok(s.errors.length === 0, 'no page errors');
    console.log(`\n  ${passed} checks passed. Screenshot: ${path.join(path.relative(process.cwd(), root) || '.', SHOT)}\n`);
    T.clean(`${QA}/before`);
    T.clean(`${QA}/after`);
  } finally {
    if (s) await s.browser.close().catch(() => {});
    if (app) await app.close();
    T.restore();
    fs.rmSync(state, { force: true });
  }
}

main().catch((err) => {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
});
