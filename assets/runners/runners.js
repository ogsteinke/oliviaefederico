/* The couple (bottom right) and the dog, Mela (bottom left), run while
   the page scrolls. Scrolling up makes them turn around.

   PLACEHOLDER ART: the figures are a demo drawing (by Elena Domenichini,
   from another couple's invitation). To use your own illustration, ask your
   illustrator for the same figures with the legs removed (*-body.webp, with
   transparent background) and adjust the hip points and leg sizes in RIGS
   below. Ask Claude to help: it can line the legs up from a screenshot.

   How it works: the bodies are drawings with the legs removed
   (*-body.webp). The legs are drawn live in SVG as jointed pieces
   (thigh, shin, foot) in the same colours, and swing through a run
   cycle (people) or a gallop (dogs) driven by how far you scroll.

   Self-contained: the only hook is one <script> line in _quarto.yml. */
(function () {
  var body = document.body;
  if (!body || !(body.classList.contains('page-it') || body.classList.contains('page-en'))) return;

  var me = document.currentScript || document.querySelector('script[src*="runners.js"]');
  var base = me ? me.src.replace(/[^\/]*$/, '') : 'assets/runners/';

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = base + 'runners.css?v=2';
  document.head.appendChild(css);

  var SVGNS = 'http://www.w3.org/2000/svg';
  var NAVY = '#0d4767';
  var D2R = Math.PI / 180;
  function cos(x) { return Math.cos(x); }
  function sin(x) { return Math.sin(x); }
  function bump(x) { return (1 - Math.cos(x)) / 2; }   // 0 at x=0, 1 at x=pi

  /* ---------- run cycles: angles in degrees from straight down, + = forward ---------- */

  // A person: p = phase in radians. Thigh swings, knee folds during the swing.
  function human(p, k) {
    k = k || 1;
    var thigh = 12 + 38 * k * sin(p);
    var flex = 8 + 85 * k * Math.pow(Math.max(0, cos(p + 0.35)), 1.6);
    var shin = thigh - flex;
    var foot = shin + 92 - 20 * Math.max(0, -sin(p + 0.6)) * k;  // toe points down a bit at push-off
    return [thigh, shin, foot];
  }
  // Dog gallop: p = 0 stretched out (hind back, front forward), p = pi gathered under the body
  function hind(p) {
    var a1 = 12 - 52 * cos(p);
    var a2 = a1 - 35 - 28 * bump(p);
    var a3 = a2 - 5 + 70 * bump(p);
    return [a1, a2, a3];
  }
  function front(p) {
    var q = p + 0.5;                          // front legs fold a little later
    var a1 = 22 + 55 * cos(p);
    var a2 = a1 + 6 - 52 * Math.pow(bump(q), 1.3);
    var a3 = a2 - 8 - 25 * bump(q);
    return [a1, a2, a3];
  }

  /* ---------- the four runners ---------- */
  // Coordinates are pixels of the original invitation crops.
  var TROUSER = '#5d7e93', TROUSER_FAR = '#4f6f84', SHOE = '#3a5a78', SOCK = '#f7f3ea';
  var DRESS = '#fcfaf0', BSHOE = '#fffdf7';
  var DOG = '#658397', DOG_FAR = '#56717f', POO = '#91a7be', POO_FAR = '#7f95ab';

  var RIGS = {
    couple: {
      img: 'couple-body.webp', view: [0, 0, 2234, 1580], box: [0, 0, 2234, 1530],
      cycles: 1, rest: 1.15, bob: [14, 2],   // bob: [amplitude, bounces per cycle]
      legs: [
        // bride (behind the skirt), a quarter cycle out of step with the groom
        { hip: [760, 1080], fn: human, k: 0.7, off: Math.PI + 0.9, layer: 'back',
          segs: [[240, 90, DRESS], [235, 70, DRESS], [150, 58, BSHOE]] },
        { hip: [800, 1080], fn: human, k: 0.7, off: 0.9, layer: 'back',
          segs: [[240, 90, DRESS], [235, 70, DRESS], [150, 58, BSHOE]] },
        // groom (behind the jacket)
        { hip: [1545, 860], fn: human, k: 1, off: Math.PI, layer: 'back', sock: true,
          segs: [[300, 135, TROUSER_FAR], [285, 118, TROUSER_FAR], [175, 80, SHOE]] },
        { hip: [1650, 860], fn: human, k: 1, off: 0, layer: 'back', sock: true,
          segs: [[300, 140, TROUSER], [285, 122, TROUSER], [175, 82, SHOE]] }
      ]
    },
    dog: {
      img: 'black-dog-body.webp', view: [0, 0, 932, 640], box: [0, 0, 932, 560],
      cycles: 1.25, rest: 0.0, bob: [16, 1], pitch: 3,
      legs: [
        { hip: [345, 330], fn: hind, off: 0.45, layer: 'back', segs: [[125, 100, DOG_FAR], [120, 46, DOG_FAR], [70, 38, DOG_FAR]] },
        { hip: [628, 330], fn: front, off: 0.45, layer: 'back', segs: [[110, 76, DOG_FAR], [115, 44, DOG_FAR], [55, 38, DOG_FAR]] },
        { hip: [300, 335], fn: hind, off: 0, layer: 'front', segs: [[130, 112, DOG], [122, 48, DOG], [72, 40, DOG]] },
        { hip: [660, 325], fn: front, off: 0, layer: 'front', segs: [[112, 84, DOG], [118, 46, DOG], [58, 40, DOG]] }
      ]
    },
    poodle: {
      img: 'poodle-body.webp', view: [230, 420, 590, 420], box: [230, 420, 590, 380],
      cycles: 1.5, rest: 0.0, bob: [12, 1], pitch: 4, fluffy: true,
      legs: [
        { hip: [425, 630], fn: hind, off: 0.5, layer: 'back', segs: [[85, 70, POO_FAR], [80, 46, POO_FAR], [45, 44, POO_FAR]] },
        { hip: [600, 625], fn: front, off: 0.5, layer: 'back', segs: [[80, 60, POO_FAR], [80, 42, POO_FAR], [40, 42, POO_FAR]] },
        { hip: [395, 630], fn: hind, off: 0, layer: 'front', segs: [[90, 76, POO], [82, 48, POO], [46, 46, POO]] },
        { hip: [628, 620], fn: front, off: 0, layer: 'front', segs: [[82, 64, POO], [82, 44, POO], [42, 44, POO]] }
      ]
    }
  };

  /* ---------- build the DOM ---------- */
  function el(name, attrs, parent) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function buildRig(name, rig) {
    var wrap = document.createElement('span');
    wrap.className = 'runner runner--' + name;
    wrap.innerHTML = '<span class="shadow"></span>';
    var v = rig.view;
    var svg = el('svg', { viewBox: v.join(' '), 'aria-hidden': 'true', focusable: 'false' });
    var mover = el('g', {}, svg);
    var back = el('g', {}, mover);
    var img = el('image', { x: rig.box[0], y: rig.box[1], width: rig.box[2], height: rig.box[3] }, mover);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', base + rig.img);
    img.setAttribute('href', base + rig.img);
    var frontG = el('g', {}, mover);
    rig.legs.forEach(function (leg) {
      var g = el('g', {}, leg.layer === 'front' ? frontG : back);
      leg.out = []; leg.fill = [];
      var n = leg.segs.length + (leg.sock ? 1 : 0);
      for (var i = 0; i < n; i++) leg.out.push(el('line', { stroke: NAVY, 'stroke-linecap': 'round' }, g));
      for (i = 0; i < n; i++) leg.fill.push(el('line', { 'stroke-linecap': 'round' }, g));
      if (rig.fluffy) leg.puff = el('circle', { fill: leg.segs[2][2], stroke: NAVY, 'stroke-width': 9 }, g);
    });
    wrap.appendChild(svg);
    rig.wrap = wrap; rig.mover = mover; rig.shadow = wrap.querySelector('.shadow');
    return wrap;
  }

  var couple = document.createElement('div');
  couple.className = 'runners runners--couple';
  couple.setAttribute('aria-hidden', 'true');
  couple.appendChild(buildRig('couple', RIGS.couple));

  // ✎ Which dogs run: 'dog' is Mela. RIGS.poodle is kept only as an example of a
  // second, smaller dog (its drawing is not included): to add one, put its
  // poodle-body.webp in this folder and add 'poodle' to this list.
  var DOGS = ['dog'];

  var dogs = document.createElement('div');
  dogs.className = 'runners runners--dogs';
  dogs.setAttribute('aria-hidden', 'true');
  DOGS.forEach(function (k) { dogs.appendChild(buildRig(k, RIGS[k])); });

  body.appendChild(dogs);
  body.appendChild(couple);

  /* ---------- posing ---------- */
  function setLine(l, a, b, w, color) {
    l.setAttribute('x1', a[0].toFixed(1)); l.setAttribute('y1', a[1].toFixed(1));
    l.setAttribute('x2', b[0].toFixed(1)); l.setAttribute('y2', b[1].toFixed(1));
    l.setAttribute('stroke-width', w);
    if (color) l.setAttribute('stroke', color);
  }
  function step(p, len, deg) {
    return [p[0] + len * sin(deg * D2R), p[1] + len * cos(deg * D2R)];
  }

  // blend: 0 = resting pose (the drawing's stride), 1 = full running cycle
  function poseRig(rig, phase, blend) {
    var p = phase * rig.cycles * Math.PI * 2;
    var p0 = rig.rest * Math.PI * 2;
    var bobY = -rig.bob[0] * blend * Math.abs(sin(p * rig.bob[1] / 2 + (rig.bob[1] === 1 ? Math.PI / 2 : 0)));
    if (rig.bob[1] === 1) bobY = -rig.bob[0] * blend * (0.5 + 0.5 * cos(p));   // dogs: highest when stretched out
    var pitch = rig.pitch ? rig.pitch * blend * sin(p) : 0;
    var cx = rig.view[0] + rig.view[2] / 2, cy = rig.view[1] + rig.view[3] / 2;
    rig.mover.setAttribute('transform', 'translate(0 ' + bobY.toFixed(1) + ') rotate(' + (-pitch).toFixed(2) + ' ' + cx + ' ' + cy + ')');
    rig.shadow.style.transform = 'scaleX(' + (1 + bobY / 120).toFixed(3) + ')';

    rig.legs.forEach(function (leg) {
      var run = leg.fn(p + leg.off, leg.k), rest = leg.fn(p0 + leg.off, leg.k);
      var ang = [0, 1, 2].map(function (i) { return rest[i] + (run[i] - rest[i]) * blend; });
      var pts = [leg.hip];
      for (var i = 0; i < 3; i++) pts.push(step(pts[i], leg.segs[i][0], ang[i]));
      var o = 22; // outline thickness (both sides together)
      var j = 0;
      for (i = 0; i < 3; i++) {
        var a = pts[i], b = pts[i + 1], s = leg.segs[i];
        if (i === 2) { a = step(pts[2], s[1] * 0.35, ang[2] + 180); }  // heel sticks out a little behind the ankle
        if (leg.sock && i === 2) {
          var sa = step(pts[2], 34, ang[1] + 180);
          setLine(leg.out[j], sa, pts[2], leg.segs[1][1] * 0.8 + o);
          setLine(leg.fill[j], sa, pts[2], leg.segs[1][1] * 0.8, SOCK); j++;
        }
        setLine(leg.out[j], a, b, s[1] + o);
        setLine(leg.fill[j], a, b, s[1], s[2]); j++;
      }
      if (leg.puff) {
        var pp = pts[3];
        leg.puff.setAttribute('cx', pp[0].toFixed(1)); leg.puff.setAttribute('cy', pp[1].toFixed(1));
        leg.puff.setAttribute('r', (leg.segs[2][1] * 0.62).toFixed(1));
      }
    });
  }

  function poseAll(phase, blend, flip) {
    var fx = Math.abs(flip) < 0.04 ? (flip < 0 ? -0.04 : 0.04) : flip;
    ['couple'].concat(DOGS).forEach(function (k) {
      poseRig(RIGS[k], phase, blend);
      RIGS[k].wrap.style.transform = 'scaleX(' + fx.toFixed(3) + ')';
    });
  }

  /* ---------- scroll driving ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function updateVisibility() {
    var show = window.scrollY > window.innerHeight * 0.5;
    couple.classList.toggle('is-visible', show);
    dogs.classList.toggle('is-visible', show);
  }

  poseAll(0, 0, 1);
  // for testing: window.__runners.pose(phase 0..1, blend 0..1, flip)
  window.__runners = { pose: poseAll };

  if (reduce) {
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return;
  }

  var STRIDE = 260;     // px of scrolling for one running cycle
  var MAX_STEP = 0.032; // cycles per frame at most (~2 strides a second), so fast scrolling stays calm
  var lastY = window.scrollY, phase = 0, speed = 0, dir = 1, flip = 1, blend = 0, ticking = false;

  function onScroll() {
    updateVisibility();
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  function frame() {
    var y = window.scrollY, dy = y - lastY;
    lastY = y;
    if (dy !== 0) dir = dy > 0 ? 1 : -1;
    var v = Math.abs(dy);
    speed += (Math.min(v, 40) - speed) * (v > speed ? 0.3 : 0.025);
    var target = Math.min(speed / 3, 1);
    blend += (target - blend) * (target > blend ? 0.12 : 0.05);
    phase += Math.min(Math.max(v, speed) / STRIDE, MAX_STEP);
    flip += (dir - flip) * 0.18;

    poseAll(phase, blend, flip);

    if (blend > 0.01 || speed > 0.05 || Math.abs(dir - flip) > 0.01) {
      requestAnimationFrame(frame);
    } else {
      blend = 0; speed = 0; flip = dir;
      poseAll(phase, 0, flip);
      ticking = false;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateVisibility();
})();
