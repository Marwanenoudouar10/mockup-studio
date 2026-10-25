// Before the walk (these change the page, so scripts/vector.js prints the PDF first):
//   documents(doc)         the page and every same-origin iframe in it (live screens), depth first
//   materialize(doc, ctx)  ::before / ::after with content become real <span>s with every computed property
//                          copied (the dom-to-svg idea), so they are measured and drawn like any element; the
//                          grain texture (feTurbulence, which Figma cannot import) is left out and reported
//   neutralize(doc, orig)  every transform (transform, rotate, scale, translate) is recorded in `orig` and set to
//                          the identity translate(0px) !important, which keeps the containing block: boxes are then
//                          layout boxes, and walk.js re-applies each transform as a group matrix
//   embedImages(docs, ctx) every <img> and url() background -> a data: URI (an SVG file must stand alone)
const PSEUDO_OFF = '[data-vx-before]::before{content:none!important;display:none!important}'
  + '[data-vx-after]::after{content:none!important;display:none!important}';

export function documents(doc, list = []) {
  list.push(doc);
  for (const f of doc.querySelectorAll('iframe')) {
    try {
      if (f.contentDocument && f.contentDocument.body) documents(f.contentDocument, list);
    } catch { /* another origin: drawn as nothing */ }
  }
  return list;
}

export function materialize(doc, ctx) {
  const win = doc.defaultView;
  const style = doc.createElement('style');
  style.textContent = PSEUDO_OFF;
  doc.head.appendChild(style);
  const jobs = [];
  for (const el of [doc.body, ...doc.body.querySelectorAll('*')]) {
    if (['IMG', 'IFRAME', 'INPUT', 'BR', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el instanceof win.SVGElement) continue;
    for (const pseudo of ['::before', '::after']) {
      const ps = win.getComputedStyle(el, pseudo);
      if (!ps.content || ps.content === 'none' || ps.content === 'normal' || ps.display === 'none') continue;
      if (/feTurbulence/.test(ps.backgroundImage || '')) {
        ctx.omit('grain texture left out (feTurbulence: Figma cannot import it; the PDF keeps it)');
        jobs.push([el, pseudo, null]);
        continue;
      }
      const span = doc.createElement('span');
      const host = typeof el.className === 'string' && el.className ? el.className.split(' ')[0] : el.localName;
      span.dataset.vxPseudo = `${host}${pseudo.replace('::', '-')}`;
      for (let i = 0; i < ps.length; i++) span.style.setProperty(ps[i], ps.getPropertyValue(ps[i]));
      const m = /^"(.*)"$/.exec(ps.content);
      if (m) span.textContent = m[1].replace(/\\([0-9a-f]{1,6})\s?/gi, (x, c) => String.fromCodePoint(parseInt(c, 16)));
      else if (ps.content !== '""') ctx.warn(`a ${pseudo} with content ${ps.content.slice(0, 30)} is drawn without it`);
      jobs.push([el, pseudo, span]);
    }
  }
  for (const [el, pseudo, span] of jobs) {
    if (pseudo === '::before') { if (span) el.prepend(span); el.dataset.vxBefore = '1'; } else { if (span) el.append(span); el.dataset.vxAfter = '1'; }
  }
}

export function neutralize(doc, orig) {
  const win = doc.defaultView;
  const list = [];
  for (const el of doc.querySelectorAll('*')) {
    if (el instanceof win.SVGElement && el.localName !== 'svg') continue; // inside an svg: kept as SVG transforms
    const st = win.getComputedStyle(el);
    const has = st.transform !== 'none' || (st.rotate && st.rotate !== 'none') || (st.scale && st.scale !== 'none') || (st.translate && st.translate !== 'none');
    if (has) list.push([el, { transform: st.transform, transformOrigin: st.transformOrigin, rotate: st.rotate, scale: st.scale, translate: st.translate }]);
  }
  for (const [el, o] of list) {
    orig.set(el, o);
    for (const [p, v] of [['transform', 'translate(0px)'], ['rotate', 'none'], ['scale', 'none'], ['translate', 'none'], ['transition', 'none'], ['animation', 'none']]) {
      el.style.setProperty(p, v, 'important');
    }
  }
}

const toData = (blob) => new Promise((res) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = () => res(null);
  fr.readAsDataURL(blob);
});

export async function embedImages(docs, ctx) {
  const urls = new Set();
  for (const d of docs) {
    for (const img of d.querySelectorAll('img')) if (img.currentSrc) urls.add(img.currentSrc);
    for (const el of d.querySelectorAll('*')) {
      const bi = d.defaultView.getComputedStyle(el).backgroundImage;
      for (const m of String(bi).matchAll(/url\("?([^")]+)"?\)/g)) if (!/feTurbulence/.test(m[1])) urls.add(new URL(m[1], d.baseURI).href);
    }
  }
  await Promise.all([...urls].map(async (u) => {
    if (u.startsWith('data:')) { ctx.images.set(u, u); return; }
    const blob = await fetch(u).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    const data = blob && (await toData(blob));
    if (data) ctx.images.set(u, data);
    else ctx.warn(`image not embedded: ${u.slice(-60)}`);
  }));
}
