// Test helpers on the workspace page: wait for frames, find an element's screen point, read an element's
// box inside a frame's own document (same origin), drag with the real mouse.
import { until } from './project.js';

export const framesReady = (page) => page.waitForFunction(() => window.__studio
  && [...window.__studio.frames.values()].filter((f) => f.iframe).length > 0
  && [...window.__studio.frames.values()].filter((f) => f.iframe).every((f) => f.ready && (!f.editable || f.boxes)), { timeout: 120000, polling: 100 });

// the frame key + element info for store/panel and a predicate on the element
export function find(page, store, panel, match) {
  return page.evaluate((s, p, m) => {
    const f = [...window.__studio.frames.values()].find((x) => x.store === s && x.panels.some((q) => q.id === p));
    if (!f || !f.boxes) return null;
    const el = f.boxes.elements.find((e) => e.panel === p && Object.entries(m).every(([k, v]) => String(e[k]) === String(v)));
    return el ? { key: f.key, id: el.id, values: el.values, rect: el.rect, map: el.map, s: f.s } : { key: f.key, frame: { x: f.x, y: f.y, w: f.w, h: f.h } };
  }, store, panel, match);
}

// screen (viewport) point of an element's centre, or of a fraction of a frame
export function point(page, key, at) {
  return page.evaluate((k, a) => {
    const { state, frames } = window.__studio;
    const f = frames.get(k);
    const c = document.getElementById('canvas').getBoundingClientRect();
    const wx = a.id != null ? f.x + f.boxes.elements.find((e) => String(e.id) === String(a.id) && e.panel === a.panel).rect.cx * f.s : f.x + a.fx * f.w;
    const wy = a.id != null ? f.y + f.boxes.elements.find((e) => String(e.id) === String(a.id) && e.panel === a.panel).rect.cy * f.s : f.y + a.fy * f.h;
    return { x: c.left + state.view.x + wx * state.view.z, y: c.top + state.view.y + wy * state.view.z };
  }, key, at);
}

// the element's rect inside the frame's page (CSS px of the page), straight from its DOM
export function rectInFrame(page, key, id) {
  return page.evaluate((k, i) => {
    const f = window.__studio.frames.get(k);
    const doc = f.iframe.contentDocument;
    const n = doc && doc.querySelector(`[data-el="${CSS.escape(String(i))}"]`);
    if (!n) return null;
    return { left: n.offsetLeft, top: n.offsetTop, w: n.offsetWidth };
  }, key, id);
}

export async function drag(page, from, to, steps = 12) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
  await page.mouse.up();
}

export const sel = (page) => page.evaluate(() => window.__studio.state.selection);

export async function clickButton(page, text) {
  const ok = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('#insp button')].find((x) => x.textContent.trim() === t && !x.disabled);
    if (b) b.click();
    return !!b;
  }, text);
  if (!ok) {
    const have = await page.evaluate(() => [...document.querySelectorAll('#insp button')].map((b) => `${b.textContent.trim()}${b.disabled ? ' (disabled)' : ''}`).join(' | '));
    const at = await page.evaluate(() => JSON.stringify(window.__studio.state.selection));
    throw new Error(`no enabled "${text}" button in the inspector (has: ${have}; selection ${at})`);
  }
}

export const waitFrameReload = (page, key, before) => until(() => page.evaluate((k, b) => {
  const f = window.__studio.frames.get(k);
  return f && f.iframe && f.iframe.src !== b && f.ready && !f.next;
}, key, before), `frame ${key} to reload`, 10000);

export const frameSrc = (page, key) => page.evaluate((k) => window.__studio.frames.get(k).iframe.src, key);
