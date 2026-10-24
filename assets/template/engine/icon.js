// Draws the icon artwork at the requested size. alpha=1 keeps transparency (Play, 32-bit PNG);
// otherwise the page is filled with config.icon.background (App Store: no alpha allowed).
import { q, loadConfig, ready, fail, setPageSize } from './core/boot.js';
import { at } from './core/root.js';

async function main() {
  const cfg = await loadConfig();
  const size = Number(q.get('size') || 1024);
  setPageSize(size, size);
  if (q.get('alpha') !== '1') document.body.style.background = cfg.icon.background;
  const img = document.createElement('img');
  img.src = at(cfg.icon.src);
  img.alt = '';
  document.body.appendChild(img);
  await img.decode().catch(() => {
    throw new Error(`icon not found or not an image: ${cfg.icon.src}`);
  });
  ready();
}

main().catch(fail);
