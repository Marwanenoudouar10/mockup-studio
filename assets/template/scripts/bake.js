// Bake: fold layout.json (positions from Mockup Studio, see scripts/lib/layout.js) and the copy edits of
// edits.json (headlines, subs, stage texts: scripts/lib/bake/copy.js) into studio.config.js, then empty what was
// folded. Comments, variants and formatting in the config are kept; only numbers and those texts change, and
// added elements are appended to their panel's stage (with their id, so nothing else shifts).
//   node scripts/bake.js [--dry] [--config studio.config.js]
// Safety: the patched config is imported and every element of every store, locale and panel must land
// exactly where it did before, with the same words; otherwise nothing is written. A backup goes to out/bake/.
// Entries bake cannot express (a computed value, a spread, a per-store radius, a store-variant headline) stay.
// Screen edits (edits.json "screens") always stay: the kit applies them on every capture and live screen.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseArgs, loadConfig, rel, fail } from './lib/cli.js';
import { keySet, panelsFor } from './lib/config.js';
import { layoutFile, FEATURE, cleanValues } from './lib/layout.js';
import { readConfig, prop } from './lib/bake/scan.js';
import { createEditor, stageArray, findElement } from './lib/bake/patch.js';
import { placements, texts, diff, loadPatched } from './lib/bake/verify.js';
import { foldCopy } from './lib/bake/copy.js';
import { editsFile } from './lib/edits.js';
import { applyCopy } from './lib/edit-copy.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

