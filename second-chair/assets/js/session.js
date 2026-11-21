(function () {
'use strict';
// One listening session, shared by every device picture on the page.
// The Mac leads; the iPhone follows a beat later. Nothing here talks to a real device.

// Artwork lives beside this script: assets/art/<id>.webp (720 px, for StandBy and Continue Listening's big covers)
// and <id>-sm.webp (144 px, for every small one: menus, Lock Screen, Watch, Up Next).
const ART_BASE = (document.currentScript ? new URL('../art/', document.currentScript.src).href : 'assets/art/');

// Each record's colours are read from its cover by coloursFrom() in home.js, the same reading a song picked in
// "Try it with your own song" gets. They're written out here so the first paint is right and every browser agrees.
const RECORDS = [
  { id: 'low-sun', title: 'Low Sun', artist: 'Drift Hotel', album: 'Breakwater', duration: 214, bpm: 96,
    stage: '#b35638', ink: '#ffffff', glow: '#e3c4ba', wall: ['#472316', '#bc5b3b'] },
  { id: 'small-hours', title: 'Small Hours', artist: 'Fen Lights', album: 'Lit Windows', duration: 252, bpm: 72,
    stage: '#857152', ink: '#ffffff', glow: '#d0c7b9', wall: ['#352d21', '#8b7756'] },
  { id: 'rooftop-season', title: 'Rooftop Season', artist: 'Remy Saint', album: 'Daylight Savings', duration: 188, bpm: 99, feel: 'punchy',
    stage: '#dccbbc', ink: '#16120f', glow: '#ece5df', wall: ['#6b4f38', '#b59071'] },
  { id: 'ticket-hall', title: 'Ticket Hall', artist: 'Polly Atlas', album: 'Concourse', duration: 178, bpm: 122,
    stage: '#9a6e13', ink: '#ffffff', glow: '#e1c17f', wall: ['#3e2c08', '#a27314'] },
  { id: 'tidewater', title: 'Tidewater', artist: 'Brennan & Hale', album: 'Estuary', duration: 306, bpm: 68,
    stage: '#657c6b', ink: '#ffffff', glow: '#c5cec7', wall: ['#28322b', '#6a8270'] },
  { id: 'allotment', title: 'Allotment', artist: 'The Small Holdings', album: 'Seed Catalogue', duration: 197, bpm: 104,
    stage: '#aa662c', ink: '#ffffff', glow: '#e0c2a9', wall: ['#442912', '#b36b2e'] },
];

// Raise ART_V whenever a cover changes (and in the static src="…?v=" in the pages), so browsers fetch the new file
// at once rather than showing the one they cached for up to 10 minutes.
const ART_V = 2;
const artURL = (r, small) => r.art || `${ART_BASE}${r.id}${small ? '-sm' : ''}.webp?v=${ART_V}`;   // a song picked from Apple Music brings its own artwork
const BIG_ART = '.sb-art, .hand-art';   // the only places a cover is shown larger than 72 px
const artFor = (img, r) => artURL(r, !img.closest(BIG_ART));

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
    const src = artFor(img, r);
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
      for (const el of this.q('remaining')) el.textContent = `\u2212${fmt(r.duration - pos)}`;   // iOS and the Mac menu (0.3.9) both use a minus sign; was hyphen
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
