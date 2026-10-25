// edits.json end to end, on a temporary copy of the template (never the template itself), one Chrome at a time:
//   node tests/edits.js
// 1 screen edits (text, colour from a token and a hex, background, size, hidden, nudge) applied in a live
//   render: checked in the screen's iframe (computed styles) and on the pixels (vs a render with --edits 0)
// 2 the same edits in a raster capture (npm run screens), vs a capture with --edits 0
// 3 copy and stage text edits (per locale) in the render, and in validate's store-policy scan
// 4 a changed screen: an automatic id re-anchors to its unique fingerprint; an ambiguous twin is skipped with a
//   warning (render log, render-report.json, validate, capture log + raw/screens-report.json), never misapplied
// 5 npm run bake folds the copy edits into studio.config.js (verified), screen edits stay; the render is unchanged
// 6 a copy "stale" marker (a language not retyped after another changed in Mockup Studio): validate warns, bake
//   keeps the marker
import fs from 'node:fs';
import path from 'node:path';
import { tempProject, checker } from './lib/project.js';
import { compare, sameish } from './lib/diff.js';

const t = checker('edits.json');
const tp = tempProject('edits');

const EDITS = {
  version: 1,
  screens: {
    home: {
      'nav:title': { text: { en: 'Good evening, Sam', es: 'Buenas tardes, Sam' } },
      '@prompt/p.q:1': { text: { en: 'What made today good?' }, size: 30 },
      mood: { bg: '#FFE8A3' },
      '@mood/div.row:1/h3.t-headline:1': { color: '#E0115F' },
      '@mood/div.row:1/span.t-sub:1': { color: 'accent' },
      entry: { hidden: true },
      '@main.content:1/div.card:1': { dx: 0, dy: 24 },
    },
  },
  copy: { 1: { headline: { en: 'Your week, <em>one page</em> at a time' } }, 2: { sub: { es: 'Descarga ahora y escribe.' } } },
  stage: { 1: { 4: { text: { en: 'Locked by default' } } } },
};

async function inFrame(query, fn, arg) {
  const { openSession, capture } = await import(path.join(tp.root, 'scripts/lib/session.js'));
  const s = await openSession();
  try {
    await capture(s, query, { width: 1320, height: 2868, dpr: 1 });
    return await s.page.evaluate(fn, arg);
  } finally { await s.close(); }
}

