// The guides: highlight where you are in the contents, open collapsed sections that a link points into,
// and copy the Terminal command. The pages work fully without this.
(function () {
  'use strict';

  // Contents: mark the section being read.
  var links = Array.prototype.slice.call(document.querySelectorAll('.g-toc a[href^="#"]'));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var sections = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var current = null;
  function mark(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (a) { a.removeAttribute('aria-current'); });
    if (byId[id]) byId[id].setAttribute('aria-current', 'true');
  }
  if ('IntersectionObserver' in window && sections.length) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      // The topmost section on screen wins; a part inside a section wins over the section.
      var shown = sections.filter(function (s) { return visible.has(s); });
      var top = shown.filter(function (s) { return !shown.some(function (o) { return o !== s && s.contains(o); }); })[0];
      if (top) mark(top.id);
    }, { rootMargin: '-15% 0px -60% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  // On small screens the contents start closed, so the page comes first.
  var toc = document.querySelector('.g-toc');
  var small = window.matchMedia('(max-width: 899px)');
  if (toc && small.matches) toc.removeAttribute('open');
  if (toc) toc.addEventListener('click', function (e) {
    if (e.target.closest('a') && small.matches) toc.removeAttribute('open');
  });

  // A link to something inside a closed disclosure opens it (and any around it) first.
  function reveal(id, scroll) {
    var el = id && document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'DETAILS') el.open = true;
    for (var d = el.parentElement && el.parentElement.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) {
      if (!d.classList.contains('g-toc')) d.open = true;
    }
    if (scroll) el.scrollIntoView();
  }
  function fromHash(scroll) { try { reveal(decodeURIComponent(location.hash.slice(1)), scroll); } catch (e) {} }
  fromHash(true);
  window.addEventListener('hashchange', function () { fromHash(true); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1) reveal(a.getAttribute('href').slice(1), false);
  });

  // Copy buttons.
  document.querySelectorAll('.code .copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.parentElement.querySelector('code').textContent;
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { btn.textContent = 'Select and copy'; });
      else btn.textContent = 'Select and copy';
    });
  });
})();
