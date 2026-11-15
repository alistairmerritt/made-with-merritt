// Every clock in the device pictures shows the visitor's own time and date,
// in their own 12- or 24-hour style, and turns over on the minute.
//   data-clock="time"     18:24 / 6:24   (as iOS and watchOS show it: no am/pm)
//   data-clock="date"     Thursday 12 November / Thursday, November 12
//   data-clock="menubar"  Thu 12 Nov 18:24 / Thu Nov 12 6:24 PM
(function () {
  'use strict';
  var clocks = document.querySelectorAll('[data-clock]');
  if (!clocks.length || !window.Intl) return;

  var time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  var date = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  var bar = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  // iOS drops the am/pm from the Lock Screen and status bar clocks.
  function bare(d) {
    return time.formatToParts(d).filter(function (p) { return p.type !== 'dayPeriod'; })
      .map(function (p) { return p.value; }).join('').trim();
  }

  function paint() {
    var d = new Date();
    var text = { time: bare(d), date: date.format(d), menubar: bar.format(d).replace(/,/g, '') };
    for (var i = 0; i < clocks.length; i++) {
      var t = text[clocks[i].getAttribute('data-clock')];
      if (t && clocks[i].textContent !== t) clocks[i].textContent = t;
    }
  }

  paint();
  setTimeout(function () { paint(); setInterval(paint, 60000); }, 60050 - (Date.now() % 60000));
})();
