// Test helpers for screen mode (editable projects): wait for the entered screen, find a layer's point on the page,
// read an element of a live screen straight from the frame's DOM (same origin), click an inspector control.
import { until } from './project.js';

export const screenReady = (page) => page.waitForFunction(() => {
  const s = window.__studio.state.screen;
  return s && s.items.length > 0 && s.zoomed;
}, { timeout: 20000, polling: 50 });

export const screenState = (page) => page.evaluate(() => {
  const s = window.__studio.state.screen;
  return s ? { screen: s.screen, sel: s.sel, typing: s.typing, n: s.items.length, frame: s.frame } : null;
});

// the viewport point of a layer's centre (dy: a share of its height from the centre)
export function layerPoint(page, eid, dy = 0) {
  return page.evaluate((id, k) => {
    const { state, frames } = window.__studio;
    const s = state.screen;
    const f = frames.get(s.frame);
    const it = s.items.find((i) => i.eid === id);
    if (!it) return null;
    const c = document.getElementById('canvas').getBoundingClientRect();
    return { x: c.left + state.view.x + (f.x + it.rect.cx * f.s) * state.view.z, y: c.top + state.view.y + (f.y + (it.rect.cy + it.rect.h * k) * f.s) * state.view.z };
  }, eid, dy);
}

// an element of the n-th live screen `screen` in a frame: its words and computed styles
export function screenDom(page, key, screen, eid, n = 0) {
  return page.evaluate((k, name, id, i) => {
    const f = window.__studio.frames.get(k);
    const live = [...f.iframe.contentDocument.querySelectorAll('iframe.live-screen')].filter((x) => x.dataset.screen === name)[i];
    const doc = live && live.contentDocument;
    const el = doc && [...doc.querySelectorAll('[data-eid]')].find((x) => x.dataset.eid === id);
    if (!el) return null;
    const cs = live.contentWindow.getComputedStyle(el);
    return { text: el.textContent.trim(), color: cs.color, visibility: cs.visibility, translate: cs.translate, size: cs.fontSize,
      accent: live.contentWindow.getComputedStyle(doc.documentElement).getPropertyValue('--accent').trim() };
  }, key, screen, eid, n);
}

export async function selectLayer(page, eid) {
  await page.evaluate((id) => {
    const b = document.querySelector(`#layers .slayer[data-eid="${CSS.escape(id)}"]`);
    if (b) b.click();
  }, eid);
  return until(async () => (await screenState(page)).sel === eid, `layer ${eid} selected`);
}

// an inspector control by CSS selector (must exist and be enabled)
export async function clickIn(page, css) {
  const ok = await page.evaluate((q) => {
    const b = document.querySelector(`#insp ${q}`);
    if (b && !b.disabled) b.click();
    return !!(b && !b.disabled);
  }, css);
  if (!ok) throw new Error(`no enabled ${css} in the inspector`);
}

// set an inspector field and press Enter
export async function typeIn(page, css, value) {
  const found = await page.evaluate((q, v) => {
    const i = document.querySelector(`#insp ${q}`);
    if (!i) return `${JSON.stringify(window.__studio.state.selection)} ${document.getElementById('insp').textContent.slice(0, 200)}`;
    i.focus();
    i.value = v;
    return null;
  }, css, value);
  if (found) throw new Error(`no ${css} in the inspector (selection ${found})`);
  await page.keyboard.press('Enter');
}

export const toastText = (page) => page.evaluate(() => document.getElementById('toast').textContent);
