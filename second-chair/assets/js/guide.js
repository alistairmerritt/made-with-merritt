// The setup guide: highlight where you are in the contents, and copy the Terminal command.
// The page works fully without this.
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
      // The topmost section on screen wins; inside Continue Listening, its parts win over the chapter.
      var shown = sections.filter(function (s) { return visible.has(s); });
      var top = shown.filter(function (s) { return !shown.some(function (o) { return o !== s && s.contains(o); }); })[0];
      if (top) mark(top.id);
    }, { rootMargin: '-15% 0px -60% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  // On small screens the contents start closed, so the steps come first.
  var toc = document.querySelector('.g-toc');
  if (toc && window.matchMedia('(max-width: 899px)').matches) toc.removeAttribute('open');
  // Close it after a jump on small screens.
  if (toc) toc.addEventListener('click', function (e) {
    if (e.target.closest('a') && window.matchMedia('(max-width: 899px)').matches) toc.removeAttribute('open');
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
