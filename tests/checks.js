// The render and brand checks that keep a set honest, on a temporary copy of the template, one Chrome at a time:
//   node tests/checks.js
// 1 strings left untranslated in a live screen and in a capture (render log, report, validate); chart labels
//   translated label by label when strings.json has no whole-string key
// 2 palette: a mid-tone seed's Drenched option is deepened until white type reads, and a failing option 1 gets a
//   next: hint; the tint reads both ways
// 3 a lifted card that dissolves into its field is a warning; a feature-graphic card in the cutoff zone too
// 4 the quick brand path: no logo -> the name as text + a warning, icons skipped; apply --logo wordmark -> logo,
//   mark, icon; an App Store-only config gets no Play icon (and an old one is stale)
import fs from 'node:fs';
import path from 'node:path';
import { tempProject, checker } from './lib/project.js';

const t = checker('render and brand checks');
const tp = tempProject('checks');
const conf = (name, body) => tp.write(`examples/${name}.config.js`, `import base from '../studio.config.js';\nexport default ${body};\n`);

try {
  if (!tp.exists('raw/ios/home.png')) tp.run('screens');

  console.log('1. untranslated strings');
  const strings = JSON.parse(tp.read('screens/strings.json'));
  for (const k of ['Recent', 'See all', 'M,T,W,T,F,S,S']) delete strings.es[k];
  Object.assign(strings.es, { M: 'L', T: 'M', W: 'X', F: 'V', S: 'S' });
  tp.write('screens/strings.json', JSON.stringify(strings, null, 2));
  const r1 = tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'es', '--out', 'out/qa/i18n']).out;
  t.ok(/screen "home" \(es\): 2 strings not translated: "Recent", "See all"/.test(r1), 'a live screen lists its untranslated strings', (r1.match(/.*not translated.*/) || [''])[0].trim().slice(0, 140));
  const v1 = tp.run('validate', ['--out', 'out/qa/i18n', '--locale', 'es'], { allowFail: true }).out;
  t.ok(/not translated: "Recent", "See all"/.test(v1), 'validate lists them');
  const c1 = tp.run('screens', ['--platform', 'ios', '--screen', 'home', '--locale', 'es']).out;
  t.ok(/warn: screen "home" \(es\): 2 strings not translated/.test(c1) && /not translated/.test(tp.read('raw/screens-report.json')), 'the capture warns and writes raw/screens-report.json');
  const { openSession, open } = await import(path.join(tp.root, 'scripts/lib/session.js'));
  const s = await openSession();
  try {
    await open(s, 'screens/insights.html?platform=ios&locale=es', { width: 440, height: 956, dpr: 1, readyMode: 'auto' });
    const labels = await s.page.evaluate(() => [...document.querySelectorAll('[data-chart="bars"] text')].map((x) => x.textContent)
      .filter((x) => x !== 'Mejor día').join(',')); // (the bubble over the best day: data-note)
    t.ok(labels.startsWith('L,M,X,M,V,S,S'), `chart labels translated one by one (${labels})`);
    const left = await s.page.evaluate(() => window.kit.untranslated());
    t.ok(!left.length, `no chart label left untranslated (${left.join(', ')})`);
  } finally { await s.close(); }

  console.log('2. palette');
  const { generate } = await import(path.join(tp.root, 'scripts/brand/lib/generate.js'));
  const { contrast } = await import(path.join(tp.root, 'scripts/brand/lib/color.js'));
  for (const seed of ['#2E9E6B', '#E4572E']) {
    const [o] = generate(seed, { mood: 'bold' });
    t.ok(o.deepened === seed && o.checks.every((c) => c.pass), `${seed}: Drenched deepened to ${o.colors.primary}, every check passes`);
    t.ok(contrast(o.ui.tint, o.colors.paper) >= 4.5 && contrast('#FFFFFF', o.ui.tint) >= 4.5, `${seed}: the tint reads on paper and under white`);
  }
  const [demo] = generate('#6C5CE7', { mood: 'warm' });
  t.ok(!demo.deepened && demo.colors.primary === '#6C5CE7', 'a seed white already reads on stays as it is');
  const pal = tp.run('brand', ['palette', '--seed', '#F5C518', '--mood', 'bold']).out;
  t.ok(/next: option 1 fails .*option [23].* every check/.test(pal), 'a failing option 1 gets a next: hint', (pal.match(/next: option.*/) || [''])[0].slice(0, 120));

  console.log('3. cards on the field');
  conf('dissolve', `{ ...base, brand: { ...base.brand, field: 'solid', colors: { ...base.brand.colors, primary: '#7A70E2' } },
  locales: ['en'], stores: ['appstore'], panels: [{ headline: 'A card that <em>vanishes</em>', stage: [
    { type: 'lift', screen: 'home', box: 'prompt', w: 900, x: 660, y: 500, z: 30 }] }],
  feature: { ...base.feature, stage: [{ type: 'lift', screen: 'insights', box: 'streak', w: 260, x: 800, y: 140, z: 30 }] } }`);
  const r3 = tp.run('render', ['--config', 'examples/dissolve.config.js']).out;
  t.ok(/lift "prompt" \(home\): its edge averages 1\.\d+:1 against the field/.test(r3), 'a card the colour of its field is a warning');
  const f3 = tp.run('feature', ['--config', 'examples/dissolve.config.js']).out;
  t.ok(/feature graphic: lift "streak" \(insights\) crosses the right cutoff zone/.test(f3), 'a feature-graphic card past x 872 is a warning');
  const r3b = tp.run('render', ['--store', 'appstore', '--locale', 'en', '--out', 'out/qa/fine']).out;
  t.ok(!/warn:/.test(r3b), 'the demo itself renders with no warning');

  console.log('4. the quick brand path, store icons');
  for (const f of ['brand/logo.svg', 'brand/mark.svg', 'brand/icon.svg']) fs.rmSync(tp.file(f), { force: true });
  const r4 = tp.run('render', ['--store', 'appstore', '--panel', '1', '--locale', 'en', '--out', 'out/qa/nologo']).out;
  t.ok(/logo brand\/logo\.svg not found: the name is set as text/.test(r4), 'no logo file: the name as text, and a warning');
  const i4 = tp.run('icons', ['--out', 'out/qa/nologo']).out;
  t.ok(/store icons skipped/.test(i4) && !tp.exists('out/qa/nologo/icons/appstore-1024.png'), 'no icon file: icons skipped with a warning, not an error');
  const a4 = tp.run('brand', ['apply', '--logo', 'wordmark']).out;
  t.ok(/wordmark\.svg \+ wordmark\.mark\.svg made from "Brimpage"/.test(a4) && /<text[^>]*textLength/.test(tp.read('brand/logo.svg')) && /<path d="M/.test(tp.read('brand/mark.svg')), 'apply --logo wordmark: a measured wordmark and an outlined initial');
  t.ok(/derived from brand\/mark\.svg/.test(a4) && tp.exists('brand/icon.svg'), 'the icon is derived from it');
  conf('apple', "{ ...base, stores: ['appstore', 'appstore-6.3'], feature: null }");
  tp.run('icons', ['--out', 'out/qa/nologo']);
  t.ok(tp.exists('out/qa/nologo/icons/playstore-512.png'), 'the demo (both stores) gets both icons');
  const i5 = tp.run('icons', ['--config', 'examples/apple.config.js', '--out', 'out/qa/apple']).out;
  t.ok(/appstore-1024/.test(i5) && !/playstore-512/.test(i5), 'an App Store-only config gets the App Store icon only');
  fs.mkdirSync(tp.file('out/qa/apple/icons'), { recursive: true });
  fs.copyFileSync(tp.file('out/qa/nologo/icons/playstore-512.png'), tp.file('out/qa/apple/icons/playstore-512.png'));
  const v5 = tp.run('validate', ['--config', 'examples/apple.config.js', '--out', 'out/qa/apple'], { allowFail: true }).out;
  t.ok(/icons\/playstore-512\.png\s+the config has no Google Play target: stale/.test(v5), 'a Play icon left in an App Store-only delivery is stale');
  t.done();
} finally {
  tp.rm();
}
