/* Pivot — landing page interactions */
(() => {
  // Exit early on any other page that loads script.js.
  if (!document.getElementById('hero')) return;

  const ACCENT = '#E24D25';
  // Disable scroll animations on any touch-first device (phones, iPads, etc.)
  const isMobile = !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.innerWidth <= 1100;

  // ─── Layout helper ────────────────────────────────────
  // offsetTop traversal — not affected by CSS transforms or load timing.
  // Returns a static document-relative top that is safe to cache.
  function naturalDocTop(el) {
    let top = 0, e = el;
    while (e) { top += e.offsetTop; e = e.offsetParent; }
    return top;
  }

  // ─── Hero curtain departure progress (0→1 as hero scrolls away) ───────────
  const heroEl = document.getElementById('hero');
  // Cached once; refreshed on resize. Avoids layout reads inside scroll handlers.
  let _heroTop = heroEl ? naturalDocTop(heroEl) : 0;
  let _heroH   = heroEl ? heroEl.offsetHeight   : 0;
  // Register hero recache first so curtainP() is always up-to-date for subsequent resize handlers.
  window.addEventListener('resize', () => {
    if (heroEl) { _heroTop = naturalDocTop(heroEl); _heroH = heroEl.offsetHeight; }
  });

  const curtainP = () => {
    if (!_heroH) return 0;
    return Math.max(0, Math.min(1, (window.scrollY - _heroTop) / _heroH));
  };

  // ─── Hero hand parallax (desktop only) ────────────────
  const heroHandEl = document.getElementById('hero-hand');
  if (heroHandEl && !isMobile) {
    const updateHandParallax = () => {
      const scrolled = window.scrollY;
      if (scrolled <= _heroH) {
        heroHandEl.style.transform = `translateY(${scrolled * 0.18}px)`;
      }
    };
    window.addEventListener('scroll', updateHandParallax, { passive: true });
  }

  // ─── Nav scroll state ──────────────────────────────────
  const nav        = document.getElementById('nav');
  const mobileMenu = document.getElementById('nav-mobile-menu');
  const TOPBAR_H   = 32;
  const NAV_H      = 80;
  const onScroll = () => {
    if (!nav) return;
    const y      = window.scrollY;
    const navTop = Math.max(0, TOPBAR_H - y);
    nav.style.top = navTop + 'px';
    if (mobileMenu) mobileMenu.style.top = (navTop + NAV_H) + 'px';
    nav.classList.toggle('scrolled', y > 80);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── Hamburger menu ────────────────────────────────────
  const hamburger     = document.getElementById('nav-hamburger');
  const mobileOverlay = document.getElementById('nav-mobile-overlay');

  if (hamburger && mobileMenu && mobileOverlay && nav) {
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
  }

  // ─── Scroll-reveal text ────────────────────────────────
  const reveals = document.querySelectorAll('[data-reveal]');
  reveals.forEach(el => {
    const dark  = el.classList.contains('reveal-text-dark');
    const track = el.closest('[data-reveal-track]');
    const rawLines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = '';

    const lines = rawLines.map(lineHtml => {
      const lineEl = document.createElement('span');
      lineEl.className = 'reveal-line';
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

    // Heights are cached (stable); tops for non-sticky lines use naturalDocTop
    // (those elements are not inside a transformed ancestor).
    // For the sticky track, top is also cached — the curtain additive offset
    // (curtainP) already accounts for the why-stack transform in the formula.
    let _trackTop = 0, _trackH = 0, _lineTops = [];
    const recache = () => {
      if (track) {
        _trackTop = naturalDocTop(track);
        _trackH   = track.offsetHeight;
      } else {
        _lineTops = lines.map(({ el: lineEl }) => naturalDocTop(lineEl));
      }
    };

    const update = () => {
      const vh      = window.innerHeight;
      const scrollY = window.scrollY;

      if (track) {
        const trackTopVP = _trackTop - scrollY;
        const range = Math.max(1, _trackH - vh);
        const p  = Math.max(0, Math.min(1, -trackTopVP / range));
        const ep = p + curtainP() * 0.2125;

        const linePause   = 0.05;
        const segW        = (1.2125 - linePause * (nSegs - 1)) / nSegs;
        lines.forEach(({ el: lineEl, wordSpans }, i) => {
          const segIdx  = (mergeLastTwo && i === n - 1) ? nSegs - 1 : i;
          const segStart = segIdx * (segW + linePause);
          const segEnd   = segStart + segW;
          const segP     = Math.max(0, Math.min(1, (ep - segStart) / (segEnd - segStart)));
          const maxTy    = p > 0 ? vh * 0.25 : 0;
          lineEl.style.transform = `translateY(${(1 - segP) * maxTy}px)`;
          lineEl.style.opacity   = Math.min(1, segP * 8).toString();
          lineEl.style.filter    = `blur(${(1 - Math.min(1, segP / 0.85)) * 6}px)`;
          const fadeP  = Math.max(0, Math.min(1, (segP - 0.65) / 0.35));
          const alpha  = dark ? 0.15 + fadeP * 0.85 : 0.12 + fadeP * 0.88;
          const colour = dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
          wordSpans.forEach(s => s.style.color = colour);
        });
      } else {
        lines.forEach(({ el: lineEl, wordSpans }, i) => {
          const lineTopVP = _lineTops[i] - scrollY;
          const p      = Math.max(0, Math.min(1, (vh - lineTopVP) / (vh * 0.7)));
          const alpha  = dark ? 0.15 + p * 0.85 : 0.12 + p * 0.88;
          const colour = dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
          wordSpans.forEach(s => s.style.color = colour);
          lineEl.style.filter = `blur(${(1 - p) * 3}px)`;
        });
      }
    };

    if (isMobile) {
      lines.forEach(({ el: lineEl, wordSpans }) => {
        lineEl.style.opacity = '1';
        lineEl.style.filter  = '';
        const colour = dark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)';
        wordSpans.forEach(s => s.style.color = colour);
      });
    } else {
      recache();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', () => { recache(); update(); });
      update();
    }
  });

  // ─── Why Pivot? label scale animation ─────────────────
  const whyTrack = document.querySelector('[data-reveal-track]');
  const whyInner = document.querySelector('.why-inner');
  const whyLabel = document.querySelector('.why-label');
  if (!isMobile && whyTrack && whyInner) {
    if (whyLabel) whyLabel.style.transformOrigin = 'left center';
    let _whyTrackTop = naturalDocTop(whyTrack);
    let _whyTrackH   = whyTrack.offsetHeight;
    const updateWhyBlock = () => {
      const vh      = window.innerHeight;
      const scrollY = window.scrollY;
      const cp = curtainP();
      const ty = (1 - cp) * (vh * 0.5 + 149);
      whyInner.style.transform = `translateY(${ty}px)`;
      if (whyLabel) {
        const trackTopVP  = _whyTrackTop - scrollY;
        const range = Math.max(1, _whyTrackH - vh);
        const p     = Math.max(0, Math.min(1, -trackTopVP / range));
        const ep    = Math.min(1, p + cp * 0.2125);
        const shrinkP = Math.max(0, Math.min(1, ep / 0.2125));
        whyLabel.style.transform = `scale(${1.5 - shrinkP * 0.5})`;
      }
    };
    window.addEventListener('scroll', updateWhyBlock, { passive: true });
    window.addEventListener('resize', () => {
      _whyTrackTop = naturalDocTop(whyTrack);
      _whyTrackH   = whyTrack.offsetHeight;
      updateWhyBlock();
    });
    updateWhyBlock();
  }

  // ─── Dial-intro black reveal on scroll ─────────────────
  const dialIntroEl      = document.getElementById('dial-intro');
  const dialIntroReveal  = document.getElementById('dial-intro-reveal');
  const dialIntroContent = dialIntroEl && dialIntroEl.querySelector('.dial-intro-content');
  const dialIntroOverlay = dialIntroEl && dialIntroEl.querySelector('.dial-intro-overlay');
  if (dialIntroEl && dialIntroReveal) {
    if (isMobile) {
      dialIntroReveal.style.opacity = '0';
      if (dialIntroContent) {
        dialIntroContent.style.opacity   = '1';
        dialIntroContent.style.transform = 'none';
      }
      if (dialIntroOverlay) dialIntroOverlay.style.opacity = '1';
    } else {
      const updateDialReveal = () => {
        const rect = dialIntroEl.getBoundingClientRect();
        const vh   = window.innerHeight;
        const p = Math.max(0, Math.min(1, (vh - rect.top) / vh));
        dialIntroReveal.style.opacity = (1 - p).toString();
        if (dialIntroContent) {
          dialIntroContent.style.opacity   = p.toString();
          dialIntroContent.style.transform = `translateY(${(1 - p) * 36}px)`;
        }
        if (dialIntroOverlay) dialIntroOverlay.style.opacity = p.toString();
      };
      window.addEventListener('scroll', updateDialReveal, { passive: true });
      window.addEventListener('resize', updateDialReveal);
      updateDialReveal();
    }
  }

  // ─── Curtain reveal helper ─────────────────────────────────────────
  function makeCurtain(upperEl, lowerStack, options) {
    if (!upperEl || !lowerStack) return;
    const stickyEls = options && options.stickyFix
      ? Array.from(lowerStack.querySelectorAll(options.stickyFix))
      : [];

    let _upperTop = naturalDocTop(upperEl);
    let _upperH   = upperEl.offsetHeight;
    let _lowerTop = naturalDocTop(lowerStack);

    const update = () => {
      const scrollY = window.scrollY;
      if (scrollY >= _upperTop && scrollY < _upperTop + _upperH) {
        lowerStack.style.transform  = `translateY(${-(_lowerTop - scrollY)}px)`;
        lowerStack.style.willChange = 'transform';
        stickyEls.forEach(el => { el.style.position = 'relative'; });
      } else {
        lowerStack.style.transform  = '';
        lowerStack.style.willChange = '';
        stickyEls.forEach(el => { el.style.position = ''; });
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', () => {
      _upperTop = naturalDocTop(upperEl);
      _upperH   = upperEl.offsetHeight;
      _lowerTop = naturalDocTop(lowerStack);
      update();
    });
    update();
  }

  if (!isMobile) {
    // Hero → Why+Interaction curtain (.why-sticky needs the sticky fix)
    makeCurtain(
      document.getElementById('hero'),
      document.getElementById('why-stack'),
      { stickyFix: '.why-sticky' }
    );
    // Dial-intro → Hardware curtain (no sticky children inside)
    makeCurtain(dialIntroEl, document.getElementById('hardware-stack'));
  }

  // ─── Interaction: hover (desktop) / tap (tablet) / scroll-center (phone) ───
  const tpkCols    = Array.from(document.querySelectorAll('.tpk-col'));
  const tpkIsTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const tpkIsPhone = tpkIsTouch && window.innerWidth <= 640;

  if (!tpkIsTouch) {
    // Desktop: hover plays video
    tpkCols.forEach(col => {
      const video = col.querySelector('.tpk-video');
      col.addEventListener('mouseenter', () => {
        tpkCols.forEach(c => { c.classList.remove('tpk-active'); const v = c.querySelector('.tpk-video'); if (v) { v.pause(); v.currentTime = 0; } });
        col.classList.add('tpk-active');
        if (!video) return;
        video.play().catch(() => {});
      });
      col.addEventListener('mouseleave', () => {
        col.classList.remove('tpk-active');
        if (video) { video.pause(); video.currentTime = 0; }
      });
    });
  } else {
    // Tablet: all cards static at full opacity, tap to play/pause video
    if (!tpkIsPhone) {
      tpkCols.forEach(col => {
        const video = col.querySelector('.tpk-video');
        if (!video) return;
        col.addEventListener('click', () => {
          const playing = !video.paused;
          tpkCols.forEach(c => { const v = c.querySelector('.tpk-video'); if (v) { v.pause(); v.currentTime = 0; } });
          if (!playing) video.play().catch(() => {});
        });
      });
    } else {
      // Phone: scroll to centre highlights closest card
      let tpkActive = -1;
      let _tpkCenters = tpkCols.map(col => naturalDocTop(col) + col.offsetHeight / 2);

      function tpkUpdate() {
        const vc      = window.innerHeight / 2;
        const scrollY = window.scrollY;
        let closest = 0, minDist = Infinity;
        _tpkCenters.forEach((center, i) => {
          const dist = Math.abs((center - scrollY) - vc);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        if (closest === tpkActive) return;
        tpkActive = closest;
        tpkCols.forEach((col, i) => {
          const video = col.querySelector('.tpk-video');
          col.classList.toggle('tpk-active', i === closest);
          if (i === closest) {
            video?.play().catch(() => {});
          } else {
            if (video) { video.pause(); video.currentTime = 0; }
          }
        });
      }

      window.addEventListener('scroll', tpkUpdate, { passive: true });
      window.addEventListener('resize', () => {
        _tpkCenters = tpkCols.map(col => naturalDocTop(col) + col.offsetHeight / 2);
        tpkUpdate();
      });
      tpkUpdate();
    }
  }

  // ─── Banks ─────────────────────────────────────────────
  const banks = [
    { name: 'HomePod',   label: '70%',     color: '#006AFF', bg: '#EDF3FF', image: '/assets/bank-1.png', value: 0.70 },
    { name: 'Lamp',  label: '60%', color: '#E24D25', bg: '#FDF1EE', image: '/assets/bank-2.png', value: 0.60 },
    { name: 'Thermostat', label: '30°',    color: '#3DBA6A', bg: '#EFF9F3', image: '/assets/bank-3.png', value: 1.0 },
    { name: 'Timer',   label: '15m',  color: '#B46FE8', bg: '#F5EEF9', image: '/assets/bank-4.png', value: 0.55 },
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
  let bankAutoIdx  = 0;
  let bankHoverIdx = null;

  function bankDisplayIdx() {
    return bankHoverIdx !== null ? bankHoverIdx : bankAutoIdx;
  }

  function renderBankState() {
    const di = bankDisplayIdx();
    pillEls.forEach((pill, idx) => {
      const b = banks[idx];
      const dot  = pill.querySelector('.bank-pill-dot');
      const fill = pill.querySelector('.bank-pill-bar-fill');
      const isActive = idx === di;
      pill.classList.toggle('active', isActive);
      dot.style.background  = isActive ? b.color : '#C0C0C0';
      dot.style.boxShadow   = isActive ? `0 0 6px ${b.color}80` : 'none';
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
    { label: 'Firmware',    subtitle: 'for richer on-device control',                         desc: 'Pivot firmware expands what the Home Assistant Voice Preview Edition (VPE) can do on-device, adding colour-coded banks, tactile knob interaction, LED feedback, and event firing into Home Assistant. It\'s built on ESPHome, and uses the original Nabu Casa firmware as its foundation.', hoverImage: '/assets/firmware-hover.jpg',      clickImage: '/assets/firmware-accordian.jpg'    },
    { label: 'Integration', subtitle: 'for easy setup and configuration in Home Assistant',   desc: 'The Pivot integration bridges Pivot firmware and Home Assistant, connecting each bank to the entities, scenes and scripts already in your setup. It also provides controls for audio feedback, colours, display behaviour and device preferences.',              hoverImage: '/assets/integration-hover.jpg',   clickImage: '/assets/integration-accordian.jpg' },
    { label: 'Dashboard',   subtitle: 'for visual feedback and UI support',                   desc: 'The dashboard adds an optional visual layer to Pivot, offering a clearer UI for those who want the physical and digital parts of the system to be easier to read and digest.',  hoverImage: '/assets/dashboard-hover.jpg',     clickImage: '/assets/dashboard-accordian.jpg'   },
    { label: 'Hardware',    subtitle: 'for a more functional physical form',                  desc: 'The Pivot Dial gives the VPE a more considered form, designed around touch, clearer microphone pickup and placement within the home.',                                              hoverImage: '/assets/hardware-hover.jpg',      clickImage: '/assets/hardware-accordian.jpg'    },
  ];
  const ECO_DEFAULT_IMAGE = '/assets/default-accordian.jpg';
  const ECO_DISCLAIMERS = {
    '/assets/integration-accordian.jpg': 'For illustrative purposes only.',
    '/assets/dashboard-accordian.jpg':   'Actual dashboard shown.',
  };
  const accordionEl   = document.getElementById('ecosystem-accordion');
  const imgA          = document.getElementById('eco-img-a');
  const imgB          = document.getElementById('eco-img-b');
  const ecoDisclaimer = document.getElementById('eco-disclaimer');
  let activeLayer = imgA;
  let ecoZ = 1;
  imgA.style.backgroundImage = `url('${ECO_DEFAULT_IMAGE}')`;
  imgA.style.opacity = '1';
  imgA.style.zIndex  = '1';
  imgB.style.opacity = '0';
  imgB.style.zIndex  = '0';
  accordionEl.innerHTML = ecosystemItems.map((item) => `
    <div class="accordion-item" data-hover-image="${item.hoverImage}" data-click-image="${item.clickImage}">
      <button class="accordion-trigger">
        <span class="accordion-trigger-text">
          <span class="accordion-label">${item.label}</span>
          <span class="accordion-subtitle">${item.subtitle}</span>
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
    prev.style.transition = 'none';
    prev.style.opacity = '1';
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
        if (!isMobile) setEcosystemImage(ECO_DEFAULT_IMAGE);
      } else {
        item.classList.add('active');
        trigger.querySelector('.accordion-icon').textContent = '−';
        if (!isMobile) setEcosystemImage(item.dataset.clickImage);
      }
      if (!isMobile) requestAnimationFrame(() => {
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
      defaultImg: '/assets/hardware-fold-design.jpg',
      cards: [
        { label: 'Dial',              note: 'Combines the dial and button into one tactile control. <br> Turn to adjust, press to select.',                                 img: '/assets/hardware-dial-detail.jpg'  },
        { label: 'Diffused LED ring', note: '12-segment feedback channels hidden beneath the printed surface for a cleaner face.',                                          img: '/assets/hardware-led-ring.jpg'     },
        { label: 'Mount',             note: 'Three mount options to suit any surface or placement, with the upright angled mount helping conceal the cable.* <br><span class="hw-card-footnote">*Right-angle USBC adapter required</span>',  img: '/assets/hardware-mount-detail.jpg' },
      ]
    },
    {
      defaultImg: '/assets/hardware-fold-mount.jpg',
      cards: [
        { label: 'Upright angled mount', note: 'An angled form that brings the dial forward and helps conceal the cable behind the body.',                            img: '/assets/hardware-mount-desk-upright.jpg' },
        { label: 'Raised flat mount',   note: 'A lower-profile mount for horizontal surfaces, or for fixing the Flat Build at a slight angle.',                      img: '/assets/hardware-mount-lowprofile.jpg'  },
        { label: 'Flat mount',          note: 'A simple, low-profile mount for vertical or fixed surfaces. Works best with the Flat Build.',                         img: '/assets/mount-wall-flat.jpg'    },
      ]
    },
    {
      defaultImg: '/assets/hardware-fold-hero.jpg',
      cards: [
        { label: 'Body',   note: 'Choose the body style that suits how and where Pivot Dial will be used.',                                                         img: '/assets/hardware-body.jpg'   },
        { label: 'Colour', note: 'Explore subtle or contrasting combinations across the enclosure, dial and mount.',                                         img: '/assets/hardware-color.jpg' },
        { label: 'Remix', note: 'Edit the STL files to refine details, adjust the form or adapt Pivot Dial to your setup.',                       img: '/assets/hardware-remix.jpg'  },
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
    if (isMobile) {
      const panelEl = document.querySelector(`[data-hw-panel="${panelIdx}"]`);
      if (panelEl) {
        const img = document.createElement('div');
        img.className = 'hw-panel-mobile-img';
        img.style.backgroundImage = `url('${panel.defaultImg}')`;
        panelEl.insertBefore(img, panelEl.firstChild);
      }
    }
  });

  const hwImgA = document.getElementById('hw-img-a');
  const hwImgB = document.getElementById('hw-img-b');
  let hwActiveLayer  = hwImgA;
  let hwCurrentPanel = 0;
  let hwHoverActive  = false;
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
  // Panel heights are stable — only read on resize. Tops must be read live via
  // getBoundingClientRect because the panels live inside #hardware-stack, which
  // receives a transform from makeCurtain; naturalDocTop ignores transforms and
  // would produce wrong trigger points while the curtain animation is active.
  let _hwPanelHeights = hwPanels.map(p => p.offsetHeight);

  function updateHwPanel() {
    const mid     = window.scrollY + window.innerHeight * 0.5;
    const scrollY = window.scrollY;
    hwPanels.forEach((panel, i) => {
      const top    = panel.getBoundingClientRect().top + scrollY;
      const bottom = top + _hwPanelHeights[i];
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
  window.addEventListener('resize', () => {
    _hwPanelHeights = hwPanels.map(p => p.offsetHeight);
    updateHwPanel();
  });
  updateHwPanel();

  // ─── Proof points ──────────────────────────────────────
  const docsUrl   = 'https://alistairmerritt.github.io/pivot/';
  const docsArrow = '<svg class="ext-arrow" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const docsLink  = (text) => `<a href="${docsUrl}" target="_blank" rel="noopener" class="proof-doc-link">${text} ${docsArrow}</a>`;
  const proofPoints = [
    { title: 'Local communication',              desc: 'Communicates locally with Home Assistant through ESPHome.' },
    { title: 'VPE functionality preserved',      desc: 'Wake word, voice interaction, and the core Voice Preview Edition experience remain central.' },
    { title: 'Reversible setup',                 desc: 'Firmware can be rolled back, software layers can be safely removed, and the original enclosure can be reassembled.' },
    { title: `Open ${docsLink('documentation')}`, desc: `Source files, setup steps, architecture, and build guidance are documented so the system stays transparent.` },
    { title: 'Flexible hardware',                desc: 'Different mount and body options, self-printable parts, and an adaptable design give you more freedom in how Pivot comes together.' },
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
      <div class="usecase-header">
        <div class="usecase-icon-row">
          <i class="mdi mdi-${u.icon} usecase-icon"></i>
        </div>
        <div class="usecase-title">${u.title}</div>
        <i class="mdi mdi-chevron-down usecase-chevron" aria-hidden="true"></i>
      </div>
      <div class="usecase-body-wrap">
        <div class="usecase-body-inner">
          <div class="usecase-body">${u.body}</div>
        </div>
      </div>
    </div>
  `).join('');

  // ─── Mobile accordion ─────────────────────────────────
  const isMobileQ = window.matchMedia('(max-width: 640px)');
  const ucCards = useGrid.querySelectorAll('.usecase-card');
  ucCards.forEach(card => {
    card.querySelector('.usecase-header').addEventListener('click', () => {
      if (!isMobileQ.matches) return;
      const isOpen = card.classList.contains('is-open');
      ucCards.forEach(c => c.classList.remove('is-open'));
      if (!isOpen) card.classList.add('is-open');
    });
  });

  // ─── Get started paths ─────────────────────────────────
  const arrow = '<svg class="ext-arrow" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const paths = [
    { title: 'Pivot Dial',            body: 'A redesigned enclosure for your existing VPE, made to elevate it both physically and functionally. No additional firmware or software required.', ctas: [
      { label: 'Explore the build', s: 'primary', href: '/pivot/build/', noArrow: true },
      { label: 'Get the print files', s: 'outline', href: 'https://pivotonian.gumroad.com/l/pivot-dial', ext: true },
    ]},
    { title: 'Pivot Software',        body: 'Install Pivot firmware and integration on your existing VPE to unlock banks, richer control, visual feedback and deeper Home Assistant integration.', ctas: [
      { label: 'Set up Pivot software', s: 'outline', href: 'https://alistairmerritt.github.io/pivot/getting-started/', ext: true },
    ]},
    { title: 'Full Pivot Experience', body: 'Combine Pivot Dial and software for the most complete Pivot experience, uniting a more refined physical form with richer on-device control and deeper Home Assistant integration.', ctas: [
      { label: 'Set up Pivot software', s: 'outline', href: 'https://alistairmerritt.github.io/pivot/getting-started/', ext: true },
      { label: 'Explore the build',      s: 'primary', href: '/pivot/build/', noArrow: true },
    ]},
    { title: 'Source files',          body: 'Browse, fork or contribute to the open-source firmware and Home Assistant integration that power Pivot.', ctas: [
      { label: 'Integration', s: 'dark', href: 'https://github.com/alistairmerritt/pivot-integration', ext: true },
      { label: 'Firmware',    s: 'dark', href: 'https://github.com/alistairmerritt/pivot-firmware', ext: true },
    ]},
  ];
  document.getElementById('start-grid').innerHTML = paths.map(p => `
    <div class="start-card">
      <div>
        <div class="start-title">${p.title}</div>
        <div class="start-body">${p.body}</div>
      </div>
      <div class="start-ctas">
        ${p.ctas.map(c => `<a href="${c.href || '#'}" ${c.ext ? 'target="_blank" rel="noopener"' : ''} class="start-cta ${c.s}">${c.label}${c.noArrow ? '' : ` ${arrow}`}</a>`).join('')}
      </div>
    </div>
  `).join('');

  // ─── Hardware sticky bar ────────────────────────────
  const hwStickyBar   = document.getElementById('hw-sticky-bar');
  const hwStickyClose = document.getElementById('hw-sticky-close');
  const hwStickyEndEl = document.getElementById('docs');
  let hwStickyDismissed = false;

  if (hwStickyClose) {
    hwStickyClose.addEventListener('click', () => {
      hwStickyDismissed = true;
      hwStickyBar.classList.remove('hw-sticky-visible');
      hwStickyBar.setAttribute('aria-hidden', 'true');
    });
  }

  let _dialIntroDocBottom = dialIntroEl  ? naturalDocTop(dialIntroEl)  + dialIntroEl.offsetHeight  : 0;
  let _hwStickyEndTop     = hwStickyEndEl ? naturalDocTop(hwStickyEndEl) : 0;

  function updateHwStickyBar() {
    if (!hwStickyBar || !dialIntroEl || !hwStickyEndEl || hwStickyDismissed) return;
    const scrollY     = window.scrollY;
    const vh          = window.innerHeight;
    const dialBottom  = _dialIntroDocBottom - scrollY;
    const usecasesTop = _hwStickyEndTop - scrollY;
    const show = dialBottom < vh * 0.8 && usecasesTop > vh * 0.97;
    const visible = hwStickyBar.classList.contains('hw-sticky-visible');
    if (show !== visible) {
      hwStickyBar.classList.toggle('hw-sticky-visible', show);
      hwStickyBar.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
  }
  window.addEventListener('scroll', updateHwStickyBar, { passive: true });
  window.addEventListener('resize', () => {
    if (dialIntroEl)   _dialIntroDocBottom = naturalDocTop(dialIntroEl)   + dialIntroEl.offsetHeight;
    if (hwStickyEndEl) _hwStickyEndTop     = naturalDocTop(hwStickyEndEl);
    updateHwStickyBar();
  });
  updateHwStickyBar();

  // ─── Post-load cache refresh ──────────────────────────
  // Images above the fold can shift layout after the script's initial cache run.
  // Firing a synthetic resize after load refreshes all cached positions with the
  // correct fully-loaded layout, fixing curtain trigger points.
  window.addEventListener('load', () => window.dispatchEvent(new Event('resize')));

})();

// ─── Interest modal ────────────────────────────────────
(() => {
  const overlay  = document.getElementById('interest-overlay');
  if (!overlay) return;
  const closeBtn = document.getElementById('interest-close');
  const form     = document.getElementById('interest-form');
  const success  = document.getElementById('interest-success');

  function openInterest() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeInterest() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeInterest(); });
  closeBtn.addEventListener('click', closeInterest);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeInterest(); });

  document.querySelectorAll('[data-interest]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); openInterest(); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('https://formspree.io/f/mdabezav', {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      form.style.display    = 'none';
      success.style.display = 'block';
    }
  });
})();

// ─── Contact modal ────────────────────────────────────
(() => {
  const overlay  = document.getElementById('contact-overlay');
  if (!overlay) return;
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

  if (new URLSearchParams(window.location.search).get('contact') === '1') {
    history.replaceState(null, '', window.location.pathname);
    setTimeout(openContact, 50);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('https://formspree.io/f/xojraoga', {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      overlay.querySelector('.contact-modal-heading').style.display = 'none';
      overlay.querySelector('.contact-modal-desc').style.display    = 'none';
      form.style.display    = 'none';
      success.style.display = 'block';
    }
  });
})();
