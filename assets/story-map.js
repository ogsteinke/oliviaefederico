// Our Story map: Olivia flies Seattle → Philadelphia, drives to Penn State and back, flies on to Boston; Federico takes the train Varese → Milano → Roma (Italy inset),
// then flies Rome → Boston. Plays when the map comes into view (markup: tools/build_story_map.py).
(function () {
  const fig = document.querySelector(".story-map"); if (!fig) return;
  const svg = fig.querySelector("svg"), NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const defs = svg.insertBefore(document.createElementNS(NS, "defs"), svg.firstChild);
  // each leg: its route, its moving icon, and when it travels (share of the whole animation)
  // Federico lands in Boston first (by .64); Olivia's last flight lands after him (.95)
  const legs = [["#sm-rail-f", ".sm-train", 0, .3], ["#sm-route-f", ".sm-dot-f", .32, .64],
                ["#sm-route-o1", ".sm-dot-o1", .04, .38], ["#sm-road-o2", ".sm-car-2", .4, .52], ["#sm-road-o3", ".sm-car-3", .54, .66], ["#sm-route-o4", ".sm-dot-o4", .72, .95]].map(([r, d, a, b]) => {
    const p = svg.querySelector(r), dot = svg.querySelector(d), L = p.getTotalLength();
    // reveal the dashed route with a solid mask that grows along it
    const m = document.createElementNS(NS, "mask"); m.id = p.id + "-mask"; m.setAttribute("maskUnits", "userSpaceOnUse");
    ["x", "y"].forEach(k => m.setAttribute(k, -2000)); ["width", "height"].forEach(k => m.setAttribute(k, 6000));
    const mp = document.createElementNS(NS, "path"); mp.setAttribute("d", p.getAttribute("d")); mp.setAttribute("fill", "none");
    mp.setAttribute("stroke", "#fff"); mp.setAttribute("stroke-width", 12); mp.setAttribute("stroke-dasharray", L + " " + L);
    m.appendChild(mp); defs.appendChild(m); p.setAttribute("mask", `url(#${m.id})`);
    const ticks = p.nextElementSibling && p.nextElementSibling.classList.contains("sm-railticks") ? p.nextElementSibling : null;
    if (ticks) ticks.setAttribute("mask", `url(#${m.id})`);
    return { p, dot, L, mp, a, b, flip: !!dot.dataset.flip };
  });
  const ends = svg.querySelectorAll(".sm-end");
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function set(T) {
    legs.forEach(r => {
      const t = ease(Math.max(0, Math.min(1, (T - r.a) / (r.b - r.a))));
      r.mp.setAttribute("stroke-dashoffset", r.L * (1 - t));
      const q = r.p.getPointAtLength(r.L * t), q2 = r.p.getPointAtLength(Math.min(r.L, r.L * t + 1)), q0 = r.p.getPointAtLength(Math.max(0, r.L * t - 1));
      const a = Math.atan2(q2.y - q0.y, q2.x - q0.x) * 180 / Math.PI;
      if (r.flip) {   // the side-view train stays upright, facing the way it travels, tilted at most 35°
        const left = Math.abs(a) > 90, m = r.dot.dataset.tilt !== undefined ? +r.dot.dataset.tilt : 35, rot = Math.max(-m, Math.min(m, left ? (a > 0 ? a - 180 : a + 180) : a));
        r.dot.setAttribute("transform", `translate(${q.x} ${q.y}) rotate(${rot})` + (left ? " scale(-1 1)" : ""));
      } else r.dot.setAttribute("transform", `translate(${q.x} ${q.y}) rotate(${a})`);
      r.dot.style.opacity = t > 0 && t < 1 ? 1 : 0;
    });
    ends.forEach(e => e.style.opacity = T >= 1 ? 1 : 0);
  }
  let playing = false;
  function play() {
    if (playing) return; playing = true;
    if (reduce) { set(1); playing = false; return; }
    const t0 = performance.now(), ms = 7600;
    (function f(now) { const t = Math.min(1, (now - t0) / ms); set(t); t < 1 ? requestAnimationFrame(f) : (playing = false); })(t0);
  }
  set(0);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { play(); io.disconnect(); } }), { threshold: .4 });
  io.observe(fig);
  const again = fig.querySelector(".sm-replay"); if (again) again.addEventListener("click", play);
})();
