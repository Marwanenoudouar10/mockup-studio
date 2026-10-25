// Mockup Studio end to end, part 2: editing INSIDE screens and headlines (editable projects). test/e2e.js runs it
// after the move tests, on the same project and server, with one Chrome at a time:
//  9 double-click the phone of App Store 01: screen mode and its layers  10 type a new title on the canvas (Enter
//    saves), Esc cancels  11 screenshot while editing (the cards over the phone hidden, nothing hidden in it yet)
//    12 a colour swatch, Hide, nudge with the arrows (the lift of that card in App Store 02 follows), undo / redo
//    13 a headline typed in place (Enter at once: "Nothing changed"; keys typed before the frame made it editable
//    are kept) and in the inspector, the other language marked "not updated"; one undo history for layout.json
//    and edits.json  14 npm run render and npm run vector show every edit  15 Reset element, Reset screen, copy
//    back to the config  16 edits.json edited by hand reloads the frames  17 a screenshots (raster) project
//    explains instead of entering
import fs from 'node:fs';
import path from 'node:path';
import { until } from './lib/project.js';
import { find, point, waitFrameReload, frameSrc } from './lib/page.js';
import { screenReady, screenState, layerPoint, screenDom, selectLayer, clickIn, typeIn, toastText } from './lib/screen.js';

