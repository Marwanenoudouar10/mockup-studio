// The inspector in screen mode. No layer selected: the screen (platform, its edits, any edit the kit skipped).
// A layer: its words (current locale), text colour and fill (the screen's brand and kit tokens as swatches, or any
// colour), font size and weight, the dx / dy nudge, Hide / Show, Reset element, Reset screen. Every change goes to
// edits.json (ui/screen/patches.js) and shows at once in every image with that screen.
import { state, frames } from '../state.js';
import { panelName } from '../model.js';
import { toast } from '../panels/toast.js';
import { itemOf } from './enter.js';
import { startText } from './text.js';
import { editOf, screenEdits, setEdit, resetElement, resetScreen, preview, merged } from './patches.js';
import { labelOf, kindName, texty } from './names.js';

const TOKEN = /^[a-z][a-z0-9-]{0,40}$/;
const COLOR = /^(#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([\d.,%\s/]+\))$/i;
const LIMITS = { size: [6, 200], weight: [100, 900], dx: [-500, 500], dy: [-500, 500] };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kv = (k, v) => `<div class="kv"><span>${esc(k)}</span><b title="${esc(v)}">${esc(v)}</b></div>`;
const PLATFORMS = { ios: 'iOS', android: 'Android', ipad: 'iPad', web: 'Web', mac: 'Mac' };

const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
// any CSS colour (rgb(), color(srgb ..), oklab ..) -> #rrggbb, or null when transparent
export function toHex(css) {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a < 8 ? null : `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function swatches(k, tokens, value, computed) {
  const seen = new Set();
  const list = tokens.filter((t) => { const h = toHex(t.value); if (!h || seen.has(h)) return false; seen.add(h); return true; });
  const custom = value && !TOKEN.test(value) ? value : null;
  const cur = toHex(value ? (TOKEN.test(value) ? (tokens.find((t) => t.name === value) || {}).value || computed : value) : computed);
  const none = k === 'bg' ? `<button class="swatch none${value === 'none' ? ' on' : ''}" data-sact="${k}" data-v="none" title="none"></button>` : '';
  return `<div class="swatches">${none}${list.map((t) => `<button class="swatch${value === t.name ? ' on' : ''}" data-sact="${k}" data-v="${esc(t.name)}" title="${esc(t.name)}" style="--c:${esc(t.value)}"></button>`).join('')}`
    + `<label class="swatch pick${custom ? ' on' : ''}" title="Any colour"><input type="color" data-sk="${k}-pick" value="${esc((cur || '#000000').toLowerCase())}"></label></div>`
    + `<div class="cval"><i style="--c:${esc(cur || 'transparent')}"></i><input data-sk="${k}" value="${esc(value || '')}" placeholder="${esc(cur || 'none')}" spellcheck="false" aria-label="${k === 'bg' ? 'Fill' : 'Colour'}">`
    + `${value ? `<button data-sact="${k}" data-v="" title="Back to the screen's own">×</button>` : ''}</div>`;
}

const field = (k, label, v, ph) => `<label class="fld"><span>${label}</span><input data-sk="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph ?? '')}" inputmode="decimal" aria-label="${label}"></label>`;

function weights(v) {
  const opts = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => `<option value="${w}"${w === v ? ' selected' : ''}>${w}</option>`).join('');
  return `<label class="fld"><span>Weight</span><select data-sk="weight" aria-label="Weight">${opts}</select></label>`;
}

function resetAll(s) {
  const n = Object.keys(screenEdits(s.screen)).length;
  return `<button class="btn quiet" data-sact="reset-screen"${n ? '' : ' disabled'}>Reset screen${n ? ` · ${n} edit${n > 1 ? 's' : ''}` : ''}</button>`;
}

function screenHtml(s) {
  const f = frames.get(s.frame);
  const n = Object.keys(screenEdits(s.screen)).length;
  const issues = s.issues.map((i) => `<p>${esc(i.text)}</p>`).join('');
  return `<div class="h">Screen</div>${kv('Element', `${s.type} · ${s.screen}`)}${kv('Image', f ? panelName(state.project, f, s.panel) : '')}`
    + `${kv('Platform', `${PLATFORMS[s.platform] || s.platform || '…'} · ${s.locale || state.locale}`)}${kv('Edits', n ? `${n} in edits.json` : 'none yet')}`
    + `${issues ? `<div class="warn"><b>Skipped or moved edits</b>${issues}</div>` : ''}`
    + `<div class="help">Click a layer to select it · double-click a text to type it · drag or <kbd>←↑→↓</kbd> to nudge · <kbd>Esc</kbd> done</div>`
    + resetAll(s);
}

function layerHtml(s, it) {
  const e = editOf(s.screen, it.eid) || {};
  const issue = s.issues.find((i) => i.eid === it.eid);
  const text = texty(it) ? `<div class="sec"><div class="sh"><span>Text</span><small>${esc(state.locale)}${e.text && e.text[state.locale] !== undefined ? ' · edited' : ''}</small></div>`
    + `<textarea data-sk="text" rows="2" spellcheck="false">${esc(it.own)}</textarea>`
    + `<div class="row2"><button class="mini" data-sact="type">Edit on canvas</button><span>Enter saves</span></div></div>` : '';
  const type = texty(it) ? `<div class="sec"><div class="sh"><span>Type</span></div><div class="fields">${field('size', 'Size', e.size, Math.round(it.styles.size))}${weights(e.weight || it.styles.weight)}</div></div>` : '';
  return `<div class="lhead"><i class="k k-${it.kind}"></i><div><b>${esc(labelOf(it))}</b><small>${esc(kindName(it))} · ${esc(it.eid)}</small></div></div>${text}`
    + `<div class="sec"><div class="sh"><span>${texty(it) || it.kind === 'icon' ? 'Colour' : 'Content colour'}</span></div>${swatches('color', s.tokens, e.color, it.styles.color)}</div>`
    + `<div class="sec"><div class="sh"><span>Fill</span></div>${swatches('bg', s.tokens, e.bg, it.styles.bg)}</div>${type}`
    + `<div class="sec"><div class="sh"><span>Nudge</span><small>CSS px</small></div><div class="fields">${field('dx', 'dX', e.dx || 0)}${field('dy', 'dY', e.dy || 0)}</div></div>`
    + `<div class="acts"><button class="btn" data-sact="hide">${it.hidden ? 'Show' : 'Hide'}</button><button class="btn" data-sact="reset-el"${Object.keys(e).length ? '' : ' disabled'}>Reset element</button></div>`
    + `<div class="status">${Object.keys(e).length ? 'Edited · <b>edits.json</b>' : `As in <b>screens/${esc(s.screen)}.html</b>`}</div>`
    + `${issue ? `<div class="warn">${esc(issue.text)}</div>` : ''}${resetAll(s)}`;
}

export function paintScreen(box) {
  const s = state.screen;
  const it = itemOf(s.sel);
  box.innerHTML = it ? layerHtml(s, it) : screenHtml(s);
}

function commit(input) {
  const s = state.screen;
  const it = s && itemOf(s.sel);
  const k = input.dataset.sk;
  if (!it || input.value === input.defaultValue) return;
  const raw = input.value.trim();
  if (k === 'text') { setEdit(it, { text: raw.replace(/\s+/g, ' ') }, 'text'); return; }
  if (k === 'color' || k === 'bg') {
    if (raw && !TOKEN.test(raw) && !COLOR.test(raw)) { toast(`${raw}: use a token name (tint, accent …), #hex or rgb()`, true); input.value = input.defaultValue; return; }
    setEdit(it, { [k]: raw || null }, k === 'bg' ? 'fill' : 'colour');
    return;
  }
  if (LIMITS[k]) {
    const n = raw === '' ? null : Number(raw.replace(',', '.'));
    if (n !== null && !Number.isFinite(n)) { input.value = input.defaultValue; return; }
    const [lo, hi] = LIMITS[k];
    setEdit(it, { [k]: n === null ? null : Math.max(lo, Math.min(hi, Math.round(n * 100) / 100)) }, k === 'size' ? 'font size' : k);
  }
}

