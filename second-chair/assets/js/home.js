(function () {
'use strict';
if (!window.SecondChair) return;
const { RECORDS, Session, Surface, runClock, paintStage, artURL, fmt, reducedMotion } = window.SecondChair;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const stage = $('#stage');
const announce = $('#announce');
const say = (text) => { announce.textContent = ''; requestAnimationFrame(() => { announce.textContent = text; }); };

// The first record has 10 seconds left, so the visitor sees the Mac move on by itself and the iPhone follow.
// With reduced motion, nothing plays until asked. (index.html's static times show the same moment: 3:24, −0:10.)
const FIRST_SONG_LEFT = 10;
const session = new Session({ index: 0, position: RECORDS[0].duration - FIRST_SONG_LEFT, playing: !reducedMotion.matches });

// The page wears the colour of whatever the iPhone in the hero is showing.
paintStage(stage, RECORDS[0]);

const surfaces = [];
for (const el of $$('[data-surface="mac"]')) surfaces.push(new Surface(el, session, { role: 'mac' }));
for (const el of $$('[data-surface="iphone"]')) {
  const inHero = !!el.closest('.hero');
  surfaces.push(new Surface(el, session, {
    role: 'iphone',
    onShow: (r, { trackChanged }) => {
      if (!trackChanged) return;
      paintStage(el, r);                                  // the screen's own wallpaper
      if (inHero && el.offsetParent !== null) {           // the visible hero phone sets the room
        paintStage(stage, r);
        document.querySelector('meta[name="theme-color"]').content = r.stage;
      }
    },
  }));
}

// Let a visitor's own presses be heard; the automatic song change is announced once, gently.
session.addEventListener('change', ({ detail: { kind, origin } }) => {
  const r = session.record;
  if (origin === 'auto') return;                      // songs ending by themselves aren't announced
  if (kind === 'track') say(`Now playing ${r.title} by ${r.artist}, on the Mac and the iPhone.`);
  else if (kind === 'play') say(session.playing ? 'Playing on the Mac.' : 'Paused on the Mac.');
});

// A command from the iPhone lands on the Mac: light the menu briefly.
session.addEventListener('change', ({ detail: { origin } }) => {
  if (origin !== 'iphone' || reducedMotion.matches) return;
  setTimeout(() => {
    for (const m of $$('.mac-menu')) { m.classList.add('is-hit'); setTimeout(() => m.classList.remove('is-hit'), 420); }
  }, 130);
});

// ---------- Scrub and volume, from the Lock Screen in section 2 ----------
for (const input of $$('.scrub-input')) {
  input.addEventListener('input', () => {
    const r = session.record;
    const bar = input.parentElement.querySelector('[data-bind="progress"]');
    bar.style.setProperty('--p', (input.value / r.duration).toFixed(4));
  });
  input.addEventListener('change', () => session.seek(Number(input.value), 'iphone'));
}
for (const input of $$('.vol-input')) {
  input.addEventListener('input', () => session.setVolume(Number(input.value) / 100, 'iphone'));
}

runClock(session, surfaces);

// A preview playing on the page (see Try it with your own song) lends its real spectrum to the sound bars.
const live = { analyser: null, data: null, ctx: null, on: false };
// Where a picked song's sound is: on the Mac (the demo's session) or, after Continue on iPhone, the iPhone.
// The song search fills in sync(); Continue Listening fills in phone, and hands the sound across.
const sound = { phone: null, hold: 0, sync: () => {}, heard: () => null };

// ---------- The sound, in the room ----------
// While Music plays on the Mac, a quiet row of sound bars moves along the bottom of the stage, in time with
// the song (each record has a tempo): the low end pulses on the beat, the rest shimmers. Pause, and the bars
// settle to a flat line. With Reduce Motion, a still row while playing. One canvas, drawn only while on screen.
(function soundInTheRoom() {
  if (!stage) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'sound';
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const still = reducedMotion.matches;
  let w = 0, h = 0, dpr = 1, n = 0, pitch = 8, barW = 3, maxH = 100;
  let level = new Float32Array(0);
  let running = false, onScreen = true, beatAt = 0, beatN = 0;

  function measure() {
    const r = stage.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    pitch = w < 720 ? 6 : 8; barW = w < 720 ? 2.5 : 3;
    n = Math.ceil(w / pitch) + 1;
    const old = level; level = new Float32Array(n); level.set(old.subarray(0, n));
    maxH = h * (w < 720 ? 0.11 : 0.16);
    if (still) draw(performance.now());
  }

  // How loud each band is now: fuller in the low mids, a kick on the beat, slow swells, a quick shimmer up top.
  function target(i, t, playing) {
    if (!playing) return 0;
    const x = i / n;
    const kick = Math.exp(-(t - beatAt) / 170) * (beatN % 4 === 1 ? 1 : 0.7);
    const body = 0.3 + 0.7 * Math.exp(-(((x - 0.2) / 0.34) ** 2));
    const swell = 0.5 + 0.5 * Math.sin(t * 0.0019 + i * 0.31) * Math.sin(t * 0.0011 + i * 0.07 + 1.7);
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.012 + i * 2.39);
    return Math.min(1, body * (0.18 + 0.42 * swell + 0.38 * kick * (1 - x) + 0.14 * shimmer * x));
  }

  // The real thing: each bar listens to a band of the preview's spectrum, low on the left, high on the right.
  function heard(i) {
    const x = i / n, bins = live.data.length, lo = 2, hi = bins * 0.72;
    const v = live.data[Math.min(bins - 1, Math.floor(lo * Math.pow(hi / lo, x)))] / 255;
    return Math.min(1, Math.pow(v, 1.5) * (0.8 + 0.7 * x));
  }

  function draw(t) {
    const playing = session.playing;
    const beat = 60000 / session.record.bpm;
    if (playing && t - beatAt >= beat) { beatAt = t - ((t - beatAt) % beat || 0); beatN++; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const [cr, cg, cb] = (getComputedStyle(stage).color.match(/\d+/g) || [255, 255, 255]).map(Number);
    const a = stage.dataset.tone === 'light' ? 0.07 : 0.12;
    const grad = ctx.createLinearGradient(0, h * dpr, 0, (h - maxH) * dpr);
    grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
    grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, ${a * 0.35})`);
    ctx.fillStyle = grad;
    let moving = false;
    const real = live.on && live.analyser;
    if (real) live.analyser.getByteFrequencyData(live.data);
    for (let i = 0; i < n; i++) {
      const goal = real ? heard(i) : still ? (playing ? target(i, 2600, true) : 0) : target(i, t, playing);
      if (still) level[i] = goal;
      else level[i] += (goal - level[i]) * (goal > level[i] ? 0.35 : 0.07);   // quick to rise, slow to fall
      if (level[i] > 0.004) moving = true;
      const bh = Math.max(2, level[i] * maxH);
      ctx.beginPath();
      ctx.roundRect((i * pitch) * dpr, (h - bh) * dpr, barW * dpr, bh * dpr, [barW * dpr / 2, barW * dpr / 2, 0, 0]);
      ctx.fill();
    }
    return moving;
  }

  function frame(t) {
    if (!onScreen || document.hidden) { running = false; return; }
    const moving = draw(t);
    if (session.playing || moving) requestAnimationFrame(frame);
    else running = false;
  }
  const start = () => {
    if (still) { draw(performance.now()); return; }
    if (!running && onScreen && !document.hidden) { running = true; requestAnimationFrame(frame); }
  };

  measure();
  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; start(); }).observe(stage);
  document.addEventListener('visibilitychange', start);
  session.addEventListener('change', () => setTimeout(start, 200));   // after the stage has taken the new song's colour
  start();
})();

// ---------- Try it with your own song ----------
// Search Apple's public catalogue (no sign-in), pick a song, and every device on the page plays it: real
// artwork, title, artist and length, with the stage in the cover's colours. "Hear a preview" plays Apple's
// 30-second clip, and the sound bars follow the real audio. All on this page; nothing reaches anyone's devices.
(function tryYourOwnSong() {
  const dialog = $('#try-dialog'), opener = $('.try-open');
  if (!dialog || !opener) return;
  if (typeof dialog.showModal !== 'function') { $('.try').remove(); return; }
  const input = $('input', dialog), list = $('.try-results', dialog), status = $('.try-status', dialog);
  const now = $('.try-now'), hear = $('.try-hear'), hearLabel = $('.try-hear span'), apple = $('.try-apple'), label = $('.try-label');
  const region = (((navigator.languages && navigator.languages[0]) || navigator.language || 'en-US').split('-')[1] || 'us').slice(0, 2).toLowerCase();
  let timer = 0, pending = null;

  opener.addEventListener('click', () => { dialog.showModal(); input.select(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });    // a click outside the window
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 280); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); search(); }
    if (e.key === 'ArrowDown') { const first = $('button', list); if (first) { e.preventDefault(); first.focus(); } }
  });
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const all = $$('button', list), i = all.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    if (e.key === 'ArrowUp' && i === 0) input.focus();
    else all[Math.max(0, Math.min(all.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  });

  async function search() {
    const term = input.value.trim();
    if (term.length < 2) { list.replaceChildren(); status.textContent = ''; return; }
    if (pending) pending.abort();
    pending = new AbortController();
    status.textContent = 'Searching…';
    try {
      const query = new URLSearchParams({ term, media: 'music', entity: 'song', limit: '8', country: region });
      const res = await fetch('https://itunes.apple.com/search?' + query, { signal: pending.signal });
      if (!res.ok) throw new Error(String(res.status));
      const { results = [] } = await res.json();
      const songs = results.filter((r) => r.kind === 'song' && r.trackName && r.artworkUrl100);
      list.replaceChildren(...songs.map(row));
      status.textContent = songs.length ? songs.length + (songs.length === 1 ? ' song' : ' songs') : 'No songs found. Try another spelling, or the artist’s name.';
    } catch (err) {
      if (err.name !== 'AbortError') status.textContent = 'Couldn’t reach Apple Music. Check your connection and try again.';
    }
  }

  // Remote text only ever goes in as text.
  function row(song) {
    const li = document.createElement('li'), b = document.createElement('button'), img = document.createElement('img');
    const words = document.createElement('div'), t = document.createElement('b'), a = document.createElement('span');
    b.type = 'button';
    img.src = song.artworkUrl100; img.alt = ''; img.width = 48; img.height = 48; img.loading = 'lazy';
    t.textContent = song.trackName;
    a.textContent = song.collectionName ? song.artistName + ' · ' + song.collectionName : song.artistName;
    words.append(t, a); b.append(img, words); li.append(b);
    b.addEventListener('click', () => choose(song));
    return li;
  }

  async function choose(song) {
    // The sound starts now, inside the click: some browsers (Safari) only allow it straight after one.
    const id = 'pick-' + song.trackId + '-' + RECORDS.length;
    if (song.previewUrl) startPreview(song.previewUrl, id); else audio.pause();
    status.textContent = 'Loading…';
    const art = song.artworkUrl100.replace(/\/\d+x\d+bb\./, '/600x600bb.');
    const colours = await coloursFrom(art).catch(() => ({ stage: '#2c2b30', ink: '#ffffff', glow: '#d4d2dc', wall: ['#121114', '#3b3a41'] }));
    RECORDS.push(Object.assign({
      id, title: song.trackName, artist: song.artistName, album: song.collectionName || '',
      duration: Math.max(30, Math.round((song.trackTimeMillis || 210000) / 1000)), bpm: 100,
      art, preview: song.previewUrl || '', link: song.trackViewUrl || 'https://music.apple.com/',
    }, colours));
    dialog.close();
    // The new song plays on the Mac; anything the iPhone had pauses there. Settle it all, then sound it.
    sound.hold++;
    try {
      if (sound.phone) sound.phone.release();
      session.goTo(RECORDS.length - 1, 0, 'mac');
      if (!session.playing) session.toggle('mac');
    } finally { sound.hold--; }
    sound.sync();
    label.textContent = 'Try another song';
    status.textContent = '';
  }

  // The cover's colours: a saturation-weighted average, set dark enough for white text (or, for a pale
  // cover, light enough for dark text), as the made-up records are.
  async function coloursFrom(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous'; img.src = url;
    await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    let R = 0, G = 0, B = 0, W = 0, lum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      const w = 0.08 + Math.pow(mx ? (mx - mn) / mx : 0, 2) * (mx / 255);
      R += r * w; G += gg * w; B += b * w; W += w; lum += (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
    }
    const hsl = toHsl(R / W, G / W, B / W), h = hsl[0], s0 = hsl[1];
    const pale = lum / (d.length / 4) > 0.66 && s0 < 0.5;
    const s = Math.min(0.78, s0 * 1.08), ink = pale ? '#16120f' : '#ffffff';
    let l = pale ? 0.8 : 0.46;
    while (!pale && contrast(hex(h, s, l), '#ffffff') < 4.5 && l > 0.1) l -= 0.02;
    while (pale && contrast(hex(h, s, l), '#16120f') < 4.5 && l < 0.96) l += 0.02;
    return { stage: hex(h, s, l), ink, glow: hex(h, s * 0.8, Math.min(0.9, l + 0.35)), wall: [hex(h, s, Math.max(0.06, l * 0.4)), hex(h, s, pale ? l * 0.72 : Math.min(0.6, l * 1.05))] };
  }
  function toHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
    if (!dd) return [0, 0, l];
    const s = dd / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
    return [(h * 60 + 360) % 360, s, l];
  }
  function hex(h, s, l) {
    const f = (n) => {
      const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }
  function contrast(a, b) {
    const L = (x) => {
      const v = [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const x = Math.max(L(a), L(b)), y = Math.min(L(a), L(b));
    return (x + 0.05) / (y + 0.05);
  }

  // The preview: Apple's 30-second clip, starting as the song is picked, at the Mac's volume. Play and pause on
  // any device drive it, as the demo's buttons drive Music; when the clip ends, the demo pauses with it.
  const audio = new Audio();
  audio.crossOrigin = 'anonymous'; audio.preload = 'none';
  function listen() {
    if (live.ctx) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.8;
      ctx.createMediaElementSource(audio).connect(an); an.connect(ctx.destination);
      Object.assign(live, { ctx, analyser: an, data: new Uint8Array(an.frequencyBinCount) });
    } catch (e) { /* the preview still plays; the bars just keep their own time */ }
  }
  const level = () => Math.max(0, Math.min(1, session.volume));
  function startPreview(url, id) {
    audio.src = url; audio.dataset.for = id;
    listen();
    if (live.ctx && live.ctx.state === 'suspended') live.ctx.resume();
    audio.volume = level();
    audio.play().catch(() => showHearing(false));
  }
  // The device that has the song: the iPhone after Continue on iPhone, otherwise the Mac.
  const onPhone = () => !!(sound.phone && sound.phone.where() === 'iphone' && sound.phone.index() != null);
  function owner() {
    if (onPhone()) {
      const ph = sound.phone;
      return { record: RECORDS[ph.index()], playing: ph.playing(), pos: ph.pos(), pause: ph.pause, toggle: ph.toggle, restart: ph.restart };
    }
    return {
      record: session.record, playing: session.playing, pos: session.position,
      pause: () => { if (session.playing) session.toggle('auto'); },
      toggle: () => session.toggle('mac'),
      restart: () => session.seek(0, 'mac'),
    };
  }

  // The preview sounds exactly when the device that has its song is playing it, from that device's point.
  // Mid-handover it carries on as it is, so the song crosses without a break.
  sound.sync = function sync() {
    if (sound.hold || (sound.phone && sound.phone.busy())) return;
    const o = owner(), r = o.record, picked = r.id.startsWith('pick-');
    now.hidden = !picked;
    if (picked) {
      hear.hidden = !r.preview;
      apple.href = r.link;
      apple.setAttribute('aria-label', 'Open ' + r.title + ' in Apple Music (new tab)');
    }
    if (!picked || !r.preview || !o.playing) { if (!audio.paused) audio.pause(); live.on = false; return; }
    if (audio.dataset.for !== r.id) startPreview(r.preview, r.id);         // back to an earlier pick
    const len = audio.duration;
    if (isFinite(len) && o.pos >= len - 0.25) {
      if (audio.ended) o.restart();          // played again after the clip ended: from the top
      else o.pause();                        // scrubbed past the clip: a preview is only 30 seconds
      return;
    }
    if (Math.abs(audio.currentTime - o.pos) > 1.2) audio.currentTime = o.pos;
    if (!onPhone()) audio.volume = level();  // the Mac's volume is Music's on the Mac
    if (audio.paused) audio.play().catch(() => showHearing(false));
    live.on = !audio.paused && !onPhone();   // the sound bars are the Mac's sound
  };
  sound.heard = (id) => (!audio.paused && audio.dataset.for === id ? audio.currentTime : null);

  // The button is the song's own play and pause, on whichever device has it.
  hear.addEventListener('click', () => { if (owner().record.preview) owner().toggle(); });
  const showHearing = (on) => { hear.setAttribute('aria-pressed', String(on)); hearLabel.textContent = on ? 'Pause preview' : 'Play preview'; live.on = on && !onPhone(); };
  audio.addEventListener('playing', () => showHearing(true));
  audio.addEventListener('pause', () => showHearing(false));
  audio.addEventListener('ended', () => {
    showHearing(false);
    const o = owner();
    if (o.playing && o.record.id === audio.dataset.for) o.pause();   // the music stopped: so does the device playing it
  });

  session.addEventListener('change', () => sound.sync());
})();

// ---------- The opening: the song is on the Mac; then it arrives on the iPhone ----------
// The opening waits a moment after landing, so the page is read before anything moves.
const OPENING_WAIT = 600;
function wake() {
  const phone = $$('.hero-phone').find((p) => p.offsetParent !== null);
  const from = $('.hero-menu .mm-art');
  if (!phone) return;
  const reveal = () => { phone.classList.remove('is-asleep'); stage.style.setProperty('--lit', '1'); };
  // Only when the hero is what's on screen: arriving mid-page (a link to #continue, a reload) just shows it.
  const heroInView = $('.hero').getBoundingClientRect().bottom > innerHeight * 0.6 && scrollY < innerHeight * 0.25;
  if (reducedMotion.matches || !from || from.offsetParent === null || !heroInView) { reveal(); return; }

  const to = phone.querySelector('.sb-art, .np-art');
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  if (b.width < a.width * 1.6) { setTimeout(reveal, 450); return; }   // nothing worth flying

  // A copy of the Mac's artwork travels down into StandBy and becomes its artwork.
  const ghost = document.createElement('div');
  ghost.className = 'hand-ghost';
  Object.assign(ghost.style, { left: `${b.left + scrollX}px`, top: `${b.top + scrollY}px`, width: `${b.width}px`, height: `${b.height}px`, borderRadius: getComputedStyle(to).borderRadius, transformOrigin: '0 0' });
  ghost.innerHTML = `<img src="${artURL(session.record)}" alt="">`;
  const s = a.width / b.width, dx = a.left - b.left, dy = a.top - b.top;
  to.style.opacity = '0';
  document.body.append(ghost);
  const fly = ghost.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${s})`, borderRadius: `${6 / s}px`, offset: 0 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.62}px) scale(${s + (1 - s) * 0.55})`, offset: 0.55 },
    { transform: 'none', offset: 1 },
  ], { duration: 980, delay: OPENING_WAIT + 520, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'both' });
  setTimeout(() => { phone.classList.remove('is-asleep'); }, OPENING_WAIT + 1020);
  setTimeout(() => stage.style.setProperty('--lit', '1'), OPENING_WAIT + 1150);
  // A press during the wait means someone's already using it: skip the opening.
  const skip = () => { fly.cancel(); };
  session.addEventListener('change', skip, { once: true });
  const done = () => { session.removeEventListener('change', skip); to.style.opacity = ''; ghost.remove(); reveal(); };
  fly.finished.then(done, done);
}
if (document.readyState === 'complete') wake(); else addEventListener('load', wake, { once: true });

// ---------- 3. Continue Listening, both ways ----------
// Each device pulls the song to itself: Continue on iPhone in the iPhone app, Continue from iPhone in the
// Mac's menu. Only the destination's control shows, under its name.
const hand = $('.hand');
if (hand) {
  const macCard = $('[data-surface="hand-mac"]', hand);
  const phoneCard = $('[data-surface="hand-iphone"]', hand);
  const qMac = $('.queue-mac', hand), qPhone = $('.queue-iphone', hand);
  const toPhone = $('[data-hand="to-iphone"]', hand), toMac = $('[data-hand="to-mac"]', hand);
  const backToMac = $('[data-hand="back-to-mac"]', hand);          // Continue on Mac, in the iPhone app
  const pullPhone = $('[data-pull="iphone"]', hand), pullMac = $('[data-pull="mac"]', hand);
  const macStatus = $('.pull-status', hand);
  const rest = (ms) => new Promise((r) => setTimeout(r, reducedMotion.matches ? 0 : ms));
  // Apple Music on the iPhone: its own little player.
  const phone = { index: null, base: 0, t0: 0, playing: false };
  const phonePos = () => phone.index == null ? 0 : Math.min(RECORDS[phone.index].duration, phone.playing ? phone.base + (performance.now() - phone.t0) / 1000 : phone.base);

  const upNext = (i) => Array.from({ length: 5 }, (_, k) => RECORDS[(i + 1 + k) % RECORDS.length]);
  const fillQueue = (ol, i) => {
    ol.innerHTML = upNext(i).map((r) => `<li><img src="${artURL(r, true)}" alt="${r.title}, ${r.artist}" width="40" height="40"></li>`).join('') + '<li class="more">and up to 20 more</li>';
  };

  const fill = (card, r) => {
    const img = $('[data-bind="art"]', card);
    if (!img.src.endsWith(`/${r.id}.webp`)) img.src = artURL(r);
    $('[data-bind="title"]', card).textContent = r.title;
    $('[data-bind="artist"]', card).textContent = r.artist;
  };

  function render() {
    const macPlaying = session.playing, phonePlaying = phone.playing;
    fill(macCard, session.record);
    macCard.dataset.state = macPlaying ? 'playing' : 'paused';
    $('[data-bind="state"]', macCard).textContent = macPlaying ? 'Playing' : 'Paused';
    $('[data-bind="elapsed"]', macCard).textContent = fmt(session.position);
    if (phone.index == null) {
      phoneCard.dataset.state = 'empty';
    } else {
      fill(phoneCard, RECORDS[phone.index]);
      phoneCard.dataset.state = phonePlaying ? 'playing' : 'paused';
      $('[data-bind="state"]', phoneCard).textContent = phonePlaying ? 'Playing' : 'Paused';
      $('[data-bind="elapsed"]', phoneCard).textContent = fmt(phonePos());
    }
    // The pressed button stays, working, until the move lands; then the swap. The section never changes height.
    if (!hand.dataset.busy) {
      const onPhone = hand.dataset.where === 'iphone';
      pullPhone.hidden = false;
      toPhone.hidden = toPhone.disabled = onPhone;       // song on the Mac: the iPhone app can take it
      backToMac.hidden = backToMac.disabled = !onPhone;  // song on the iPhone: the iPhone app can send it back…
      pullMac.hidden = toMac.disabled = !onPhone;        // …or the Mac can ask for it
    }
    if (qMac.dataset.for !== String(session.index)) { fillQueue(qMac, session.index); qMac.dataset.for = String(session.index); }
  }

  function flyArt(fromEl, toEl, src, { delay = 0, duration = 900, lift = 60 } = {}) {
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    if (reducedMotion.matches || !a.width || !b.width) return Promise.resolve();
    const g = document.createElement('div');
    g.className = 'hand-ghost';
    Object.assign(g.style, { left: `${a.left + scrollX}px`, top: `${a.top + scrollY}px`, width: `${a.width}px`, height: `${a.height}px`, borderRadius: getComputedStyle(fromEl).borderRadius, transformOrigin: '0 0' });
    g.innerHTML = `<img src="${src}" alt="">`;
    document.body.append(g);
    const dx = b.left - a.left, dy = b.top - a.top, s = b.width / a.width;
    const anim = g.animate([
      { transform: 'none', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(${(1 + s) / 2 * 1.04})`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 1 },
    ], { duration, delay, easing: 'cubic-bezier(.55,0,.15,1)', fill: 'both' });
    return anim.finished.then(() => g.remove());
  }

  // Keyboard users land on the way back once the move is done.
  const begin = (btn) => {
    btn.dataset.hadFocus = document.activeElement === btn ? '1' : '';
    hand.dataset.busy = '1'; btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
  };
  const end = (btn, where, next) => {
    btn.removeAttribute('aria-busy'); delete hand.dataset.busy;
    hand.dataset.where = where;
    render();
    if (btn.dataset.hadFocus) next.focus();
  };

  // The iPhone's end of a picked song's sound (see the song search): its Apple Music plays, pauses and restarts it.
  const phoneNow = (playing) => {
    if (playing && !phone.playing) { phone.t0 = performance.now(); phone.playing = true; }
    else if (!playing && phone.playing) { phone.base = phonePos(); phone.playing = false; }
    render(); sound.sync();
  };
  sound.phone = {
    where: () => hand.dataset.where,
    busy: () => !!hand.dataset.busy,
    index: () => phone.index,
    playing: () => phone.playing,
    pos: () => phonePos(),
    pause: () => phoneNow(false),
    toggle: () => phoneNow(!phone.playing),
    restart: () => { phone.base = 0; phone.t0 = performance.now(); phone.playing = true; render(); sound.sync(); },
    // A new song chosen on the Mac: whatever the iPhone had pauses there, and the Mac has the sound.
    release: () => { if (hand.dataset.where === 'iphone') { phone.base = phonePos(); phone.playing = false; hand.dataset.where = 'mac'; render(); } },
  };

  // On the iPhone: Continue on iPhone. The song and its Up Next travel; the Mac pauses as it lets go, and
  // the iPhone carries on from the same point, so a playing song keeps sounding all the way across.
  async function continueOnIPhone() {
    begin(toPhone);
    await rest(380);
    const i = session.index, at = session.position, carried = session.playing;
    phone.index = i; phone.base = at; phone.t0 = performance.now(); phone.playing = carried;
    phoneCard.dataset.state = 'empty';
    fill(phoneCard, RECORDS[i]);
    if (session.playing) session.toggle('auto');
    fillQueue(qPhone, i); qPhone.classList.remove('is-here'); qMac.classList.add('is-left');
    const main = flyArt($('.hand-art', macCard), $('.hand-art', phoneCard), artURL(RECORDS[i]), { duration: 950 });
    const trail = $$('li:not(.more) img', qMac).map((img, k) => flyArt(img, $$('li:not(.more) img', qPhone)[k], img.src, { delay: 160 + k * 60, duration: 820, lift: 30 }));
    await Promise.all([main, ...trail]);
    if (!carried) { phone.t0 = performance.now(); phone.playing = true; }   // a paused Mac: the iPhone starts it now
    qPhone.classList.add('is-here'); qMac.classList.remove('is-left');
    end(toPhone, 'iphone', backToMac);
    sound.sync();
    say(`Continued on the iPhone: ${RECORDS[i].title}, from ${fmt(at)}, with Up Next. The Mac is paused.`);
  }

  // Back to the Mac, either way. From the Mac it asks first (the menu's own status lines); from the
  // iPhone app it just goes.
  async function backHome(btn, asking) {
    begin(btn);
    if (btn === backToMac) toMac.disabled = true; else backToMac.disabled = true;
    if (asking) {
      macStatus.classList.add('is-waiting'); macStatus.textContent = 'Asking your iPhone…';
      await rest(900);
      macStatus.textContent = 'Your iPhone is handing over…';
      await rest(650);
    } else {
      await rest(380);
    }
    const i = phone.index, at = phonePos();
    phone.base = at; phone.playing = false;
    session.goTo(i, at, 'auto');
    macCard.dataset.state = 'paused';
    await flyArt($('.hand-art', phoneCard), $('.hand-art', macCard), artURL(RECORDS[i]), { duration: 900 });
    macStatus.classList.remove('is-waiting'); macStatus.textContent = '';
    hand.dataset.where = 'mac';                 // before Music starts, so the start isn't taken for a takeover
    const heard = sound.heard(RECORDS[i].id);   // the song kept sounding through the move: the Mac picks up where it is now
    if (heard != null) session.seek(heard, 'auto');
    if (!session.playing) session.toggle('auto');
    end(btn, 'mac', toPhone);
    sound.sync();
    say(`Continued on the Mac from ${fmt(at)}. The iPhone is paused.`);
  }

  toPhone.addEventListener('click', continueOnIPhone);
  toMac.addEventListener('click', () => backHome(toMac, true));          // Continue from iPhone, on the Mac
  backToMac.addEventListener('click', () => backHome(backToMac, false)); // Continue on Mac, on the iPhone
  session.addEventListener('change', ({ detail: { kind } }) => {
    if (hand.dataset.busy) return;
    // As on the Mac: Music starting there by itself ends Continue from iPhone. Here the iPhone pauses
    // too, so the picture never shows both seats playing.
    if (kind === 'play' && session.playing && hand.dataset.where === 'iphone') {
      phone.base = phonePos(); phone.playing = false; hand.dataset.where = 'mac';
      render();
      sound.sync();                              // the sound goes back to the Mac with it
      return;
    }
    render();
  });
  render();
  // Keep the timecodes moving while the section is on screen.
  let handVisible = false;
  new IntersectionObserver(([e]) => {
    handVisible = e.isIntersecting;
    if (e.isIntersecting && !reducedMotion.matches) hand.classList.add('is-seen');
  }, { threshold: 0.35 }).observe(hand);
  setInterval(() => { if (handVisible && !hand.dataset.busy) render(); }, 500);
}
})();
