// One image on the board: a live iframe of the project's own engine page at its native size, scaled down.
//   load()    first time it comes near the screen (lazy)
//   reload()  double-buffered: the new page renders behind the old one and replaces it when ready,
//             so a live refresh never flashes and the selection stays
//   post()    messages for the page's edit bridge (engine/core/edit.js)
import { state, emit } from '../state.js';

let version = 0;
// the screen editing replies of the edit bridge (engine/core/edit-screen.js): handled by ui/screen/
const SCREEN = new Set(['layers', 'picked', 'text-commit', 'text-cancel', 'copy-commit', 'copy-cancel', 'text-started', 'copy-started']);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Frame {
  constructor(spec) {
    Object.assign(this, spec);
    this.iframe = null;
    this.next = null;
    this.boxes = null;
    this.ready = false;
    this.wanted = false;
    this.el = document.createElement('div');
    this.el.className = `frame kind-${spec.kind}`;
    this.el.dataset.key = spec.key;
    if (spec.kind === 'placeholder') {
      this.el.classList.add('placeholder');
      this.el.textContent = spec.text;
    } else {
      this.el.innerHTML = '<div class="wait">loading…</div><div class="err"></div>';
    }
  }

  // world placement: x, y, display width; s = display px per native px
  place(x, y, w) {
    Object.assign(this, { x, y, w, s: w / this.W, h: (w / this.W) * this.H });
    Object.assign(this.el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${this.h}px` });
    for (const f of [this.iframe, this.next]) if (f) this.size(f);
  }

  size(f) {
    Object.assign(f.style, { width: `${this.W}px`, height: `${this.H}px`, transform: `scale(${this.s})` });
  }

  url() {
    const u = this.page(state.locale);
    if (this.kind === 'image') return `${u}?v=${++version}`;
    return `${u}&edit=1&key=${encodeURIComponent(this.key)}&v=${++version}`;
  }

  load() {
    this.wanted = true;
    if (this.iframe || this.kind === 'placeholder') return;
    if (this.kind === 'image') {
      const img = new Image();
      img.alt = 'Brand board';
      img.onload = () => {
        this.H = (this.W * img.naturalHeight) / img.naturalWidth;
        this.ready = true;
        this.el.classList.add('ready');
        emit('resized', this);
      };
      img.src = this.url();
      this.iframe = img;
      this.el.prepend(img);
      return;
    }
    this.iframe = this.make();
    this.el.prepend(this.iframe);
  }

  make(cls) {
    const f = document.createElement('iframe');
    f.title = this.label || this.key;
    f.setAttribute('tabindex', '-1');
    if (cls) f.className = cls;
    this.size(f);
    f.src = this.url();
    return f;
  }

  reload() {
    if (!this.iframe || this.kind === 'placeholder') return;
    if (this.kind === 'image') {
      this.iframe.src = this.url();
      return;
    }
    if (this.next) this.next.remove();
    this.next = this.make('next');
    this.el.prepend(this.next);
    clearTimeout(this.swapTimer);
    this.swapTimer = setTimeout(() => this.swap(), 20000);
  }

  swap() {
    clearTimeout(this.swapTimer);
    if (!this.next) return;
    this.iframe.remove();
    this.iframe = this.next;
    this.iframe.classList.remove('next');
    this.next = null;
  }

  // m from the page: { ss: 'ready' | 'boxes' | 'error' }, source = the window that sent it
  receive(m, source) {
    const fromNext = this.next && source === this.next.contentWindow;
    const fromCur = this.iframe && source === this.iframe.contentWindow;
    if (!fromNext && !fromCur) return;
    if (SCREEN.has(m.ss)) {
      if (fromCur) emit('screen-msg', { frame: this, m, source });
      return;
    }
    if (m.ss === 'boxes') {
      if (fromNext) this.pendingBoxes = m;
      else { this.boxes = m; emit('boxes', this); }
      return;
    }
    if (fromNext) {
      this.swap();
      if (this.pendingBoxes) { this.boxes = this.pendingBoxes; this.pendingBoxes = null; emit('boxes', this); }
    }
    this.ready = true;
    this.el.classList.add('ready');
    this.el.classList.toggle('failed', m.ss === 'error');
    this.el.querySelector('.err').innerHTML = m.ss === 'error' ? esc(m.message) : '';
    if (m.ss === 'error') this.boxes = null;
    if (m.ss === 'ready' && m.size && this.kind === 'board' && Math.abs(m.size.h - this.H) > 2) {
      this.H = m.size.h;
      emit('resized', this);
    }
    emit('frame-ready', this);
  }

  post(msg) {
    const w = this.iframe && this.iframe.contentWindow;
    if (w && this.kind !== 'image') w.postMessage(msg, location.origin);
  }

  destroy() {
    clearTimeout(this.swapTimer);
    this.el.remove();
    if (this.labelEl) this.labelEl.remove();
  }
}