const H3 = '@mood/div.row:1/h3.t-headline:1';
const Q = '@prompt/p.q:1';
const hex2rgb = (h) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`;

// the headline of a frame: its HTML and a viewport point on its left part (the centre can sit under the rotate
// knob of a selected phone)
const headline = (page, key) => page.evaluate((k) => {
  const { state, frames } = window.__studio;
  const f = frames.get(k);
  const h = f.boxes && f.boxes.copies[0] && f.boxes.copies[0].parts.headline;
  if (!h) return null;
  const c = document.getElementById('canvas').getBoundingClientRect();
  return { html: h.html, rect: h.rect, x: c.left + state.view.x + (f.x + (h.rect.cx - h.rect.w * 0.3) * f.s) * state.view.z, y: c.top + state.view.y + (f.y + h.rect.cy * f.s) * state.view.z };
}, key);

// the frame has turned on typing (the Studio knows a moment before the frame does): the headline, or an element
// of the frame's live screen "home"
const editable = (page, key, eid = null) => page.evaluate((k, id) => {
  const doc = window.__studio.frames.get(k).iframe.contentDocument;
  if (!id) return !!doc.querySelector('.headline[contenteditable]');
  const live = [...doc.querySelectorAll('iframe.live-screen')].find((x) => x.dataset.screen === 'home');
  return !!(live && [...live.contentDocument.querySelectorAll('[contenteditable]')].some((x) => x.dataset.eid === id));
}, key, eid);

export async function editSteps({ app, T, open, ok, key, QA, slug }) {
  const home = () => ((T.read('edits.json') || {}).screens || {}).home || {};
  const copy1 = () => (((T.read('edits.json') || {}).copy || {})['1'] || {}).headline || {};
  let s = await open(app);
  let { page } = s;
  const enterPhone = async () => {
    const phone = await find(page, 'appstore', 1, { type: 'phone' });
    const pp = await point(page, phone.key, { id: phone.id, panel: 1 });
    await page.mouse.click(pp.x, pp.y, { count: 2 });
    await screenReady(page);
    return phone;
  };
  try {
    console.log('9. screen mode: double-click the phone of App Store 01');
    const phone = await enterPhone();
    const st = await screenState(page);
    ok(st.screen === 'home' && st.n > 30, `entered the live screen "home" (${st.n} layers)`);
    const crumb = (await page.$eval('.scr-bar', (b) => b.textContent)).replace(/\s+/g, ' ');
    ok(/App Store 01.*phone · home/.test(crumb), `breadcrumb: ${crumb}`);
    const rows = await page.$$eval('#layers .slayer', (r) => r.length);
    ok(rows > 5 && rows < st.n, `the layers list opens at the top of the tree (${rows} of ${st.n} rows)`);
    const regions = await page.evaluate((ids) => ids.map((id) => window.__studio.state.screen.items.find((i) => i.eid === id).rect), ['nav:title', 'entry', H3]);

    console.log('10. type on the canvas');
    const t = await layerPoint(page, 'nav:title');
    await page.mouse.click(t.x, t.y, { count: 2 });
    await until(async () => (await screenState(page)).typing === 'nav:title' && await editable(page, phone.key, 'nav:title'), 'typing in the title');
    await page.keyboard.type('Good evening, Sam');
    await page.keyboard.press('Enter');
    const e1 = await until(() => home()['nav:title'], 'edits.json after Enter');
    ok(e1.text.en === 'Good evening, Sam' && /^[0-9a-f]{8}$/.test(e1.of), `Enter saves: edits.json home › nav:title = "${e1.text.en}" (of ${e1.of})`);
    await until(async () => (await screenDom(page, phone.key, 'home', 'nav:title')).text === 'Good evening, Sam', 'the live title');
    ok(true, 'the live screen in the frame shows it');
    const q0 = (await screenDom(page, phone.key, 'home', Q)).text;
    const qp = await layerPoint(page, Q);
    await page.mouse.click(qp.x, qp.y, { count: 2 });
    await until(async () => (await screenState(page)).typing === Q && await editable(page, phone.key, Q), 'typing in the prompt');
    await page.keyboard.type('Not this');
    await page.keyboard.press('Escape');
    await until(async () => !(await screenState(page)).typing, 'typing ended');
    ok((await screenDom(page, phone.key, 'home', Q)).text === q0 && !home()[Q], 'Esc cancels: the words and edits.json unchanged');
    ok(!!(await screenState(page)), 'still in screen mode after Esc in the text');

    console.log('11. screenshot while editing');
    await selectLayer(page, Q);
    // on the empty canvas: no hover in the shot (headless Chrome replays a hover at half the pointer's position
    // when it takes a 2x screenshot, so both points must be empty canvas)
    await page.mouse.move(520, 900);
    const hidden = await page.evaluate((k) => [...window.__studio.frames.get(k).iframe.contentDocument.querySelectorAll('[data-el]')]
      .filter((n) => n.style.opacity === '0').length, phone.key);
    ok(hidden > 0, `the ${hidden} card(s) floating over the entered phone are hidden, the rest of the image fades`);
    await until(() => page.evaluate(() => window.__studio.state.screen.hover === null), 'no hover');
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // painted
    await page.screenshot({ path: path.join(T.root, QA, 'editing.png') });
    ok(fs.existsSync(path.join(T.root, QA, 'editing.png')), `screenshot: ${QA}/editing.png`);

    console.log('12. colour, hide, nudge, undo');
    const hp = await layerPoint(page, H3);
    await page.mouse.click(hp.x, hp.y);
    await until(async () => (await screenState(page)).sel === H3, 'click selects the mood heading');
    await clickIn(page, '[data-sact="color"][data-v="accent"]');
    const e2 = await until(() => home()[H3], 'the colour edit');
    const d2 = await until(async () => { const d = await screenDom(page, phone.key, 'home', H3); return d.color === hex2rgb(d.accent) && d; }, 'the live colour');
    ok(e2.color === 'accent', `swatch "accent": edits.json color ${e2.color}, the frame draws ${d2.color} (--accent ${d2.accent})`);
    await selectLayer(page, 'entry');
    await clickIn(page, '[data-sact="hide"]');
    await until(() => home().entry && home().entry.hidden, 'hide in edits.json');
    await until(async () => (await screenDom(page, phone.key, 'home', 'entry')).visibility === 'hidden', 'hidden in the frame');
    ok(true, 'Hide: edits.json home › entry.hidden, visibility hidden in the frame');
    await selectLayer(page, 'prompt');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await key(page, ['Shift', 'ArrowRight']);
    const e4 = await until(() => { const p = home().prompt; return p && p.dx === 10 && p.dy === 3 && p; }, 'the nudge saved');
    await until(async () => (await screenDom(page, phone.key, 'home', 'prompt')).translate === '10px 3px', 'the nudge in the frame');
    ok(true, `arrows nudge: edits.json home › prompt dx ${e4.dx} dy ${e4.dy}, translate 10px 3px in the frame`);
    const lift2 = `${slug}|appstore|2`;
    await until(async () => { const d = await screenDom(page, lift2, 'home', 'prompt'); return d && d.translate === '10px 3px'; }, 'App Store 02', 20000);
    ok(true, 'the lifted prompt card in App Store 02 shows the nudge too');
    await key(page, ['Control', 'z']);
    await until(() => !home().prompt, 'undo');
    await until(async () => (await toastText(page)) === 'Undone: nudge', 'the undo recorded'); // the file is written before the reply
    await until(async () => (await screenDom(page, phone.key, 'home', 'prompt')).translate === 'none', 'undone in the frame');
    await key(page, ['Control', 'Shift', 'Z']);
    await until(() => home().prompt && home().prompt.dx === 10, 'redo');
    await until(async () => (await screenDom(page, phone.key, 'home', 'prompt')).translate === '10px 3px', 'redone in the frame');
    ok(true, 'Ctrl+Z / Ctrl+Shift+Z undo and redo the nudge (file and frame)');

    console.log('13. headlines, and one history for layout.json and edits.json');
    await page.keyboard.press('Escape');
    await until(() => page.evaluate(() => !window.__studio.state.screen && !window.__studio.state.moving), 'Esc leaves screen mode');
    const hl = await headline(page, phone.key);
    await page.mouse.click(hl.x, hl.y, { count: 2 });
    await until(async () => (await page.evaluate(() => !!window.__studio.state.copyTyping)) && editable(page, phone.key), 'typing the headline');
    await page.keyboard.press('Enter');
    await until(async () => (await toastText(page)) === 'Nothing changed', 'Enter with nothing typed');
    ok(!copy1().en, 'Enter with nothing changed: no edit, and the toast says "Nothing changed"');
    // typed at once, before the frame has made the headline editable (about 100 ms): the Studio keeps the keys
    await page.mouse.click(hl.x, hl.y, { count: 2 });
    await until(() => page.evaluate(() => !!window.__studio.state.copyTyping), 'the double-click started typing', 8000);
    await page.keyboard.type('Your week, one page at a time');
    await page.keyboard.press('Enter');
    const typed = await until(() => copy1().en, 'the typed headline in edits.json');
    ok(typed === 'Your week, one page at a time', `typed at once, Enter saves the headline typed in place: "${typed}"`);
    const stale = ((((T.read('edits.json') || {}).copy || {})['1'] || {}).stale || {}).headline;
    ok(JSON.stringify(stale) === '["es"]' && /es not updated/.test(await toastText(page)), `the other language is marked not updated (stale ${JSON.stringify(stale)}) and the toast says so`);
    await until(async () => (await headline(page, phone.key)).html === 'Your week, one page at a time', 'the frame with it', 20000);
    ok(true, 'a headline typed in place: edits.json copy › 1 › headline, and the image shows it');
    await typeIn(page, 'textarea[data-ck="headline"]', 'Your week, <em>one page</em> at a time');
    await until(() => copy1().en === 'Your week, <em>one page</em> at a time', 'the inspector headline');
    ok(true, `the inspector keeps <em>: "${copy1().en}"`);
    const badge = await find(page, 'appstore', 1, { type: 'badge' });
    const bp = await point(page, badge.key, { id: badge.id, panel: 1 });
    await page.mouse.click(bp.x, bp.y);
    await page.keyboard.press('ArrowRight');
    await until(() => ((T.read('layout.json') || {}).appstore || {})['1'], 'the badge nudge in layout.json');
    await until(async () => (await toastText(page)).startsWith('Saved position'), 'the move recorded');
    await key(page, ['Control', 'z']);
    await until(() => !((T.read('layout.json') || {}).appstore || {})['1'], 'undo the move');
    await until(async () => (await toastText(page)) === 'Undone: nudge', 'the undo of the move recorded');
    await key(page, ['Control', 'z']);
    await until(() => copy1().en === 'Your week, one page at a time', 'undo the headline');
    await until(async () => (await toastText(page)) === 'Undone: headline', 'the undo of the headline recorded');
    await key(page, ['Control', 'Shift', 'Z']);
    await until(() => copy1().en === 'Your week, <em>one page</em> at a time', 'redo the headline');
    ok(true, 'one history: Ctrl+Z undid the move (layout.json), then the headline (edits.json); redo brought it back');
    ok(s.errors.length === 0, `no page errors${s.errors.length ? `: ${s.errors.join('; ')}` : ''}`);
    await s.browser.close();
    s = null;

    console.log('14. npm run render and npm run vector');
    T.render(`${QA}/edited`, ['--store', 'appstore', '--panel', '1', '--locale', 'en']);
    const changed = (r) => T.diff(`${QA}/before/en/appstore/01.png`, `${QA}/edited/en/appstore/01.png`, r).n;
    const [nTitle, nEntry, nH3] = regions.map(changed);
    const nHead = changed(hl.rect);
    ok(nTitle > 200 && nEntry > 500 && nH3 > 50 && nHead > 500, `the PNG changed at the title (${nTitle} px), the hidden card (${nEntry}), the coloured heading (${nH3}) and the headline (${nHead})`);
    T.script('vector', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--svg-only', '--out', `${QA}/vec`]);
    const svg = fs.readFileSync(path.join(T.root, QA, 'vec/vector/en/appstore/01.svg'), 'utf8');
    ok(svg.includes('>Good evening, Sam<') && !svg.includes('Good morning, Sam'), 'SVG: the new title, as text');
    ok(/<text[^>]*fill="#ffc580"[^>]*>How are you feeling\?</i.test(svg), 'SVG: the heading in the accent colour');
    ok(!svg.includes('A quiet Sunday walk') && svg.includes('Your week,') && !svg.includes('Your day,'), 'SVG: the hidden card is gone, the new headline is there');

    console.log('15. reset');
    s = await open(app);
    ({ page } = s);
    await enterPhone();
    await selectLayer(page, 'entry');
    await clickIn(page, '[data-sact="reset-el"]');
    await until(() => !home().entry, 'reset element');
    await until(async () => (await screenDom(page, phone.key, 'home', 'entry')).visibility === 'visible', 'visible again');
    ok(true, 'Reset element: the entry is out of edits.json and visible again');
    await clickIn(page, '[data-sact="reset-screen"]');
    await until(() => !Object.keys(home()).length, 'reset screen');
    await until(async () => (await screenDom(page, phone.key, 'home', 'nav:title')).text === 'Good morning, Sam', 'the title back');
    ok(true, 'Reset screen: no edits left for "home", the title is back');
    await page.keyboard.press('Escape');
    await until(() => page.evaluate(() => !window.__studio.state.screen && !window.__studio.state.moving), 'back out of screen mode');
    const hl2 = await headline(page, phone.key);
    await page.mouse.click(hl2.x, hl2.y);
    await clickIn(page, '[data-cact="reset"]');
    await until(() => !copy1().en, 'copy reset');
    ok(!((((T.read('edits.json') || {}).copy || {})['1'] || {}).stale), 'Back to studio.config.js: the headline edit and its "not updated" marker are gone');

    console.log('16. edits.json edited by hand');
    const src = await frameSrc(page, phone.key);
    T.write('edits.json', { version: 1, screens: { home: { 'nav:title': { text: { en: 'Hello from disk' } } } } });
    await waitFrameReload(page, phone.key, src);
    await until(async () => { const d = await screenDom(page, phone.key, 'home', 'nav:title'); return d && d.text === 'Hello from disk'; }, 'the outside edit', 15000);
    ok(true, 'an outside edit of edits.json reloads the frames live');

    console.log('17. a screenshots (raster) project');
    const cfg = fs.readFileSync(path.join(T.root, 'studio.config.js'), 'utf8');
    fs.writeFileSync(path.join(T.root, 'studio.config.js'), cfg.replace("screens: { mode: 'live' }", "screens: { mode: 'raster' }"));
    try {
      await until(() => page.evaluate(() => window.__studio.state.project.mode === 'raster'), 'the project reloaded as raster', 15000);
      await page.waitForFunction(() => [...window.__studio.frames.values()].filter((f) => f.iframe).every((f) => f.ready && !f.next), { timeout: 60000 });
      const ph = await find(page, 'appstore', 1, { type: 'phone' });
      const p3 = await point(page, ph.key, { id: ph.id, panel: 1 });
      await page.mouse.click(p3.x, p3.y, { count: 2 });
      await until(async () => (await toastText(page)).startsWith('Screenshots project'), 'the raster note');
      ok(!(await screenState(page)), 'a screenshots project does not enter the screen: it says why');
    } finally {
      fs.writeFileSync(path.join(T.root, 'studio.config.js'), cfg);
    }
    await until(() => page.evaluate(() => window.__studio.state.project.mode === 'live'), 'back to live', 15000);
    ok(s.errors.length === 0, `no page errors${s.errors.length ? `: ${s.errors.join('; ')}` : ''}`);
  } finally {
    if (s) await s.browser.close().catch(() => {});
  }
}
