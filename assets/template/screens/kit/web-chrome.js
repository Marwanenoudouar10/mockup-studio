// Desktop chrome for platform=web pages (web apps, dashboards, marketing sites), built from attributes:
//   <aside class="sidebar" data-logo="/brand/logo.svg" data-mark="/brand/mark.svg" data-cta="New entry:plus" data-on="1"
//          data-items="Today:sun,Journal:book:23,Insights:chart"            (Label:icon[:count])
//          data-groups="Collections:Travel|#F6A15C,Gratitude|#6CC08B"      (title:name|colour,...)
//          data-user="Sam Rivera|Free plan|SR">                             (children are kept, above the user)
//   <header class="topbar" data-title="Insights" data-subtitle="May 2026" data-search="Search entries"
//          data-actions="bell,share" data-avatar="SR">                      (children stay between search and actions)
//   <nav class="site-nav" data-logo="/brand/logo.svg" data-links="Product,Pricing,Blog" data-login="Log in" data-cta="Start free">
// Narrow viewports (&size=ipad|ios, the responsive captures): the sidebar turns into an icon rail with the mark
// (<= 1100 px), or a top bar with the logo and a menu button (<= 640 px). web-layout.css shows the right one.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ico = (name, extra = '') => `<i data-icon="${esc(name)}"${extra}></i>`;
const parts = (v, sep = ',') => String(v || '').split(sep).map((x) => x.trim()).filter(Boolean);
const logos = new Map();

async function logoHtml(src, kit) {
  const name = `<span class="wordmark">${esc((kit.brand && kit.brand.name) || document.title.split(/\s[-|]\s/)[0] || 'App')}</span>`;
  if (!src) return name;
  if (!logos.has(src)) {
    logos.set(src, fetch(new URL(src, location.href)).then((r) => (r.ok ? r.text() : '')).catch(() => ''));
  }
  const text = await logos.get(src);
  const svg = text.slice(text.indexOf('<svg'));
  if (!text.includes('<svg')) {
    console.warn(`kit: logo ${src} not found, using the brand name`);
    return name;
  }
  return svg.replace(/<script[\s\S]*?<\/script>/g, '');
}

function sideItem(spec, i, on) {
  const [label, icon = 'sparkle', count] = spec.split(':');
  return `<a class="side-item${i === on ? ' on' : ''}">${ico(icon, i === on ? ' data-filled' : '')}<span>${esc(label)}</span>`
    + `${count ? `<em>${esc(count)}</em>` : ''}</a>`;
}

async function sidebars(kit) {
  for (const side of document.querySelectorAll('.sidebar')) {
    const d = side.dataset;
    const on = Number(d.on || 0);
    const items = parts(d.items);
    const kids = [...side.childNodes];
    const mark = d.mark ? `<span class="mark">${await logoHtml(d.mark, kit)}</span>` : '';
    let html = `<div class="brand${mark ? ' has-mark' : ''}"><span class="full">${await logoHtml(d.logo, kit)}</span>${mark}</div>`;
    if (d.cta) {
      const [label, icon = 'plus'] = d.cta.split(':');
      html += `<button class="btn side-cta">${ico(icon)}<span>${esc(label)}</span></button>`;
    }
    html += `<nav class="side-nav">${items.map((it, i) => sideItem(it, i, on)).join('')}</nav>`;
    for (const g of parts(d.groups, ';')) {
      const [title, list] = [g.slice(0, g.indexOf(':')), g.slice(g.indexOf(':') + 1)];
      html += `<div class="side-group"><div class="side-label">${esc(title)}</div>${parts(list).map((x) => {
        const [n, c = 'var(--tint)'] = x.split('|');
        return `<a class="side-item"><i class="swatch" style="--c:${esc(c)}"></i><span>${esc(n)}</span></a>`;
      }).join('')}</div>`;
    }
    side.innerHTML = html;
    if (kids.length) {
      const slot = document.createElement('div');
      slot.className = 'side-extra';
      kids.forEach((k) => slot.appendChild(k));
      side.appendChild(slot);
    }
    if (d.user) {
      const [name, plan = '', initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2)] = d.user.split('|');
      side.insertAdjacentHTML('beforeend', `<div class="side-user"><div class="avatar s" translate="no">${esc(initials)}</div>`
        + `<div class="who"><b translate="no">${esc(name)}</b><small>${esc(plan)}</small></div>${ico('more')}</div>`);
    }
    // the phone layout: a top bar with the logo, search, avatar and a menu button (hidden on desktop)
    const app = side.closest('.app') || document.body;
    app.insertAdjacentHTML('afterbegin', `<div class="mobilebar"><div class="brand">${await logoHtml(d.logo, kit)}</div>`
      + `<span class="grow"></span>${ico('search')}${ico('menu')}</div>`);
  }
}

function topbars() {
  for (const bar of document.querySelectorAll('.topbar')) {
    const d = bar.dataset;
    const head = `<div class="tb-title">${d.title ? `<h1>${esc(d.title)}</h1>` : ''}${d.subtitle ? `<small>${esc(d.subtitle)}</small>` : ''}</div>`;
    const search = d.search ? `<div class="tb-search">${ico('search')}<span>${esc(d.search)}</span><kbd translate="no">⌘K</kbd></div>` : '';
    bar.insertAdjacentHTML('afterbegin', `${head}<span class="grow"></span>${search}`);
    const acts = parts(d.actions).map((a) => `<button class="ibtn">${ico(a)}</button>`).join('');
    bar.insertAdjacentHTML('beforeend', `${acts}${d.avatar ? `<div class="avatar s" translate="no">${esc(d.avatar)}</div>` : ''}`);
  }
}

async function siteNavs(kit) {
  for (const nav of document.querySelectorAll('.site-nav')) {
    const d = nav.dataset;
    const links = parts(d.links).map((l, i) => `<a${i === Number(d.on) ? ' class="on"' : ''}>${esc(l)}</a>`).join('');
    nav.innerHTML = `<div class="brand">${await logoHtml(d.logo, kit)}</div><div class="links">${links}</div>`
      + `<div class="nav-end">${d.login ? `<a class="login">${esc(d.login)}</a>` : ''}`
      + `${d.cta ? `<a class="btn small">${esc(d.cta)}</a>` : ''}</div>`;
  }
}

export async function buildWebChrome(kit) {
  await sidebars(kit);
  topbars();
  await siteNavs(kit);
}
