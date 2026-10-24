// One short message at the bottom right ("Saved position → layout.json"), red when something failed.
let el;
let timer;

export function toast(text, bad = false) {
  el = el || document.getElementById('toast');
  el.textContent = text;
  el.classList.toggle('bad', !!bad);
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), bad ? 5000 : 2600);
}