export function initScreenInspector(box) {
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sact]');
    const s = state.screen;
    if (!b || !s) return;
    const it = itemOf(s.sel);
    const act = b.dataset.sact;
    if (act === 'reset-screen') resetScreen();
    else if (!it) return;
    else if (act === 'color' || act === 'bg') {
      const cur = (editOf(s.screen, it.eid) || {})[act];
      const v = b.dataset.v || null;
      setEdit(it, { [act]: v === cur ? null : v }, act === 'bg' ? 'fill' : 'colour');
    } else if (act === 'hide') setEdit(it, { hidden: !it.hidden }, it.hidden ? 'show' : 'hide');
    else if (act === 'reset-el') resetElement(it);
    else if (act === 'type') startText(it.eid);
  });
  box.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!state.screen || !t.matches('[data-sk]')) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(t); t.blur(); }
    if (e.key === 'Escape') { t.value = t.defaultValue; t.blur(); }
  });
  box.addEventListener('focusout', (e) => { if (state.screen && e.target.matches('input[data-sk], textarea[data-sk]')) commit(e.target); });
  box.addEventListener('change', (e) => {
    const t = e.target;
    const s = state.screen;
    const it = s && itemOf(s.sel);
    if (!it) return;
    if (t.matches('select[data-sk="weight"]')) setEdit(it, { weight: Number(t.value) }, 'weight');
    const pick = /^(color|bg)-pick$/.exec(t.dataset.sk || '');
    if (pick) setEdit(it, { [pick[1]]: t.value.toUpperCase() }, pick[1] === 'bg' ? 'fill' : 'colour');
  });
  // the native colour picker previews while it is open; the change event saves
  box.addEventListener('input', (e) => {
    const pick = /^(color|bg)-pick$/.exec(e.target.dataset.sk || '');
    const s = state.screen;
    const it = pick && s && itemOf(s.sel);
    if (it) preview(s.screen, it.eid, merged(it, { [pick[1]]: e.target.value }), frames.get(s.frame));
  });
}
