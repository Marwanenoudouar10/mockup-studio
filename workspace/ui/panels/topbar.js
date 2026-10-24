// Top bar: Projects / <name>, the target tabs (All · App Store · Google Play · Web · Brand), the locale
// picker and the live indicator (green while the server streams file changes).
import { state, on, emit } from '../state.js';

const TABS = [['all', 'All'], ['appstore', 'App Store'], ['play', 'Google Play'], ['web', 'Web'], ['brand', 'Brand']];
let els;

function render() {
  const p = state.project;
  els.crumb.textContent = p ? p.name : '…';
  document.title = p ? `${p.name} · Store Studio` : 'Store Studio';
  const groups = new Set(p ? p.rows.map((r) => r.group) : []);
  els.tabs.innerHTML = TABS.map(([id, label]) => `<button class="tab${state.tab === id ? ' on' : ''}" data-tab="${id}"${id === 'all' || groups.has(id) ? '' : ' disabled'}>${label}</button>`).join('');
  els.locale.innerHTML = (p ? p.locales : []).map((l) => `<option value="${l}"${l === state.locale ? ' selected' : ''}>${l}</option>`).join('');
}

export function setLive(on2) {
  state.live = on2;
  els.live.classList.toggle('on', on2);
  els.live.textContent = on2 ? 'Live — watching files' : 'Offline — reconnecting…';
}

export function pulse() {
  els.live.classList.remove('pulse');
  void els.live.offsetWidth; // restart the animation
  els.live.classList.add('pulse');
}

export function initTopbar(e) {
  els = e;
  els.tabs.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tab]');
    if (!b || b.disabled || b.dataset.tab === state.tab) return;
    state.tab = b.dataset.tab;
    render();
    emit('tab', state.tab);
  });
  els.locale.addEventListener('change', () => {
    state.locale = els.locale.value;
    emit('locale', state.locale);
  });
  on('project', render);
}
