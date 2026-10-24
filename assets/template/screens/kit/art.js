// Photo stand-ins for mock screens: flat illustrated scenes as inline SVG (no stock photos, nothing to license).
//   <div class="art" data-art="dusk" style="height: 220px"></div>      scenes: SCENES below
//   data-seed="3" varies the random bits (trees, windows, toppings); the scene fills the box (cover).
// Add your own: SCENES.name = (id, rnd) => '<svg markup in a 400 x 300 box>'.
let count = 0;

function rng(seed) {
  let a = (Number(seed) || 1) * 2654435761;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lin = (id, stops, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="${y2}">${stops
  .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;

function pines(rnd, y, color, size, step) {
  let d = '';
  for (let x = -20; x < 420; x += step * (0.7 + rnd() * 0.6)) {
    const h = size * (0.7 + rnd() * 0.6);
    const w = h * 0.36;
    d += `M${x.toFixed(1)} ${(y - h).toFixed(1)}L${(x + w).toFixed(1)} ${y}L${(x - w).toFixed(1)} ${y}Z`;
  }
  return `<path d="${d}" fill="${color}"/><rect x="0" y="${y - 1}" width="400" height="${300 - y + 1}" fill="${color}"/>`;
}

export const SCENES = {
  dusk: (id) => `<defs>${lin(`${id}s`, [[0, '#4F43B8'], [0.34, '#A867B0'], [0.6, '#F0907F'], [0.8, '#FFC08A'], [1, '#FFDDA6']])}
    ${lin(`${id}w`, [[0, '#FFC890'], [0.35, '#E58C8C'], [1, '#3E3394']])}
    <radialGradient id="${id}g" cx="0.62" cy="0.6" r="0.36"><stop offset="0" stop-color="#FFF1D2" stop-opacity=".95"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="300" fill="url(#${id}s)"/><circle cx="250" cy="180" r="110" fill="url(#${id}g)"/>
    <circle cx="250" cy="170" r="25" fill="#FFF3D9"/>
    <path d="M0 172C60 156 110 166 160 170S262 156 322 166 382 162 400 168V300H0Z" fill="#A46AAE"/>
    <path d="M0 194C50 178 100 186 150 191S242 181 292 189 372 183 400 191V300H0Z" fill="#7350A3"/>
    <rect y="203" width="400" height="97" fill="url(#${id}w)"/>
    <g fill="#FFEBC8">${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${238 - i * 5 + (i % 2) * 8}" y="${210 + i * 9}" width="${30 + i * 6 - (i % 2) * 10}" height="2.4" rx="1.2" opacity="${0.9 - i * 0.13}"/>`).join('')}</g>
    <path d="M0 228C44 220 92 226 132 239C166 250 152 300 152 300H0Z" fill="#372A77"/>
    <path d="M400 236C362 228 322 234 292 248C268 260 282 300 282 300H400Z" fill="#30266C"/>
    <g fill="#271E5E"><ellipse cx="34" cy="204" rx="22" ry="30"/><ellipse cx="66" cy="214" rx="17" ry="22"/><ellipse cx="368" cy="214" rx="20" ry="27"/>
    <rect x="32" y="222" width="4" height="14"/><rect x="64" y="226" width="3" height="10"/><rect x="366" y="230" width="4" height="12"/></g>
    <path d="M128 92l7 5 7-5M150 104l5 4 5-4" fill="none" stroke="#4A3A8E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

  forest: (id, rnd) => `<defs>${lin(`${id}s`, [[0, '#D5EBE0'], [0.6, '#F3EBD6'], [1, '#F7E6CC']])}
    ${lin(`${id}m`, [[0, '#FFFFFF', 0], [1, '#FFFFFF', 0.7]])}</defs>
    <rect width="400" height="300" fill="url(#${id}s)"/><circle cx="292" cy="92" r="30" fill="#FFF7E6" opacity=".9"/>
    ${pines(rnd, 150, '#A8CDB8', 46, 20)}<rect y="120" width="400" height="40" fill="url(#${id}m)"/>
    ${pines(rnd, 196, '#7AB096', 58, 24)}<rect y="168" width="400" height="34" fill="url(#${id}m)" opacity=".7"/>
    ${pines(rnd, 246, '#4B8A71', 72, 28)}${pines(rnd, 300, '#2C6352', 92, 34)}`,

  sea: (id) => `<defs>${lin(`${id}s`, [[0, '#8FCBEB'], [0.7, '#F8DDC7'], [1, '#FCE6CF']])}
    ${lin(`${id}w`, [[0, '#4A9CC2'], [1, '#1B5A86']])}${lin(`${id}b`, [[0, '#F4DDB6'], [1, '#E9C995']])}</defs>
    <rect width="400" height="300" fill="url(#${id}s)"/><circle cx="118" cy="140" r="22" fill="#FFF6E4"/>
    <path d="M250 168c20-14 42-18 62-10 16-6 34-4 48 10z" fill="#6D9CB4"/>
    <rect y="166" width="400" height="134" fill="url(#${id}w)"/>
    <g fill="#E3F4FB" opacity=".75"><rect x="92" y="176" width="52" height="2.4" rx="1.2"/><rect x="104" y="186" width="30" height="2.4" rx="1.2"/>
    <rect x="40" y="206" width="38" height="2" rx="1"/><rect x="250" y="196" width="46" height="2" rx="1"/><rect x="300" y="222" width="34" height="2" rx="1"/></g>
    <path d="M0 252C70 236 140 244 210 256S330 270 400 250V300H0Z" fill="#FFFFFF" opacity=".55"/>
    <path d="M0 258C70 244 140 252 210 263S330 276 400 258V300H0Z" fill="url(#${id}b)"/>`,

  mountain: (id) => `<defs>${lin(`${id}s`, [[0, '#BFD3F2'], [0.75, '#F5E4DC'], [1, '#F9EADF']])}${lin(`${id}l`, [[0, '#9DB6DE'], [1, '#5B6FA8']])}</defs>
    <rect width="400" height="300" fill="url(#${id}s)"/>
    <path d="M-10 200L80 96l46 50 62-88 84 112 40-44 98 74V300H-10Z" fill="#A9B7DB"/>
    <path d="M188 58l26 32-14-6-12 14-12-10-14 8z" fill="#FFFFFF"/><path d="M80 96l18 22-10-4-10 9-9-7-9 5z" fill="#FFFFFF" opacity=".9"/>
    <path d="M-10 230L60 160l52 44 70-70 80 82 50-40 108 70V300H-10Z" fill="#6F80B6"/>
    <rect y="236" width="400" height="64" fill="url(#${id}l)"/>
    <path d="M0 236h400" stroke="#E7EEF9" stroke-opacity=".6" stroke-width="2"/>
    <g fill="#F0F5FC" opacity=".5"><rect x="150" y="252" width="60" height="2" rx="1"/><rect x="230" y="266" width="40" height="2" rx="1"/></g>`,

  city: (id, rnd) => {
    let back = '';
    let front = '';
    let lit = '';
    for (let x = -4; x < 404;) {
      const w = 22 + rnd() * 26;
      const h = 70 + rnd() * 110;
      back += `<rect x="${x.toFixed(1)}" y="${(240 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
      for (let wy = 250 - h; wy < 230; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 8) {
        if (rnd() < 0.3) lit += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="3.6" height="5" rx=".6"/>`;
      }
      x += w + 3;
    }
    for (let x = -10; x < 410;) {
      const w = 30 + rnd() * 40;
      const h = 30 + rnd() * 60;
      front += `<rect x="${x.toFixed(1)}" y="${(300 - h - 40).toFixed(1)}" width="${w.toFixed(1)}" height="${(h + 40).toFixed(1)}"/>`;
      x += w + 2;
    }
    return `<defs>${lin(`${id}s`, [[0, '#15183F'], [0.65, '#3B3170'], [1, '#7A4F86']])}</defs>
      <rect width="400" height="300" fill="url(#${id}s)"/><circle cx="312" cy="62" r="16" fill="#FFF2CF"/>
      <g fill="#FFFFFF" opacity=".7">${Array.from({ length: 22 }, () => `<circle cx="${(rnd() * 400).toFixed(0)}" cy="${(rnd() * 110).toFixed(0)}" r="${(0.6 + rnd()).toFixed(1)}"/>`).join('')}</g>
      <g fill="#2B2756">${back}</g><g fill="#FFD48A" opacity=".85">${lit}</g><g fill="#1B183D">${front}</g>`;
  },

  bloom: (id) => `<defs>${lin(`${id}s`, [[0, '#FBE7DD'], [1, '#F1DCEB']])}<filter id="${id}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>
    <rect width="400" height="300" fill="url(#${id}s)"/>
    <g filter="url(#${id}f)"><circle cx="110" cy="110" r="70" fill="#FFB49A"/><circle cx="270" cy="90" r="64" fill="#C9B6F2"/><circle cx="220" cy="220" r="80" fill="#FF9BB8" opacity=".8"/></g>
    <g transform="translate(200 150)">${[0, 60, 120, 180, 240, 300].map((r) => `<ellipse rx="22" ry="52" transform="rotate(${r}) translate(0 -46)" fill="#FFFFFF" opacity=".55"/>`).join('')}<circle r="18" fill="#FFD27A"/></g>`,

  map: (id) => `<rect width="400" height="300" fill="#EEF0EA"/>
    <path d="M250 -10C230 60 300 110 280 170S300 260 330 310H400V-10Z" fill="#BFDDF1"/>
    <path d="M20 40h120v90H20zM40 190h110v80H40z" fill="#CFE8C9"/>
    <g stroke="#FFFFFF" stroke-width="5" fill="none"><path d="M0 150h400M160 0v300M0 60h260M60 0v300M0 240h300M220 0l-30 300"/></g>
    <g stroke="#FFFFFF" stroke-width="12" fill="none" stroke-linecap="round"><path d="M-10 100C80 110 140 160 210 150S330 90 410 120"/></g>
    <g stroke="#F6D99A" stroke-width="7" fill="none" stroke-linecap="round"><path d="M-10 100C80 110 140 160 210 150S330 90 410 120"/></g>
    <path d="M70 230C90 180 130 200 160 150S200 90 240 70" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M70 230C90 180 130 200 160 150S200 90 240 70" fill="none" style="stroke: var(--tint)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="70" cy="230" r="8" fill="#fff"/><circle cx="70" cy="230" r="5" style="fill: var(--tint)"/>
    <circle cx="240" cy="70" r="11" style="fill: var(--tint)"/><circle cx="240" cy="70" r="4.5" fill="#fff"/>`,

  bowl: (id, rnd) => {
    const bits = [];
    const pick = (cols) => cols[Math.floor(rnd() * cols.length)];
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 78;
      const x = 200 + Math.cos(a) * r;
      const y = 150 + Math.sin(a) * r;
      const k = rnd();
      if (k < 0.4) bits.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="16" ry="8" transform="rotate(${(rnd() * 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${pick(['#7DBB6A', '#5EA05A', '#9CCB72'])}"/>`);
      else if (k < 0.7) bits.push(`<rect x="${(x - 12).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="24" height="14" rx="5" transform="rotate(${(rnd() * 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${pick(['#F59A7A', '#F7B08F', '#E9806A'])}"/>`);
      else bits.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(5 + rnd() * 5).toFixed(1)}" fill="${pick(['#F5C451', '#C9DC8A', '#E5533F', '#FFFFFF'])}"/>`);
    }
    return `<defs><radialGradient id="${id}t" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#F6EBDD"/><stop offset="1" stop-color="#E7D3BC"/></radialGradient></defs>
      <rect width="400" height="300" fill="url(#${id}t)"/><circle cx="206" cy="158" r="118" fill="#000" opacity=".08"/>
      <circle cx="200" cy="150" r="118" fill="#FFFFFF"/><circle cx="200" cy="150" r="100" fill="#F3EDE4"/>${bits.join('')}
      <g fill="#3B2E2A" opacity=".55">${Array.from({ length: 30 }, () => `<ellipse cx="${(200 + (rnd() - 0.5) * 150).toFixed(1)}" cy="${(150 + (rnd() - 0.5) * 150).toFixed(1)}" rx="1.4" ry=".8"/>`).join('')}</g>`;
  },
};

export function drawArt(root = document) {
  for (const node of root.querySelectorAll('[data-art]')) {
    const name = node.dataset.art;
    const scene = SCENES[name];
    if (!scene) {
      console.warn(`kit: unknown art "${name}" (known: ${Object.keys(SCENES).join(', ')})`);
      continue;
    }
    const id = `art${++count}`;
    const svg = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${scene(id, rng(node.dataset.seed || 7))}</svg>`;
    node.insertAdjacentHTML('afterbegin', svg);
    const el = node.firstElementChild;
    el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  }
}
