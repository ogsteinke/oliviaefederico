/* "La nostra storia" / "Our story": the page scrolls through a fixed timeline.
   The couple from assets/runners/ runs at the top of the line, the line fills up
   as you go, and each moment (photo + words) appears and then makes room for the next.
   Markup: _story-it.qmd / _story-en.qmd. Style: story.css. */
(function () {
  var story = document.querySelector('.story');
  if (!story) return;
  var track = story.querySelector('.story-track');
  var stage = story.querySelector('.story-stage');
  var items = [].slice.call(story.querySelectorAll('.story-item'));
  var ticks = story.querySelector('.story-ticks');
  var fill = story.querySelector('.story-fill');
  var runnerSlot = story.querySelector('.story-runner');
  var n = items.length;
  if (!n || !track || !stage) return;

  story.classList.add('story-on');

  /* --- one dot per moment on the line; the year is written at its first moment --- */
  var tickEls = items.map(function (it, i) {
    var li = document.createElement('li');
    li.style.top = ((i + 0.5) / n * 100) + '%';
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', (it.querySelector('.story-date') || {}).textContent || String(i + 1));
    b.addEventListener('click', function () { goTo(i); });
    li.appendChild(b);
    var y = it.getAttribute('data-year');
    if (y && (i === 0 || items[i - 1].getAttribute('data-year') !== y)) {
      var s = document.createElement('span');
      s.className = 'year'; s.textContent = y;
      li.appendChild(s);
    }
    ticks.appendChild(li);
    return li;
  });

  /* --- the couple: reuse the running figure from assets/runners/runners.js --- */
  function adoptRunner() {
    if (runnerSlot.firstChild) return;
    var couple = document.querySelector('.runners--couple');
    if (couple) {
      runnerSlot.appendChild(couple);         // keeps running (and turning) with the scroll
    } else {
      var img = document.createElement('img'); // runners.js not on this page: still picture
      img.src = 'assets/runners/couple.webp';
      img.alt = '';
      runnerSlot.appendChild(img);
    }
  }

  /* --- the menu is sticky: start the stage just under it --- */
  function measure() {
    var nav = document.querySelector('.topnav');
    var h = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
    story.style.setProperty('--story-top', h + 'px');
  }

  var current = -1;
  function setCurrent(k) {
    if (k === current) return;
    current = k;
    items.forEach(function (it, i) {
      it.classList.toggle('is-active', i === k);
      it.classList.toggle('is-past', i < k);
      it.setAttribute('aria-hidden', i === k ? 'false' : 'true');
    });
    tickEls.forEach(function (t, i) {
      t.classList.toggle('is-done', i < k);
      t.classList.toggle('is-current', i === k);
    });
  }

  function progress() {
    var r = track.getBoundingClientRect();
    var top = parseFloat(getComputedStyle(story).getPropertyValue('--story-top')) || 0;
    var total = track.offsetHeight - stage.offsetHeight;
    return total > 0 ? Math.min(1, Math.max(0, (top - r.top) / total)) : 0;
  }

  function goTo(i) {
    var top = parseFloat(getComputedStyle(story).getPropertyValue('--story-top')) || 0;
    var total = track.offsetHeight - stage.offsetHeight;
    var y = window.scrollY + track.getBoundingClientRect().top - top + total * (i + 0.5) / n;
    window.scrollTo({ top: Math.round(y), behavior: 'smooth' });
  }

  var ticking = false;
  function update() {
    ticking = false;
    var p = progress();
    setCurrent(Math.min(n - 1, Math.floor(p * n)));
    if (fill) fill.style.height = (p * 100) + '%';
    var r = track.getBoundingClientRect();
    document.body.classList.toggle('story-in-view', r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  function start() {
    adoptRunner();
    measure();
    update();
  }
  measure();
  update();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); });
})();
