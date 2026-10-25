// System chrome for mock screens, built from a few attributes so one HTML file renders as a real
// iOS screen and a real Android screen:
//   <body data-status="light|none" data-indicator="none">               white status glyphs / hide chrome
//   <header class="navbar" data-title="Insights" data-large data-subtitle="May 14" data-back | data-close
//           (data-large="ios": large title on iOS only, the small top app bar on Android)
//           data-actions="search,more" data-avatar="SM" data-done="Save">  (children are kept, after the bar)
//   <nav class="tabbar" data-tabs="Today:sun,Journal:book,Insights:chart,You:person" data-on="0" data-accessory="search">
//   <button class="fab"><i data-icon="edit"></i><span class="label">New entry</span></button>
//   <div class="toolbar"> icons </div>    (iOS: glass capsule; Android: floating toolbar)
// iOS 26: glass circle buttons, large title under the bar, floating glass tab bar, the FAB joins the tab bar
// as a prominent circle. Android: 48dp icon buttons, title left, navigation bar with a pill, extended FAB.
import { STATUS } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ico = (name, extra = '') => `<i data-icon="${esc(name)}"${extra}></i>`;

function statusBar(kit) {
  const mode = document.body.dataset.status;
  if (mode === 'none' || document.querySelector('.statusbar')) return;
  const time = document.body.dataset.time || (kit.family === 'android' ? '12:00' : '9:41');
  const bar = document.createElement('div');
  bar.className = `statusbar${mode === 'light' ? ' light' : ''}`;
  bar.innerHTML = `<span class="time">${esc(time)}</span><span class="sys">${STATUS[kit.family]}</span>`;
  document.body.prepend(bar);
}

// data-large (any platform) or data-large="ios" / "android" -> '' when large, undefined when not
const isLarge = (v, family) => (v !== undefined && (v === '' || v.split(/[\s,]+/).includes(family)) ? '' : undefined);

function avatarHtml(v) {
  return /^[a-z]+:/.test(v) ? `<div class="avatar"><div class="art" data-art="${esc(v.split(':')[1])}"></div></div>` : `<div class="avatar" translate="no">${esc(v)}</div>`; // initials: a name
}

function navIos(h, d) {
  d = { ...d, large: isLarge(d.large, 'ios') };
  const lead = d.back !== undefined ? 'back' : d.close !== undefined ? 'close' : null;
  const actions = (d.actions || '').split(',').map((s) => s.trim()).filter(Boolean);
  let bar = lead ? `<button class="gbtn glass">${ico(lead)}</button>` : '';
  bar += '<div class="spacer"></div>';
  if (d.large === undefined && d.title) bar += `<div class="inline-title">${esc(d.title)}${d.subtitle ? `<small>${esc(d.subtitle)}</small>` : ''}</div>`;
  if (actions.length) bar += `<div class="gbtn glass">${actions.map((a) => ico(a)).join('')}</div>`;
  if (d.avatar) bar += avatarHtml(d.avatar);
  if (d.done !== undefined) bar += `<button class="gbtn prominent">${ico('check')}</button>`;
  let head = `<div class="bar">${bar}</div>`;
  if (d.large !== undefined) head += `${d.subtitle ? `<div class="overline">${esc(d.subtitle)}</div>` : ''}<h1>${esc(d.title || '')}</h1>`;
  return head;
}

function navAndroid(h, d) {
  d = { ...d, large: isLarge(d.large, 'android') };
  const lead = d.back !== undefined ? 'back' : d.close !== undefined ? 'close' : null;
  const actions = (d.actions || '').split(',').map((s) => s.trim()).filter(Boolean);
  let bar = lead ? `<button class="ibtn">${ico(lead)}</button>` : '';
  if (d.large === undefined && d.title) bar += `<div class="inline-title">${esc(d.title)}${d.subtitle ? `<small>${esc(d.subtitle)}</small>` : ''}</div>`;
  else bar += '<div class="spacer"></div>';
  bar += actions.map((a) => `<button class="ibtn">${ico(a)}</button>`).join('');
  if (d.avatar) bar += `<div class="ibtn">${avatarHtml(d.avatar)}</div>`;
  if (d.done !== undefined) bar += `<button class="btn small done">${esc(d.done || 'Save')}</button>`;
  let head = `<div class="bar">${bar}</div>`;
  if (d.large !== undefined) head += `<div class="head"><h1>${esc(d.title || '')}</h1>${d.subtitle ? `<div class="overline">${esc(d.subtitle)}</div>` : ''}</div>`;
  return head;
}

function navBars(kit) {
  for (const h of document.querySelectorAll('.navbar')) {
    h.insertAdjacentHTML('afterbegin', kit.family === 'android' ? navAndroid(h, h.dataset) : navIos(h, h.dataset));
    // a small (inline-title) bar: ios.css gives the content under it some air below the glass buttons
    if (isLarge(h.dataset.large, kit.family) === undefined) h.classList.add('inline');
  }
}

function tabBars(kit) {
  const fab = document.querySelector('.fab');
  for (const nav of document.querySelectorAll('.tabbar[data-tabs]')) {
    const on = Number(nav.dataset.on || 0);
    const tabs = nav.dataset.tabs.split(',').map((t) => t.trim().split(':'));
    if (kit.family === 'android') {
      nav.innerHTML = tabs.map(([label, name], i) => `<div class="tab${i === on ? ' on' : ''}"><span class="ind">${ico(name || 'sparkle', i === on ? ' data-filled' : '')}</span><span>${esc(label)}</span></div>`).join('');
      continue;
    }
    let html = `<div class="tabs glass">${tabs.map(([label, name], i) => `<div class="tab${i === on ? ' on' : ''}">${ico(name || 'sparkle', ' data-filled')}<span>${esc(label)}</span></div>`).join('')}</div>`;
    if (fab) {
      const icon = fab.querySelector('[data-icon]');
      html += `<div class="accessory prominent">${ico(icon ? icon.dataset.icon : 'plus')}</div>`;
      fab.remove();
    } else if (nav.dataset.accessory) {
      html += `<div class="accessory glass">${ico(nav.dataset.accessory)}</div>`;
    }
    nav.innerHTML = html;
  }
}

function extras(kit) {
  const body = document.body;
  if (kit.family === 'ios') {
    for (const t of document.querySelectorAll('.toolbar')) t.classList.add('glass');
    if (document.querySelector('.tabbar, .toolbar') && body.dataset.edge !== 'none') body.insertAdjacentHTML('beforeend', '<div class="edge-bottom"></div>');
  }
  const fab = document.querySelector('.fab');
  if (fab && !fab.querySelector('.label')) fab.classList.add('solo');
  if (body.dataset.indicator !== 'none') body.insertAdjacentHTML('beforeend', '<div class="indicator"></div>');
}

// Android-only details the HTML does not spell out: checks in selected chips / segments / switches.
function touches(kit) {
  if (kit.family !== 'android') return;
  for (const s of document.querySelectorAll('.segmented > span.on')) if (!s.querySelector('[data-icon]')) s.insertAdjacentHTML('afterbegin', ico('check'));
  for (const c of document.querySelectorAll('.chip.on:not(.no-check)')) if (!c.querySelector('[data-icon]')) c.insertAdjacentHTML('afterbegin', ico('check'));
  for (const w of document.querySelectorAll('.switch.on')) if (!w.querySelector('[data-icon]')) w.innerHTML = ico('check', ' data-weight="3"');
}

export function buildChrome(kit) {
  statusBar(kit);
  navBars(kit);
  tabBars(kit);
  extras(kit);
  touches(kit);
}
