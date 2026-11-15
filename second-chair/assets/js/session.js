(function () {
'use strict';
// One listening session, shared by every device picture on the page.
// The Mac leads; the iPhone follows a beat later. Nothing here talks to a real device.

// Artwork lives beside this script: assets/art/<id>.svg
const ART_BASE = (document.currentScript ? new URL('../art/', document.currentScript.src).href : 'assets/art/');

const RECORDS = [
  { id: 'low-sun', title: 'Low Sun', artist: 'Hollow Coast', album: 'Breakwater', duration: 214, bpm: 96,
    stage: '#cc231d', ink: '#ffffff', glow: '#ffbfa3', wall: ['#4a0907', '#b81c17'] },
  { id: 'small-hours', title: 'Small Hours', artist: 'Fen Lights', album: 'Lit Windows', duration: 252, bpm: 72,
    stage: '#17214b', ink: '#ffffff', glow: '#f6bb48', wall: ['#070b22', '#22336f'] },
  { id: 'overcast', title: 'Overcast, Brightening', artist: 'Juniper Hall', album: 'Weather for Walking', duration: 231, bpm: 84,
    stage: '#cbd3c3', ink: '#16201a', glow: '#ffffff', wall: ['#3d4c40', '#8fa18e'] },
  { id: 'ticket-hall', title: 'Ticket Hall', artist: 'Polly Atlas', album: 'Concourse', duration: 178, bpm: 122,
    stage: '#e2a722', ink: '#1a1406', glow: '#fff3cc', wall: ['#2a1f06', '#b8861a'] },
  { id: 'tidewater', title: 'Tidewater', artist: 'Brennan & Hale', album: 'Estuary', duration: 306, bpm: 68,
    stage: '#0e5357', ink: '#ffffff', glow: '#8fd6c9', wall: ['#04282c', '#0f6a6c'] },
  { id: 'allotment', title: 'Allotment', artist: 'The Small Holdings', album: 'Seed Catalogue', duration: 197, bpm: 104,
    stage: '#3a6535', ink: '#ffffff', glow: '#f2a03f', wall: ['#142812', '#4c7f45'] },
];

const artURL = (r) => r.art || `${ART_BASE}${r.id}.svg`;   // a song picked from Apple Music brings its own artwork

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const now = () => performance.now();

const fmt = (s) => {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** The Mac's state. Positions are extrapolated from (base, t0), as the real apps do. */
class Session extends EventTarget {
  constructor({ index = 0, position = 0, playing = true, volume = 0.62 } = {}) {
    super();
    this.index = index; this.playing = playing; this.volume = volume;
    this.base = position; this.t0 = now();
  }
  get record() { return RECORDS[this.index]; }
  get position() {
    const p = this.playing ? this.base + (now() - this.t0) / 1000 : this.base;
    return Math.min(p, this.record.duration);
  }
  snapshot() {
    return { index: this.index, playing: this.playing, base: this.position, t0: now(), volume: this.volume };
  }
  // dir: which way the songs moved (1 forward, -1 back), so the artwork can turn the right way.
  #emit(kind, origin, dir = 1) { this.dispatchEvent(new CustomEvent('change', { detail: { kind, origin, dir, snap: this.snapshot() } })); }
  #anchor(p) { this.base = p; this.t0 = now(); }

  toggle(origin) { this.#anchor(this.position); this.playing = !this.playing; this.#emit('play', origin); }
  next(origin) { this.index = (this.index + 1) % RECORDS.length; this.#anchor(0); this.#emit('track', origin); }
  previous(origin) {
    // Like Music: past the first few seconds, Previous goes back to the start of the song.
    if (this.position > 3) { this.#anchor(0); this.#emit('seek', origin); return; }
    this.index = (this.index - 1 + RECORDS.length) % RECORDS.length; this.#anchor(0); this.#emit('track', origin, -1);
  }
  /** Straight to a song and a point in it, as one change (Continue on Mac). */
  goTo(index, seconds, origin) {
    const changed = index !== this.index;
    this.index = index; this.#anchor(Math.max(0, Math.min(seconds, this.record.duration - 1)));
    this.#emit(changed ? 'track' : 'seek', origin);
  }
  seek(seconds, origin) { this.#anchor(Math.max(0, Math.min(seconds, this.record.duration - 1))); this.#emit('seek', origin); }
  setVolume(v, origin) { this.volume = Math.max(0, Math.min(1, v)); this.#emit('volume', origin); }
  /** Called by the clock: when a song ends on the Mac, Music moves on by itself. */
  tick() { if (this.playing && this.position >= this.record.duration) { this.index = (this.index + 1) % RECORDS.length; this.#anchor(0); this.#emit('track', 'auto'); } }
}

/**
 * StandBy's artwork change: the cover turns on its vertical axis, as if on a pole.
 * The old one turns away until it's edge-on, the new one turns in from the other side.
 */
function spin(el, img, src, dir) {
  el.getAnimations().forEach((a) => a.finish());
  const turn = 90 * (dir < 0 ? -1 : 1);
  const away = el.animate([
    { transform: 'perspective(900px) rotateY(0deg)', filter: 'brightness(1)' },
    { transform: `perspective(900px) rotateY(${-turn}deg) scale(.94)`, filter: 'brightness(.55)' },
  ], { duration: 260, easing: 'cubic-bezier(.55,0,.9,.5)' });
  away.finished.then(() => {
    img.src = src;
    el.animate([
      { transform: `perspective(900px) rotateY(${turn}deg) scale(.94)`, filter: 'brightness(.55)' },
      { transform: 'perspective(900px) rotateY(0deg)', filter: 'brightness(1)' },
    ], { duration: 520, easing: 'cubic-bezier(.15,.55,.25,1)' });
  }, () => { img.src = src; });
}

/**
 * A device picture bound to the session. role 'mac' leads; role 'iphone' follows.
 * Elements inside the root use data-bind="title|artist|album|art|state|elapsed|remaining|progress|volume|toggle"
 * and data-cmd="previous|toggle|next" on buttons.
 */
class Surface {
  constructor(root, session, { role, onShow } = {}) {
    this.root = root; this.session = session; this.role = role; this.onShow = onShow;
    this.shown = null; this.timers = new Set(); this.visible = true; this.lastSecond = -1;
    this.q = (k) => root.querySelectorAll(`[data-bind="${k}"]`);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]'); if (!b || !root.contains(b)) return;
      const cmd = b.dataset.cmd;
      if (cmd === 'previous') session.previous(role);
      else if (cmd === 'next') session.next(role);
      else if (cmd === 'toggle') session.toggle(role);
    });
    session.addEventListener('change', (e) => this.#schedule(e.detail));
    this.#apply({ kind: 'init', snap: session.snapshot() }, true);
  }

  /** How long until this picture shows a change that started on `origin`. */
  #delay(origin) {
    if (reducedMotion.matches) return 0;
    const follow = 180, hop = 130;
    if (this.role === 'mac') return origin === 'iphone' ? hop : 0;      // a command has to reach the Mac first
    return origin === 'iphone' ? hop + follow - 40 : follow;            // the iPhone shows what the Mac sends back
  }

  #schedule(detail) {
    const t = setTimeout(() => { this.timers.delete(t); this.#apply(detail); }, this.#delay(detail.origin));
    this.timers.add(t);
  }

  #apply({ kind, snap, dir = 1 }, first = false) {
    const prev = this.shown; this.shown = snap;
    const r = RECORDS[snap.index];
    const trackChanged = !prev || prev.index !== snap.index;
    if (trackChanged) {
      for (const el of this.q('title')) el.textContent = r.title;
      for (const el of this.q('artist')) el.textContent = r.artist;
      for (const el of this.q('album')) el.textContent = r.album;
      for (const img of this.q('art')) this.#swapArt(img, r, first, dir);
      for (const el of this.q('label')) el.setAttribute('aria-label', el.dataset.labelTemplate.replace('{title}', r.title).replace('{artist}', r.artist));
    }
    for (const el of this.q('state')) el.textContent = snap.playing ? 'Playing' : 'Paused';
    for (const b of this.root.querySelectorAll('[data-cmd="toggle"]')) {
      b.dataset.state = snap.playing ? 'playing' : 'paused';
      b.setAttribute('aria-label', `${snap.playing ? 'Pause' : 'Play'}${b.dataset.where ? ` ${b.dataset.where}` : ''}`);
    }
    for (const el of this.q('volume')) el.style.setProperty('--p', snap.volume.toFixed(3));
    this.lastSecond = -1; this.paint();
    this.onShow?.(r, { kind, trackChanged, first, snap });
  }

  #swapArt(img, r, instant, dir = 1) {
    const src = artURL(r);
    if (instant || reducedMotion.matches || !img.getAttribute('src')) { img.src = src; img.alt = ''; return; }
    const pre = new Image(); pre.src = src;
    const ready = pre.decode ? pre.decode().catch(() => {}) : Promise.resolve();
    const spinner = img.closest('[data-swap="spin"]');
    if (spinner && spinner.animate) { ready.then(() => spin(spinner, img, src, dir)); return; }
    // Everywhere else: a quick dip, so the change reads as a change.
    img.classList.add('is-swapping');
    ready.then(() => setTimeout(() => { img.src = src; requestAnimationFrame(() => img.classList.remove('is-swapping')); }, 140));
  }


  /** Called every frame while visible: progress and times. */
  paint() {
    const s = this.shown; if (!s) return;
    const r = RECORDS[s.index];
    const pos = Math.min(r.duration, s.playing ? s.base + (now() - s.t0) / 1000 : s.base);
    const p = (pos / r.duration).toFixed(4);
    for (const el of this.q('progress')) el.style.setProperty('--p', p);
    const sec = Math.floor(pos);
    if (sec !== this.lastSecond) {
      this.lastSecond = sec;
      for (const el of this.q('elapsed')) el.textContent = fmt(pos);
      for (const el of this.q('remaining')) el.textContent = `${this.role === 'mac' ? '-' : '\u2212'}${fmt(r.duration - pos)}`;   // iOS uses a minus sign, the Mac menu a hyphen
      for (const el of this.q('seek')) { if (document.activeElement !== el) el.value = String(Math.round(pos)); el.max = String(r.duration); el.setAttribute('aria-valuetext', `${fmt(pos)} of ${fmt(r.duration)}`); }
    }
  }
}

/** One clock for the page: paints visible surfaces and lets songs end. */
function runClock(session, surfaces) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) { const s = surfaces.find((x) => x.root === e.target); if (s) s.visible = e.isIntersecting; }
  });
  for (const s of surfaces) io.observe(s.root);
  let last = 0;
  const frame = (t) => {
    if (t - last > 120) {               // ~8 fps is plenty for a progress bar and a clock
      last = t;
      session.tick();
      for (const s of surfaces) if (s.visible) s.paint();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Paints a record's colours onto an element as custom properties. */
function paintStage(el, r) {
  el.style.setProperty('--stage', r.stage);
  el.style.setProperty('--stage-ink', r.ink);
  el.style.setProperty('--stage-glow', r.glow);
  el.style.setProperty('--wall-a', r.wall[0]);
  el.style.setProperty('--wall-b', r.wall[1]);
  el.dataset.tone = r.ink === '#ffffff' ? 'dark' : 'light';
}

window.SecondChair = { RECORDS, artURL, reducedMotion, fmt, Session, Surface, runClock, paintStage };
})();
