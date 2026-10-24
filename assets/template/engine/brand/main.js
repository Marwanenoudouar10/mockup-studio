// Brand boards: loads the config (with brand tokens) and the view's data, renders the view, then
// reports its size (window.__size) and sets window.__ready for the capture.
import { q, loadConfig, ready, fail } from '../core/boot.js';
import { waitImages } from '../core/assets.js';
import { getJson } from './ui.js';

const VIEWS = ['palette', 'fonts', 'logos', 'board', 'asset'];

async function main() {
  const view = q.get('view') || 'board';
  if (!VIEWS.includes(view)) throw new Error(`unknown view "${view}" (${VIEWS.join(', ')})`);
  document.documentElement.classList.add(`bb-view-${view}`);
  const cfg = await loadConfig({ draft: true });
  const data = q.get('data') ? await getJson(q.get('data')) : {};
  const { render } = await import(`./views/${view}.js`);
  const size = await render(cfg, data);
  await document.fonts.ready;
  await waitImages();
  window.__size = size || { w: 1600, h: Math.ceil(document.documentElement.scrollHeight) };
  ready();
}

main().catch(fail);
