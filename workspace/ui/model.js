// A project as the board sees it: its config (imported from the project itself, so the workspace always
// agrees with the engine), the rows of images per target, its captures, layout.json and notes.json.
import { api } from './api.js';

const pad2 = (n) => String(n).padStart(2, '0');
const cap = (s) => (/^[a-z][a-z]/.test(s) ? s.charAt(0).toUpperCase() + s.slice(1) : s); // phone -> Phone, iPhone stays

// the project's own config modules, normalised exactly as its pages do
async function readConfig(base) {
  const [{ normalize, panelsFor }, { withTokens }] = await Promise.all([
    import(`${base}scripts/lib/config.js`), import(`${base}scripts/lib/tokens.js`),
  ]);
  const raw = (await import(`${base}studio.config.js?t=${Date.now()}`)).default;
  const src = raw && raw.brand && raw.brand.tokens;
  const tokens = src ? await fetch(`${base}${String(src).replace(/^\/+/, '')}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
  return { cfg: normalize(withTokens(raw, tokens)), panelsFor };
}

function rowLabel(st) {
  const [title, meta] = String(st.label || st.id).split(/ [-·] /); // 'App Store · iPhone 6.9"' (older labels used ' - ')
  if (st.space === 'landscape') return { title, meta: st.id };
  return { title, meta: cap(meta || st.id) };
}

function groupOf(st) {
  if (st.space === 'landscape') return 'web';
  return st.platform === 'android' ? 'play' : 'appstore';
}

function buildRows(slug, cfg, panelsFor, info) {
  const base = `/p/${slug}/`;
  const cfgQ = 'config=studio.config.js';
  const rows = [];
  for (const st of cfg.stores) {
    let panels = panelsFor(cfg, st).map((p, i) => ({ id: p.id, n: i + 1 }));
    if (st.max === 1) panels = panels.slice(0, 1);
    if (!panels.length) continue;
    const [W, H] = st.size;
    const { title, meta } = rowLabel(st);
    const row = { id: st.id, group: groupOf(st), title, meta: `${meta} · ${W}×${H}`, frames: [] };
    const common = { store: st.id, platform: st.screens, space: st.space, editable: true, H };
    const page = (extra) => (locale) => `${base}engine/panel.html?${cfgQ}&store=${encodeURIComponent(st.id)}&locale=${encodeURIComponent(locale)}&${extra}`;
    if (st.panorama) {
      row.frames.push({ ...common, key: `${slug}|${st.id}|strip`, kind: 'strip', W: W * panels.length, slice: W,
        label: panels.map((p) => pad2(p.n)).join(' · '), panels, page: page('strip=1') });
    } else {
      for (const p of panels) {
        row.frames.push({ ...common, key: `${slug}|${st.id}|${p.n}`, kind: 'panel', W, label: pad2(p.n), panels: [p], page: page(`panel=${p.id}`) });
      }
    }
    rows.push(row);
  }
  // the board reads like the stores: each phone store's main size first (App Store, Google Play), then the
  // other sizes, then the web targets
  const lead = new Set(['appstore', 'play'].map((g) => rows.find((r) => r.group === g)).filter(Boolean));
  const rank = (r) => (lead.has(r) ? 0 : r.group === 'web' ? 2 : 1);
  rows.sort((a, b) => rank(a) - rank(b));
  // titles that repeat (two App Store sizes) get their size in the panel name
  for (const r of rows) {
    const first = rows.find((x) => x.title === r.title) === r;
    r.name = first ? r.title : `${r.title} ${r.meta.split(' · ')[0]}`;
  }
  if (cfg.feature) {
    const fg = { key: `${slug}|feature|1`, kind: 'feature', store: 'feature', platform: cfg.feature.platform || 'android', space: 'portrait',
      editable: true, W: 1024, H: 500, label: 'Feature graphic · 1024×500', panels: [{ id: 1, n: 1 }],
      page: (locale) => `${base}engine/feature.html?${cfgQ}&locale=${encodeURIComponent(locale)}` };
    const play = rows.find((r) => r.group === 'play');
    if (play) play.frames.push(fg);
    else rows.push({ id: 'feature', group: 'play', title: 'Google Play', name: 'Feature graphic', meta: 'Feature graphic · 1024×500', frames: [fg] });
  }
  const board = { key: `${slug}|brand|board`, store: 'brand', editable: false, panels: [], label: '' };
  if (info.board.live) {
    Object.assign(board, { kind: 'board', W: 1600, H: 1230,
      page: () => `${base}engine/brand/brand.html?view=board&${cfgQ}&data=${encodeURIComponent('out/brand/board/board.json')}` });
  } else if (info.board.png) {
    Object.assign(board, { kind: 'image', W: 1600, H: 1227, page: () => `${base}final/brand/brand-board.png` });
  } else {
    Object.assign(board, { kind: 'placeholder', W: 1600, H: 1000, text: 'No brand board yet: npm run brand -- board' });
  }
  board.key = `${slug}|brand|${board.kind}`;
  rows.push({ id: 'brand', group: 'brand', title: 'Brand board', name: 'Brand board', meta: info.board.live ? 'live' : info.board.png ? 'final/brand/brand-board.png' : 'not made yet', frames: [board] });
  return rows;
}

export async function loadProject(slug) {
  const base = `/p/${slug}/`;
  const [info, { cfg, panelsFor }] = await Promise.all([api.project(slug), readConfig(base)]);
  return {
    slug, base, cfg,
    name: cfg.brand.name,
    color: cfg.brand.colors.primary,
    locales: cfg.locales,
    defaultLocale: cfg.defaultLocale,
    rows: buildRows(slug, cfg, panelsFor, info),
    screens: info.screens,
    layout: info.layout || {},
    notes: info.notes || [],
  };
}

// the colour dot + brand name for the projects list, without building rows
export async function projectSummary(slug) {
  const { cfg } = await readConfig(`/p/${slug}/`);
  return { name: cfg.brand.name, color: cfg.brand.colors.primary };
}

// "App Store 01" for a frame + config panel id
export function panelName(project, frame, panelId) {
  if (!frame) return '';
  const row = project.rows.find((r) => r.frames.some((s) => s.key === frame.key));
  if (frame.kind === 'feature') return 'Feature graphic';
  const p = frame.panels.find((x) => x.id === panelId) || frame.panels[0];
  return `${row ? row.name : frame.store}${p ? ` ${pad2(p.n)}` : ''}`;
}

// a signature of the board's structure: rebuild the rows only when this changes
export const shape = (project) => JSON.stringify(project.rows.map((r) => [r.id, r.frames.map((f) => [f.key, f.kind, f.W, f.H])]));
