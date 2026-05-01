/* Pivot — landing page interactions */
(() => {
  const ACCENT = '#E24D25';

  // ─── Nav scroll state ──────────────────────────────────
  const nav        = document.getElementById('nav');
  const mobileMenu = document.getElementById('nav-mobile-menu');
  const TOPBAR_H   = 32;
  const NAV_H      = 80;
  const onScroll = () => {
    const y      = window.scrollY;
    const navTop = Math.max(0, TOPBAR_H - y);
    nav.style.top = navTop + 'px';
    if (mobileMenu) mobileMenu.style.top = (navTop + NAV_H) + 'px';
    nav.classList.toggle('scrolled', y > 80);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── Hamburger menu ────────────────────────────────────
  const hamburger = document.getElementById('nav-hamburger');
  const mobileOverlay = document.getElementById('nav-mobile-overlay');

  function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    mobileOverlay.classList.remove('open');
    hamburger.classList.remove('open');
    nav.classList.remove('menu-open');
  }

  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    mobileOverlay.classList.toggle('open', open);
    hamburger.classList.toggle('open', open);
    nav.classList.toggle('menu-open', open);
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileMenu));
  mobileOverlay.addEventListener('click', closeMobileMenu);

  // ─── Scroll-reveal text ────────────────────────────────
  const reveals = document.querySelectorAll('[data-reveal]');
  reveals.forEach(el => {
    const dark = el.classList.contains('reveal-text-dark');
    const track = el.closest('[data-reveal-track]');
    const rawLines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = '';

    const lines = rawLines.map(lineHtml => {
      const lineEl = document.createElement('span');
      lineEl.className = 'reveal-line';
      // <br> with attributes (e.g. class="visual") acts as a visual-only break:
      // it stays within the same animation segment but creates a real <br> in the DOM.
      // Plain <br>, <br/>, <br /> are animation-segment breaks (handled above).
      const visualParts = lineHtml.split(/<br\s+\w[^>]*>/i);
      const wordSpans = [];
      visualParts.forEach((part, pi) => {
        part.trim().split(/\s+/).filter(w => w).forEach(w => {
          const s = document.createElement('span');
          s.textContent = w + ' ';
          lineEl.appendChild(s);
          wordSpans.push(s);
        });
        if (pi < visualParts.length - 1) lineEl.appendChild(document.createElement('br'));
      });
      el.appendChild(lineEl);
      return { el: lineEl, wordSpans };
    });

    const n = lines.length;
    const mergeLastTwo = el.hasAttribute('data-merge-last') && n > 1;
    const nSegs = mergeLastTwo ? n - 1 : n;

    const update = () => {
      const vh = window.innerHeight;

      if (track) {
        // Sticky section: drive each line's translateY from scroll progress
        const rect = track.getBoundingClientRect();
        const range = Math.max(1, track.offsetHeight - vh);
        const p = Math.max(0, Math.min(1, -rect.top / range));

        lines.forEach(({ el: lineEl, wordSpans }, i) => {
          const segIdx = (mergeLastTwo && i === n - 1) ? nSegs - 1 : i;
          const segStart = (segIdx / nSegs) * 0.85;
          const segEnd = ((segIdx + 1) / nSegs) * 0.85;
          const segP = Math.max(0, Math.min(1, (p - segStart) / (segEnd - segStart)));
          const maxTy = vh * 0.25;
          lineEl.style.transform = `translateY(${(1 - segP) * maxTy}px)`;
          lineEl.style.opacity = Math.min(1, segP * 8).toString();
          lineEl.style.filter = `blur(${(1 - Math.min(1, segP / 0.85)) * 6}px)`;
          const fadeP = Math.max(0, Math.min(1, (segP - 0.65) / 0.35));
          const alpha = dark ? 0.15 + fadeP * 0.85 : 0.12 + fadeP * 0.88;
          const colour = dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
          wordSpans.forEach(s => s.style.color = colour);
        });
      } else {
        // Non-sticky: colour driven by live viewport position
        lines.forEach(({ el: lineEl, wordSpans }) => {
          const rect = lineEl.getBoundingClientRect();
          const p = Math.max(0, Math.min(1, (vh - rect.top) / (vh * 0.7)));
          const alpha = dark ? 0.15 + p * 0.85 : 0.12 + p * 0.88;
          const colour = dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
          wordSpans.forEach(s => s.style.color = colour);
          lineEl.style.filter = `blur(${(1 - p) * 3}px)`;
        });
      }
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  // ─── Why Pivot? label scale animation ─────────────────
  const whyTrack = document.querySelector('[data-reveal-track]');
  const whyLabel = document.querySelector('.why-label');
  if (whyTrack && whyLabel) {
    whyLabel.style.transformOrigin = 'left center';
    const updateWhyLabel = () => {
      const vh = window.innerHeight;
      const rect = whyTrack.getBoundingClientRect();
      const range = Math.max(1, whyTrack.offsetHeight - vh);
      const p = Math.max(0, Math.min(1, -rect.top / range));
      // Shrink from 2× to 1× over line 0's segment (p = 0 → 0.2125)
      const labelP = Math.min(1, p / 0.2125);
      const scale = 2 - labelP;
      whyLabel.style.transform = `scale(${scale})`;
    };
    window.addEventListener('scroll', updateWhyLabel, { passive: true });
    window.addEventListener('resize', updateWhyLabel);
    updateWhyLabel();
  }

  // ─── Dial-intro black reveal on scroll ─────────────────
  const dialIntroEl      = document.getElementById('dial-intro');
  const dialIntroReveal  = document.getElementById('dial-intro-reveal');
  const dialIntroContent = dialIntroEl && dialIntroEl.querySelector('.dial-intro-content');
  if (dialIntroEl && dialIntroReveal) {
    const updateDialReveal = () => {
      const rect = dialIntroEl.getBoundingClientRect();
      const vh   = window.innerHeight;
      // p: 0 when section top hits viewport bottom, 1 when section fills viewport
      const p = Math.max(0, Math.min(1, (vh - rect.top) / vh));
      dialIntroReveal.style.opacity = (1 - p).toString();
      if (dialIntroContent) {
        dialIntroContent.style.opacity   = p.toString();
        dialIntroContent.style.transform = `translateY(${(1 - p) * 36}px)`;
      }
    };
    window.addEventListener('scroll', updateDialReveal, { passive: true });
    window.addEventListener('resize', updateDialReveal);
    updateDialReveal();
  }

  // ─── Curtain reveal helper ─────────────────────────────────────────
  // offsetTop traversal — not affected by CSS transforms or load timing
  function naturalDocTop(el) {
    let top = 0, e = el;
    while (e) { top += e.offsetTop; e = e.offsetParent; }
    return top;
  }

  function makeCurtain(upperEl, lowerStack, options) {
    if (!upperEl || !lowerStack) return;
    // position:sticky inside a CSS-transformed ancestor is a known browser bug —
    // the transformed parent becomes the sticky container instead of the viewport,
    // causing snapping. We temporarily override affected elements to relative
    // during the curtain phase (sticky isn't active in that scroll zone anyway)
    // then restore it cleanly when the curtain exits.
    const stickyEls = options && options.stickyFix
      ? Array.from(lowerStack.querySelectorAll(options.stickyFix))
      : [];

    const update = () => {
      const scrollY  = window.scrollY;
      const upperTop = naturalDocTop(upperEl);
      const upperH   = upperEl.offsetHeight;
      const lowerTop = naturalDocTop(lowerStack);
      if (scrollY >= upperTop && scrollY < upperTop + upperH) {
        lowerStack.style.transform  = `translateY(${-(lowerTop - scrollY)}px)`;
        lowerStack.style.willChange = 'transform';
        stickyEls.forEach(el => { el.style.position = 'relative'; });
      } else {
        lowerStack.style.transform  = '';
        lowerStack.style.willChange = '';
        stickyEls.forEach(el => { el.style.position = ''; });
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Hero → Why+Interaction curtain (.why-sticky needs the sticky fix)
  makeCurtain(
    document.getElementById('hero'),
    document.getElementById('why-stack'),
    { stickyFix: '.why-sticky' }
  );

  // Dial-intro → Hardware curtain (no sticky children inside)
  makeCurtain(dialIntroEl, document.getElementById('hardware-stack'));

  // ─── Scroll zoom on dark hero break ────────────────────
  const zoomSection = document.getElementById('scroll-zoom');
  const zoomBg = document.getElementById('scroll-zoom-bg');
  if (zoomSection && zoomBg) {
    const updateZoom = () => {
      const rect = zoomSection.getBoundingClientRect();
      const range = zoomSection.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, -rect.top / range));
      zoomBg.style.transform = `scale(${1 + p * 0.14})`;
    };
    window.addEventListener('scroll', updateZoom, { passive: true });
    window.addEventListener('resize', updateZoom);
    updateZoom();
  }

  // ─── DialRing SVG generator ────────────────────────────
  function buildRing(svg, { color, progress, size = 300, segments = 12, segGap = 0.05, inset = 7, hubRatio = 14 }) {
    const r = size / 2 - 12;
    const cx = size / 2;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * 2 * Math.PI - Math.PI / 2;
      const b = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
      const lit = i / segments < progress;
      const x1 = cx + (r - inset) * Math.cos(a + segGap), y1 = cx + (r - inset) * Math.sin(a + segGap);
      const x2 = cx + (r + inset) * Math.cos(a + segGap), y2 = cx + (r + inset) * Math.sin(a + segGap);
      const x3 = cx + (r + inset) * Math.cos(b - segGap), y3 = cx + (r + inset) * Math.sin(b - segGap);
      const x4 = cx + (r - inset) * Math.cos(b - segGap), y4 = cx + (r - inset) * Math.sin(b - segGap);
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`);
      poly.setAttribute('fill', lit ? color : 'rgba(255,255,255,0.07)');
      if (lit) poly.style.filter = `drop-shadow(0 0 5px ${color}99)`;
      svg.appendChild(poly);
    }
    const hub = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hub.setAttribute('cx', cx); hub.setAttribute('cy', cx);
    hub.setAttribute('r', r - hubRatio);
    hub.setAttribute('fill', 'rgba(255,255,255,0.05)');
    svg.appendChild(hub);
  }

  function buildLightRing(svg, { color, progress, size = 72, segments = 10, gap = 0.06, inset = 5 }) {
    const r = size / 2 - 6;
    const cx = size / 2;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * 2 * Math.PI - Math.PI / 2;
      const b = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
      const lit = i / segments < progress;
      const x1 = cx + (r - inset) * Math.cos(a + gap), y1 = cx + (r - inset) * Math.sin(a + gap);
      const x2 = cx + (r + inset) * Math.cos(a + gap), y2 = cx + (r + inset) * Math.sin(a + gap);
      const x3 = cx + (r + inset) * Math.cos(b - gap), y3 = cx + (r + inset) * Math.sin(b - gap);
      const x4 = cx + (r - inset) * Math.cos(b - gap), y4 = cx + (r - inset) * Math.sin(b - gap);
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`);
      poly.setAttribute('fill', lit ? color : 'rgba(0,0,0,0.07)');
      svg.appendChild(poly);
    }
  }

  // ─── Interaction: cycling Turn / Press / Know ──────────
  const interactionSteps = [
    { progress: 0.65, color: ACCENT, value: '65%' },
    { progress: 0.50, color: '#FFFFFF', value: 'On' },
    { progress: 0.85, color: '#3DBA6A', value: '85%' },
  ];
  const dialSvg = document.getElementById('dial-ring');
  const dialValue = document.getElementById('dial-value');
  const stepEls = Array.from(document.querySelectorAll('#interaction-steps .step'));
  let activeStep = 0;
  function setStep(i) {
    activeStep = i;
    stepEls.forEach((el, idx) => el.classList.toggle('active', idx === i));
    const s = interactionSteps[i];
    buildRing(dialSvg, { color: s.color, progress: s.progress });
    dialValue.textContent = s.value;
  }
  stepEls.forEach((el, idx) => el.addEventListener('click', () => setStep(idx)));
  setStep(0);
  setInterval(() => setStep((activeStep + 1) % interactionSteps.length), 2600);

  // ─── Banks ─────────────────────────────────────────────
  const banks = [
    { name: 'HomePod',   label: '70%',     color: '#006AFF', bg: '#EDF3FF', image: 'assets/bank-1.png', value: 0.70 },
    { name: 'Lamp',  label: '60%', color: '#E24D25', bg: '#FDF1EE', image: 'assets/bank-2.png', value: 0.60 },
    { name: 'Thermostat', label: '30°',    color: '#3DBA6A', bg: '#EFF9F3', image: 'assets/bank-3.png', value: 1.0 },
    { name: 'Timer',   label: '15m',  color: '#B46FE8', bg: '#F5EEF9', image: 'assets/bank-4.png', value: 0.55 },
  ];
  const banksStrip = document.getElementById('banks-strip');
  banksStrip.innerHTML = banks.map((b, i) => `
    <div class="bank-pill" data-bank="${i}">
      <div class="bank-pill-head">
        <span class="bank-pill-dot"></span>
        <span class="bank-pill-num">Bank ${i + 1}</span>
      </div>
      <div class="bank-pill-name">${b.name}</div>
      <div class="bank-pill-value">${b.label}</div>
      <div class="bank-pill-bar-track">
        <div class="bank-pill-bar-fill" style="width:${Math.round(b.value * 100)}%"></div>
      </div>
    </div>
  `).join('');

  const bankImgA = document.getElementById('bank-img-a');
  const bankImgB = document.getElementById('bank-img-b');
  let bankActiveLayer = bankImgA;
  let lastBankDisplayIdx = 0;
  bankImgA.style.backgroundImage = `url('${banks[0].image}')`;
  bankImgA.style.opacity = '1';
  bankImgB.style.opacity = '0';

  function setBankImage(src) {
    const next = bankActiveLayer === bankImgA ? bankImgB : bankImgA;
    next.style.backgroundImage = `url('${src}')`;
    next.style.opacity = '1';
    bankActiveLayer.style.opacity = '0';
    bankActiveLayer = next;
  }

  const pillEls = Array.from(document.querySelectorAll('.bank-pill'));
  let bankAutoIdx = 0;
  let bankHoverIdx = null;

  function bankDisplayIdx() {
    return bankHoverIdx !== null ? bankHoverIdx : bankAutoIdx;
  }

  function renderBankState() {
    const di = bankDisplayIdx();
    pillEls.forEach((pill, idx) => {
      const b = banks[idx];
      const dot = pill.querySelector('.bank-pill-dot');
      const fill = pill.querySelector('.bank-pill-bar-fill');
      const isActive = idx === di;
      pill.classList.toggle('active', isActive);
      dot.style.background = isActive ? b.color : '#C0C0C0';
      dot.style.boxShadow = isActive ? `0 0 6px ${b.color}80` : 'none';
      fill.style.background = isActive ? b.color : '#C0C0C0';
      pill.style.background = isActive ? b.bg : 'var(--grey-bg)';
    });
    if (di !== lastBankDisplayIdx) {
      setBankImage(banks[di].image);
      lastBankDisplayIdx = di;
    }
  }

  pillEls.forEach((pill, idx) => {
    pill.addEventListener('mouseenter', () => {
      bankHoverIdx = idx;
      banksStrip.classList.add('is-hovering');
      [bankImgA, bankImgB].forEach(l => l.style.transition = 'opacity 0.22s ease');
      renderBankState();
    });
    pill.addEventListener('mouseleave', () => {
      bankHoverIdx = null;
      banksStrip.classList.remove('is-hovering');
      [bankImgA, bankImgB].forEach(l => l.style.transition = 'opacity 2s ease');
      renderBankState();
    });
  });

  renderBankState();
  setInterval(() => { bankAutoIdx = (bankAutoIdx + 1) % banks.length; renderBankState(); }, 2600);

  // ─── Ecosystem accordion ───────────────────────────────
  const ecosystemItems = [
    { label: 'Firmware',    subtitle: 'for richer on-device control',                         desc: 'Pivot firmware expands what the Home Assistant Voice Preview Edition (VPE) can do on-device, adding colour-coded banks, tactile knob interaction, LED feedback, and event firing into Home Assistant. It\'s built on ESPHome, using the original Nabu Casa firmware as its foundation.', hoverImage: 'assets/firmware-hover.png',      clickImage: 'assets/firmware-accordian.png'    },
    { label: 'Integration', subtitle: 'for easy setup and configuration in Home Assistant',   desc: 'The Pivot integration bridges Pivot firmware and Home Assistant, connecting each bank to the entities, scenes and scripts already in your setup. It also provides the configuration layer for feedback, colours, display behaviour and device preferences.',              hoverImage: 'assets/integration-hover.png',   clickImage: 'assets/integration-accordian.png' },
    { label: 'Dashboard',   subtitle: 'for visual feedback and UI support',                   desc: 'The dashboard adds an optional visual layer to Pivot, offering clearer feedback and UI support for those who want the physical and digital parts of the system to feel more connected.',  hoverImage: 'assets/dashboard-hover.png',     clickImage: 'assets/dashboard-accordian.png'   },
    { label: 'Hardware',    subtitle: 'for a more functional physical form',                  desc: 'Pivot hardware rethinks the physical form of the VPE, creating a more tactile, more functional, and more intentional object for the home.',                                              hoverImage: 'assets/hardware-hover.png',      clickImage: 'assets/hardware-accordian.png'    },
  ];
  const ECO_DEFAULT_IMAGE = 'assets/default-accordian.png';
  const ECO_DISCLAIMERS = {
    'assets/integration-accordian.png': 'For illustrative purposes only.',
    'assets/dashboard-accordian.png':   'Actual dashboard shown.',
  };
  const accordionEl = document.getElementById('ecosystem-accordion');
  const imgA = document.getElementById('eco-img-a');
  const imgB = document.getElementById('eco-img-b');
  const ecoDisclaimer = document.getElementById('eco-disclaimer');
  let activeLayer = imgA;
  let ecoZ = 1;
  imgA.style.backgroundImage = `url('${ECO_DEFAULT_IMAGE}')`;
  imgA.style.opacity = '1';
  imgA.style.zIndex = '1';
  imgB.style.opacity = '0';
  imgB.style.zIndex = '0';
  accordionEl.innerHTML = ecosystemItems.map((item) => `
    <div class="accordion-item" data-hover-image="${item.hoverImage}" data-click-image="${item.clickImage}">
      <button class="accordion-trigger">
        <span class="accordion-trigger-text">
          <span class="accordion-label">${item.label}</span>
          <span class="accordion-subtitle">&nbsp;${item.subtitle}</span>
        </span>
        <span class="accordion-icon">+</span>
      </button>
      <div class="accordion-panel"><div class="accordion-panel-inner"><p>${item.desc}</p></div></div>
    </div>
  `).join('');
  function setEcosystemImage(src) {
    const prev = activeLayer;
    const next = activeLayer === imgA ? imgB : imgA;

    const disclaimer = ECO_DISCLAIMERS[src] || '';
    ecoDisclaimer.textContent = disclaimer;
    ecoDisclaimer.classList.toggle('visible', !!disclaimer);

    // Snap the current active to full opacity so there's always a solid base
    prev.style.transition = 'none';
    prev.style.opacity = '1';

    // Prep the incoming layer behind prev (invisible while setting up)
    next.style.transition = 'none';
    next.style.opacity = '0';
    next.style.backgroundImage = `url('${src}')`;
    next.style.zIndex = String(++ecoZ);

    activeLayer = next;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        next.style.transition = 'opacity 0.5s ease';
        next.style.opacity = '1';
      });
    });
  }
  accordionEl.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const wasActive = item.classList.contains('active');
      accordionEl.querySelectorAll('.accordion-item').forEach(el => {
        el.classList.remove('active');
        el.querySelector('.accordion-icon').textContent = '+';
      });
      if (wasActive) {
        setEcosystemImage(ECO_DEFAULT_IMAGE);
      } else {
        item.classList.add('active');
        trigger.querySelector('.accordion-icon').textContent = '−';
        setEcosystemImage(item.dataset.clickImage);
      }
      // Re-sync disclaimer after any post-click synthetic mouse events settle
      requestAnimationFrame(() => {
        const active = accordionEl.querySelector('.accordion-item.active');
        const src  = active ? active.dataset.clickImage : ECO_DEFAULT_IMAGE;
        const disc = ECO_DISCLAIMERS[src] || '';
        ecoDisclaimer.textContent = disc;
        ecoDisclaimer.classList.toggle('visible', !!disc);
      });
    });
  });

  accordionEl.querySelectorAll('.accordion-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      const activeItem = accordionEl.querySelector('.accordion-item.active');
      if (!activeItem) setEcosystemImage(item.dataset.hoverImage);
    });
    item.addEventListener('mouseleave', () => {
      const activeItem = accordionEl.querySelector('.accordion-item.active');
      if (!activeItem) setEcosystemImage(ECO_DEFAULT_IMAGE);
    });
  });

  // ─── Hardware cards + sticky scroll ────────────────────
  const hwData = [
    {
      defaultImg: 'assets/pivot-dial-fold-1.png',
      cards: [
        { label: 'Dial',              note: 'Combines the dial and button into one tactile control. <br> Turn to adjust, press to select.',                                 img: 'assets/dial.png'              },
        { label: 'Diffused LED ring', note: '12-segment feedback channels hidden beneath the printed surface for a cleaner face.',                                          img: 'assets/diffused-led-ring.png' },
        { label: 'Mount',             note: 'Desk, shelf, bench or wall mount options, with the upright desk mount helping conceal the cable.* <br><span class="hw-card-footnote">*Right-angle USBC adapter required</span>',  img: 'assets/mount.png'             },
      ]
    },
    {
      defaultImg: 'assets/pivot-dial-fold-2.png',
      cards: [
        { label: 'Upright desk mount', note: 'An angled form that brings the dial forward and helps conceal the cable behind the body.',                            img: 'assets/upright-desk-mount.png' },
        { label: 'Low-profile mount',  note: 'A shorter body and mount combo for desks or walls where a flatter, more minimal footprint might make sense.',         img: 'assets/low-profile-mount.png'  },
        { label: 'Wall mount',         note: 'A flat mounting option for vertical placement, designed to work with the shorter body.',  img: 'assets/wall-mount.png'         },
      ]
    },
    {
      defaultImg: 'assets/pivot-dial-fold-3.png',
      cards: [
        { label: 'Body',   note: 'Choose the body style that suits how and where Pivot Dial will be used.',                                                         img: 'assets/body.png'   },
        { label: 'Colour', note: 'Explore subtle or contrasting combinations across the enclosure, dial and mount.',                                         img: 'assets/colour.png' },
        { label: 'Remix', note: 'Edit the STL files to refine details, adjust the form or adapt Pivot Dial to your setup.',                       img: 'assets/modify.png' },
      ]
    },
  ];

  hwData.forEach((panel, panelIdx) => {
    const container = document.getElementById(`hw-cards-${panelIdx}`);
    if (!container) return;
    container.innerHTML = panel.cards.map((card, cardIdx) => `
      <div class="hw-card" data-panel="${panelIdx}" data-card="${cardIdx}">
        <div class="hw-card-label">${card.label}</div>
        <div class="hw-card-note">${card.note}</div>
      </div>
    `).join('');
  });

  const hwImgA = document.getElementById('hw-img-a');
  const hwImgB = document.getElementById('hw-img-b');
  let hwActiveLayer = hwImgA;
  let hwCurrentPanel = 0;
  let hwHoverActive = false;
  hwImgA.style.backgroundImage = `url('${hwData[0].defaultImg}')`;
  hwImgA.style.opacity = '1';
  hwImgB.style.opacity = '0';

  function setHwImage(src) {
    const next = hwActiveLayer === hwImgA ? hwImgB : hwImgA;
    next.style.backgroundImage = `url('${src}')`;
    next.style.opacity = '1';
    hwActiveLayer.style.opacity = '0';
    hwActiveLayer = next;
  }

  document.querySelectorAll('.hw-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      hwHoverActive = true;
      const panelIdx = parseInt(card.dataset.panel);
      const cardIdx  = parseInt(card.dataset.card);
      [hwImgA, hwImgB].forEach(l => l.style.transition = 'opacity 0.22s ease');
      setHwImage(hwData[panelIdx].cards[cardIdx].img);
      document.querySelectorAll('.hw-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
    card.addEventListener('mouseleave', () => {
      hwHoverActive = false;
      [hwImgA, hwImgB].forEach(l => l.style.transition = 'opacity 0.6s ease');
      setHwImage(hwData[hwCurrentPanel].defaultImg);
      document.querySelectorAll('.hw-card').forEach(c => c.classList.remove('active'));
    });
  });

  const hwPanels = Array.from(document.querySelectorAll('.hardware-scroll-panel'));
  function updateHwPanel() {
    const mid = window.scrollY + window.innerHeight * 0.5;
    hwPanels.forEach((panel, i) => {
      const top = panel.getBoundingClientRect().top + window.scrollY;
      const bottom = top + panel.offsetHeight;
      if (mid >= top && mid < bottom && i !== hwCurrentPanel) {
        hwCurrentPanel = i;
        if (!hwHoverActive) {
          [hwImgA, hwImgB].forEach(l => l.style.transition = 'opacity 0.6s ease');
          setHwImage(hwData[i].defaultImg);
        }
      }
    });
  }
  window.addEventListener('scroll', updateHwPanel, { passive: true });
  updateHwPanel();

  // ─── Proof points ──────────────────────────────────────
  const docsUrl   = 'https://alistairmerritt.github.io/pivot/';
  const docsArrow = '<svg class="ext-arrow" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const docsLink  = (text) => `<a href="${docsUrl}" target="_blank" rel="noopener" class="proof-doc-link">${text} ${docsArrow}</a>`;
  const proofPoints = [
    { title: 'Local communication',       desc: 'Only communicates with Home Assistant through ESPHome. ' },
    { title: 'VPE functionality preserved',      desc: 'Wake word, voice interaction and the existing ESPHome integration remain a core part of the experience.' },
    { title: 'Reversible setup',                 desc: 'Firmware installation can be rolled back, and the software layers can be safely removed at any time.' },
    { title: `Open ${docsLink('documentation')}`, desc: `Source files, setup steps and architecture are documented so the system stays transparent.` },
  ];
  document.getElementById('proof-list').innerHTML = proofPoints.map(p => `
    <div>
      <div class="divider divider-dark"></div>
      <div class="proof-item">
        <div class="proof-item-title">${p.title}</div>
        <div class="proof-item-desc">${p.desc}</div>
      </div>
    </div>
  `).join('') + '<div class="divider divider-dark"></div>';

  // ─── Use cases ─────────────────────────────────────────
  const useCases = [
  { title: 'Lights',  icon: 'lightbulb-on',   body: 'Dim, brighten and toggle lights from one physical control, with LED feedback that can also mirror RGB colour for supported lights.', color: '#D0D0D0', progress: 0.65, bg: '#F8F8F8' },
  { title: 'Media',   icon: 'music-note',           body: 'Adjust volume instantly without opening an app or speaking over the room, with clear LED feedback as you turn.', color: '#E24D25', progress: 0.40, bg: '#FDF1EE' },
  { title: 'Climate', icon: 'thermometer',           body: 'Raise or lower temperature from a single tactile control, with optional colour feedback to make changes easier to read.', color: '#3DBA6A', progress: 0.55, bg: '#EFF9F3' },
  { title: 'Scenes',  icon: 'palette',        body: 'Trigger scenes, routines and presets with a single press, so the moments you use most are always within reach.', color: '#B46FE8', progress: 0.30, bg: '#F5EEF9' },
  { title: 'Timers',  icon: 'timer-outline',         body: 'Set, start and pause timers directly from the device, with LED ring progress and full visibility in Home Assistant.', color: '#F0C61D', progress: 0.75, bg: '#FEFAEE' },
  { title: 'Scripts & Custom Automations', icon: 'code-braces', body: 'Assign turns and presses to scripts or automations, unlocking anything Home Assistant can control.', color: '#006AFF', progress: 0.50, bg: '#EEF3FE' },
  ];
  const useGrid = document.getElementById('usecases-grid');
  useGrid.innerHTML = useCases.map((u, i) => `
    <div class="usecase-card" data-uc="${i}">
      <div class="usecase-icon-row">
        <i class="mdi mdi-${u.icon} usecase-icon"></i>
      </div>
      <div>
        <div class="usecase-title">${u.title}</div>
        <div class="usecase-body">${u.body}</div>
      </div>
    </div>
  `).join('');

  // ─── Get started paths ─────────────────────────────────
  const arrow = '<svg class="ext-arrow" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const paths = [
    { title: 'Pivot Dial',            body: 'A more refined enclosure for your existing VPE, designed to elevate it both physically and functionally. No additional firmware or software required.', ctas: [
      { label: 'Get the Dial', s: 'outline' },
    ]},
    { title: 'Pivot Software',        body: 'Install Pivot firmware and integration on your existing VPE to unlock banks, richer control, visual feedback and deeper Home Assistant integration.', ctas: [
      { label: 'Get started', s: 'primary', href: 'https://alistairmerritt.github.io/pivot/getting-started/' },
    ]},
    { title: 'Full Pivot Experience', body: 'Combine Pivot Dial and software for the most complete Pivot experience, uniting a more refined physical form with richer on-device control and deeper Home Assistant integration.', ctas: [
      { label: 'Get started',  s: 'primary', href: 'https://alistairmerritt.github.io/pivot/getting-started/' },
      { label: 'Get the Dial', s: 'outline' },
    ]},
    { title: 'Source files',          body: 'Browse, fork or contribute to the open-source firmware and Home Assistant integration that power Pivot.', ctas: [
      { label: 'Integration', s: 'dark', href: 'https://github.com/alistairmerritt/pivot-integration' },
      { label: 'Firmware',    s: 'dark', href: 'https://github.com/alistairmerritt/pivot-firmware' },
    ]},
  ];
  document.getElementById('start-grid').innerHTML = paths.map(p => `
    <div class="start-card">
      <div>
        <div class="start-title">${p.title}</div>
        <div class="start-body">${p.body}</div>
      </div>
      <div class="start-ctas">
        ${p.ctas.map(c => `<a href="${c.href || '#'}" ${c.href ? 'target="_blank" rel="noopener"' : ''} class="start-cta ${c.s}">${c.label} ${arrow}</a>`).join('')}
      </div>
    </div>
  `).join('');
})();

// ─── Contact modal ────────────────────────────────────
(() => {
  const overlay  = document.getElementById('contact-overlay');
  const closeBtn = document.getElementById('contact-close');
  const form     = document.getElementById('contact-form');
  const success  = document.getElementById('contact-success');

  function openContact() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeContact() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeContact(); });
  closeBtn.addEventListener('click', closeContact);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeContact(); });

  document.querySelectorAll('[data-contact]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); openContact(); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('https://formspree.io/f/xojraoga', {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      overlay.querySelector('.contact-modal-heading').style.display = 'none';
      overlay.querySelector('.contact-modal-desc').style.display = 'none';
      form.style.display = 'none';
      success.style.display = 'block';
    }
  });
})();
