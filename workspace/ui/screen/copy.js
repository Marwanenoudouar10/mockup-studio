// The inspector for an image's headline and sub line (both project types: the copy never depends on the screens).
// Their words in the current locale, as edits.json keeps them: the headline is HTML with <em> (the accent word) and
// <br>. Enter saves; a double-click on the image types them in place (ui/screen/text.js). "Back to
// studio.config.js" drops this locale's copy edits; `npm run bake` writes them into the config for good.
// A language whose words were not retyped after another language changed shows "not updated" and a "Keep as
// is" button (patches.js keepCopy); validate warns until one of the two happens.
import { state, selected } from '../state.js';
import { copyKey, copyOf, setCopy, resetCopy, staleOf, keepCopy } from './patches.js';
import { startCopy } from './text.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function copyHtml(f, panel) {
  const c = f.boxes && f.boxes.copies.find((x) => x.panel === panel);
  const parts = (c && c.parts) || {};
  const key = copyKey(f, panel);
  const loc = state.locale;
  const has = (k) => copyOf(key, k, loc) !== null;
  const stale = (k) => staleOf(key, k).includes(loc);
  const sec = (k, label, rows, ph) => `<div class="sec"><div class="sh"><span>${label}</span><small>${esc(loc)}${has(k) ? ' · edited' : ''}${stale(k) ? ' · <b>not updated</b>' : ''}</small></div>`
    + `<textarea data-ck="${k}" rows="${rows}" spellcheck="false" placeholder="${ph}">${esc(parts[k] ? parts[k].html : '')}</textarea>`
    + `${stale(k) ? `<div class="row2"><span>Another language changed: retype this one, or</span><button class="mini" data-cact="keep" data-field="${k}">Keep as is</button></div>` : ''}</div>`;
  const edited = has('headline') || has('sub');
  return `${sec('headline', 'Headline', 3, 'The headline')}${sec('sub', 'Sub line', 2, 'No sub line')}`
    + '<div class="row2"><button class="mini" data-cact="type">Edit on canvas</button><span><code>&lt;em&gt;</code> = accent · Enter saves</span></div>'
    + `${edited ? '<button class="btn" data-cact="reset">Back to studio.config.js</button>' : ''}`
    + `<div class="status">${edited ? 'Edited · <b>edits.json</b> (npm run bake writes it into the config)' : 'From <b>studio.config.js</b>'}</div>`;
}

function commit(t) {
  const { frame: f } = selected();
  const sel = state.selection;
  if (!f || !sel || sel.id !== 'copy' || t.value === t.defaultValue) return;
  setCopy(f, sel.panel, t.dataset.ck, t.value.replace(/\s*\n\s*/g, t.dataset.ck === 'headline' ? '<br>' : ' ').trim());
}

export function initCopyInspector(box) {
  box.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!t.matches('textarea[data-ck]')) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(t); t.blur(); }
    if (e.key === 'Escape') { t.value = t.defaultValue; t.blur(); }
  });
  box.addEventListener('focusout', (e) => { if (e.target.matches('textarea[data-ck]')) commit(e.target); });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cact]');
    const { frame: f } = selected();
    const sel = state.selection;
    if (!b || !f || !sel || sel.id !== 'copy') return;
    if (b.dataset.cact === 'reset') resetCopy(f, sel.panel);
    if (b.dataset.cact === 'keep') keepCopy(f, sel.panel, b.dataset.field);
    if (b.dataset.cact === 'type') startCopy(f, sel.panel, 'headline');
  });
}