(async () => {
  const flags = parseArgs();
  const { cfg, tokens, rel: cfgRel } = await loadConfig(flags);
  const layoutRel = layoutFile(cfgRel);
  const layout = cfg.overrides || {};
  const abs = path.join(ROOT, cfgRel);
  const src = fs.readFileSync(abs, 'utf8');
  const root = readConfig(src);
  const keys = keySet(cfg);
  const ed = createEditor(src, keys);
  const left = {};
  const keepAdds = [];
  const done = [];
  const skip = (what, why) => console.log(`  kept in ${layoutRel}: ${what} (${why})`);
  const panelsNode = prop(root, 'panels');
  const featureNode = prop(root, 'feature');

  // the stage literal for a store key + panel, choosing a variant stage the way the engine would
  const stageOf = (S, panel) => {
    if (S === FEATURE) return featureNode && featureNode.value.kind === 'object' ? stageArray(featureNode.value, ['default']) : null;
    if (!panelsNode || panelsNode.value.kind !== 'array' || panelsNode.value.items.some((n) => n.kind === 'other')) return null;
    const pn = panelsNode.value.items[panel - 1];
    const p = cfg.panels[panel - 1];
    if (!pn || !p) return null;
    const st = S === '*' ? null : cfg.stores.find((s) => s.id === S);
    const candidates = st ? [st.id, st.screens, st.space, 'default'] : [p.space === 'any' ? 'portrait' : p.space, 'default'];
    return stageArray(pn, candidates);
  };

  // group by element literal: node -> { what, props: { k: { store: value } }, raw: { store: entry } }
  const groups = new Map();
  for (const [S, panels] of Object.entries(layout)) {
    if (S === 'add' || !panels || typeof panels !== 'object') continue;
    for (const [panel, els] of Object.entries(panels)) {
      for (const [id, raw] of Object.entries(els || {})) {
        const arr = stageOf(S, Number(panel));
        const node = arr && findElement(arr, id);
        if (!node) { skip(`${S} panel ${panel} element ${id}`, 'element not found in the config'); (((left[S] ||= {})[panel] ||= {})[id] = raw); continue; }
        if (!groups.has(node)) groups.set(node, { what: `panel ${panel} element ${id}`, panel, id, props: {}, raw: {} });
        const g = groups.get(node);
        g.raw[S] = raw;
        for (const [k, v] of Object.entries(cleanValues(raw))) (g.props[k] ||= {})[S] = v;
      }
    }
  }
  for (const [node, g] of groups) {
    const out = [];
    for (const [k, entries] of Object.entries(g.props)) {
      const ok = ed.setProp(node, k, entries);
      if (ok === true) { out.push(`${k} ${Object.entries(entries).map(([st, v]) => (st === '*' ? v : `${v} (${st})`)).join(' / ')}`); continue; }
      skip(`${g.what} ${k}`, ok);
      for (const [st, v] of Object.entries(entries)) {
        const keep = (((left[st] ||= {})[g.panel] ||= {})[g.id] ||= {});
        keep[k] = v;
        if (g.raw[st].of) keep.of = g.raw[st].of;
      }
    }
    if (out.length) done.push(`${g.what}: ${out.join(', ')}`);
  }
  for (const a of layout.add || []) {
    const { store = '*', panel, ...el } = a;
    const arr = stageOf(store === FEATURE ? FEATURE : '*', Number(panel));
    if (!arr) { skip(`added ${a.id}`, 'no plain stage array for that panel'); keepAdds.push(a); continue; }
    const body = ed.literal({ ...el, ...cleanValues(el) });
    ed.append(arr, store === '*' || store === FEATURE ? body : `{ ${/^[A-Za-z_$][\w$]*$/.test(store) ? store : `'${store}'`}: ${body} }`);
    done.push(`added ${a.id} (${el.type} ${el.screen || ''}) to panel ${panel}${store !== '*' ? ` (${store} only)` : ''}`);
  }
  if (keepAdds.length) left.add = keepAdds;
  const layoutDone = done.length;
  const editsRel = editsFile(cfgRel);
  const copy = foldCopy({ root, cfg, edits: cfg.edits, ed, src });
  done.push(...copy.done);

  if (!layoutDone && !copy.folded) {
    console.log(`bake: nothing to bake in ${layoutRel} or ${editsRel}${copy.done.length ? `\n  ${copy.done.join('\n  ')}` : ''}`);
    return;
  }
  const text = ed.apply();
  const after = await loadPatched(abs, text, tokens, Object.keys(left).length ? left : null);
  applyCopy(after, copy.left);
  const problems = [...diff(placements(cfg), placements(after)), ...diff(texts(cfg), texts(after))];
  if (problems.length) {
    console.log(problems.slice(0, 20).map((r) => `  mismatch ${r}`).join('\n'));
    throw new Error(`bake would move ${problems.length} element value(s) differently: nothing written`);
  }
  console.log(`bake (${cfgRel} + ${layoutRel} + ${editsRel})`);
  for (const d of done) console.log(`  ${d}`);
  if (flags.dry) {
    console.log('\n  --dry: nothing written (verified: every element lands where it did)\n');
    return;
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const backup = path.join(ROOT, 'out', 'bake', `${path.basename(cfgRel, '.js')}.${stamp}.js`);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, src);
  fs.writeFileSync(abs, text);
  if (layoutDone) fs.writeFileSync(path.join(ROOT, layoutRel), `${JSON.stringify(clone(left), null, 2)}\n`);
  if (copy.folded) fs.writeFileSync(path.join(ROOT, editsRel), `${JSON.stringify(copy.left, null, 2)}\n`);
  const n = panelsFor(cfg, cfg.stores[0]).length;
  const what = [layoutDone && `${layoutRel} ${Object.keys(left).length ? 'keeps the entries above' : 'is empty'}`,
    copy.folded && `${editsRel} keeps its screen edits${copy.left.copy || copy.left.stage ? ' and the copy above' : ''}`].filter(Boolean);
  console.log(`\n  verified and written: ${cfgRel} (backup ${rel(backup)}), ${what.join(', ')}`);
  console.log(`  ${n} panel(s) in ${cfg.stores[0].id}; re-render to check: npm run render -- --out out/qa/bake\n`);
})().catch(fail);