try {
  console.log('1. screen edits in a live render');
  tp.write('edits.json', JSON.stringify(EDITS, null, 2));
  const out = tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--out', 'out/qa/edits/on']).out;
  t.ok(!/warn: edits\.json/.test(out), 'no edit is skipped', out.match(/warn: edits.*/g)?.join(' | ') || '');
  tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--out', 'out/qa/edits/off', '--edits', '0']);
  const st = await inFrame('engine/panel.html?config=studio.config.js&store=appstore&locale=en&panel=1', () => {
    const f = [...document.querySelectorAll('iframe.live-screen')].find((x) => x.dataset.screen === 'home');
    const d = f.contentDocument;
    const q = (id) => [...d.querySelectorAll('[data-eid]')].find((n) => n.dataset.eid === id);
    const cs = (id) => f.contentWindow.getComputedStyle(q(id));
    return {
      title: q('nav:title').textContent.trim(), q: q('@prompt/p.q:1').textContent.trim(), size: cs('@prompt/p.q:1').fontSize,
      bg: cs('mood').backgroundColor, color: cs('@mood/div.row:1/h3.t-headline:1').color,
      token: cs('@mood/div.row:1/span.t-sub:1').color, accent: f.contentWindow.getComputedStyle(d.documentElement).getPropertyValue('--accent').trim(),
      hidden: cs('entry').visibility, nudge: cs('@main.content:1/div.card:1').translate,
      headline: document.querySelector('.headline').innerHTML, badge: [...document.querySelectorAll('.badge')].map((b) => b.textContent.trim()),
    };
  });
  t.ok(st.title === 'Good evening, Sam', 'text (kit chrome: nav:title)', st.title);
  t.ok(st.q === 'What made today good?' && st.size === '30px', 'text + font size (automatic id)', `${st.q} ${st.size}`);
  t.ok(st.bg === 'rgb(255, 232, 163)', 'background (hex)', st.bg);
  t.ok(st.color === 'rgb(224, 17, 95)', 'colour (hex)', st.color);
  t.ok(st.token && st.token !== 'rgb(0, 0, 0)', 'colour (kit token "accent")', `${st.token} (--accent ${st.accent})`);
  t.ok(st.hidden === 'hidden', 'hidden (visibility: nothing moves)');
  t.ok(st.nudge === '0px 24px', 'nudge (translate)', st.nudge);
  t.ok(st.headline.includes('Your week, <em>one page</em>'), 'copy edit: headline', st.headline);
  t.ok(st.badge.includes('Locked by default'), 'stage text edit: badge', st.badge.join(', '));
  const d1 = compare(tp.file('out/qa/edits/on/en/appstore/01.png'), tp.file('out/qa/edits/off/en/appstore/01.png'));
  t.ok(d1.over8 > 1, 'the edits show on the PNG', `${d1.over8}% of pixels changed`);

  console.log('2. the same edits in a raster capture');
  const cap = tp.run('screens', ['--platform', 'ios', '--screen', 'home', '--locale', 'en']).out;
  t.ok(!/warn: edits\.json/.test(cap), 'capture: no edit skipped');
  const before = path.join(path.dirname(tp.root), `${path.basename(tp.root)}-home.png`);
  fs.copyFileSync(tp.file('raw/ios/home.png'), before);
  tp.run('screens', ['--platform', 'ios', '--screen', 'home', '--locale', 'en', '--edits', '0']);
  const d2 = compare(before, tp.file('raw/ios/home.png'));
  fs.rmSync(before);
  t.ok(d2.over8 > 1, 'the capture shows the edits (vs --edits 0)', `${d2.over8}% of pixels changed`);
  tp.run('screens', ['--platform', 'ios', '--screen', 'home', '--locale', 'en']);

  console.log('3. copy edits per locale, and the store-policy scan');
  const es = await inFrame('engine/panel.html?config=studio.config.js&store=appstore&locale=es&panel=2', () => document.querySelector('.sub').textContent);
  t.ok(es === 'Descarga ahora y escribe.', 'an "es" sub edit shows in Spanish', es);
  const en = await inFrame('engine/panel.html?config=studio.config.js&store=appstore&locale=en&panel=2', () => document.querySelector('.sub').textContent);
  t.ok(/Prompts, photos and moods/.test(en), 'the English sub is unchanged', en);
  tp.write('edits.json', JSON.stringify({ ...EDITS, copy: { ...EDITS.copy, 3: { sub: { en: 'Download now, it is free.' } } } }, null, 2));
  const v = tp.run('validate', ['--out', 'out/qa/edits/on'], { allowFail: true }).out;
  t.ok(/"Download now": a call to action/i.test(v), 'validate scans the edited copy (a call to action)', (v.match(/.*a call to action.*/) || [''])[0].trim());

  console.log('4. a changed screen: re-anchored, or skipped with a warning');
  const html = tp.read('screens/home.html');
  const card = '<article class="card entry-row">\n    <div class="art thumb" data-art="forest" data-seed="4"></div>';
  t.ok(html.includes(card), 'the demo home screen has the second entry card');
  tp.write('edits.json', JSON.stringify({ version: 1, screens: { home: {
    '@main.content:1/article.card:2': { color: '#0A7B83', of: await fingerprintOf('@main.content:1/article.card:2') },
  } } }, null, 2));
  // a new card above it: its automatic id moves to article.card:3
  tp.write('screens/home.html', html.replace('<div class="section-head mt-xs">', '<article class="card entry-row"><div class="grow"><h4 class="entry-title">New on top</h4></div></article>\n  <div class="section-head mt-xs">'));
  let r = tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--out', 'out/qa/edits/anchor']).out;
  t.ok(/re-anchored to @main\.content:1\/article\.card:3/.test(r), 'an automatic id that moved is re-anchored (warn line)');
  const rep = JSON.parse(tp.read('out/qa/edits/anchor/render-report.json'));
  t.ok(JSON.stringify(rep).includes('re-anchored'), 'the warning is in render-report.json');
  // a twin of the target: two elements with that fingerprint -> skipped, never applied to the wrong one
  const firstRun = html.slice(html.indexOf(card), html.indexOf('</article>', html.indexOf(card)) + 10);
  tp.write('screens/home.html', html.replace('<div class="section-head mt-xs">', `${firstRun}\n  ${firstRun}\n  <div class="section-head mt-xs">`).replace(firstRun, ''));
  r = tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--out', 'out/qa/edits/twin']).out;
  t.ok(/no longer matches[^\n]*skipped/.test(r), 'an ambiguous twin is skipped (warn line)');
  const twin = await inFrame('engine/panel.html?config=studio.config.js&store=appstore&locale=en&panel=1', () => {
    const f = [...document.querySelectorAll('iframe.live-screen')].find((x) => x.dataset.screen === 'home');
    return [...f.contentDocument.querySelectorAll('article')].map((a) => f.contentWindow.getComputedStyle(a).color);
  });
  t.ok(!twin.includes('rgb(10, 123, 131)'), 'no element took the skipped edit', twin.join(' '));
  const v2 = tp.run('validate', ['--out', 'out/qa/edits/twin'], { allowFail: true }).out;
  t.ok(/edits\.json: home › @main\.content:1\/article\.card:2 no longer matches/.test(v2), 'validate lists the skipped edit');
  const c2 = tp.run('screens', ['--platform', 'ios', '--screen', 'home', '--locale', 'en']).out;
  t.ok(/warn: edits\.json/.test(c2) && tp.exists('raw/screens-report.json'), 'the capture warns and writes raw/screens-report.json');
  tp.write('screens/home.html', html);
  tp.run('screens', ['--platform', 'ios', '--screen', 'home', '--locale', 'en']);

  console.log('5. bake folds the copy edits');
  tp.write('edits.json', JSON.stringify(EDITS, null, 2));
  tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--out', 'out/qa/edits/prebake']);
  const b = tp.run('bake').out;
  t.ok(/copy panel 1 headline/.test(b) && /stage text: panel 1 element 4/.test(b), 'bake folds the headline, the sub and the badge', b.split('\n').filter((x) => /copy|stage/.test(x)).join(' | '));
  const cfgText = tp.read('studio.config.js');
  t.ok(cfgText.includes("en: 'Your week, <em>one page</em> at a time'") && cfgText.includes("en: 'Locked by default'"), 'the config holds the edited words');
  const left = JSON.parse(tp.read('edits.json'));
  t.ok(!left.copy && !left.stage && Object.keys(left.screens.home).length === 7, 'edits.json keeps only the screen edits');
  tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--out', 'out/qa/edits/postbake']);
  const d3 = compare(tp.file('out/qa/edits/prebake/en/appstore/01.png'), tp.file('out/qa/edits/postbake/en/appstore/01.png'));
  t.ok(sameish(d3), 'the render after bake is the same', JSON.stringify(d3));

  console.log('6. a language marked not updated');
  tp.write('edits.json', JSON.stringify({ version: 1, copy: { 2: { headline: { en: 'Write it all <em>down</em>' }, stale: { headline: ['es'] } } } }, null, 2));
  const v6 = tp.run('validate', ['--out', 'out/qa/edits/postbake'], { allowFail: true }).out;
  t.ok(/copy es\s+panel 2: headline was not retyped in "es"/.test(v6), 'validate warns about the stale language', (v6.match(/.*not retyped.*/) || [''])[0].trim());
  const b6 = tp.run('bake').out;
  const left6 = JSON.parse(tp.read('edits.json'));
  t.ok(/kept copy 2 stale marker/.test(b6) && JSON.stringify(left6.copy['2'].stale) === '{"headline":["es"]}' && !left6.copy['2'].headline,
    'bake folds the en headline and keeps the marker', JSON.stringify(left6.copy));
  t.done();
} finally {
  tp.rm();
}

// the fingerprint of a screen element, read from the kit (what Mockup Studio saves as "of")
async function fingerprintOf(eid) {
  const { openSession, capture } = await import(path.join(tp.root, 'scripts/lib/session.js'));
  const s = await openSession();
  try {
    await capture(s, 'screens/home.html?platform=ios&locale=en&edits=none', { width: 440, height: 956, dpr: 1, readyMode: 'auto' });
    return await s.page.evaluate((id) => window.kit.edit.layers().find((l) => l.eid === id).of, eid);
  } finally { await s.close(); }
}
