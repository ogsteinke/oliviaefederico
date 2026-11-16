// Getting there · plays the journey map step by step (markup: tools/build_journey.py).
(function () {
  const J = document.querySelector(".journey");
  if (!J) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svgB = J.querySelector(".j-scene-b");
  const steps = [...J.querySelectorAll(".j-step")];
  const VIEW = { 2: [-474, -640, 3413, 2560], 3: [330, 334, 134, 100.5], 4: [338, 318, 146, 109.5] };   // x y w h of scene B per step
  const LAST = 4;
  let step = 1, view = VIEW[2].slice(), anims = [], autoplay = null, run = 0;

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function tween(ms, fn) {
    return new Promise(res => {
      if (reduce) { fn(1); return res(); }
      const t0 = performance.now(), id = { stop: false }; anims.push(id);
      (function frame(now) {
        if (id.stop) return res();
        const t = Math.min(1, (now - t0) / ms); fn(ease(t));
        t < 1 ? requestAnimationFrame(frame) : res();
      })(t0);
    });
  }
  function stopAll() { anims.forEach(a => a.stop = true); anims = []; }

  // draw a dashed route progressively, and move a marker along it
  function along(pathEl, marker, ms, rotate) {
    const L = pathEl.getTotalLength();
    return tween(ms, t => {
      const p = pathEl.getPointAtLength(L * t), q = pathEl.getPointAtLength(Math.min(L, L * t + 1));
      const a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      reveal(pathEl, L, t);
      if (marker) {
        if (marker.tagName === "circle") { marker.setAttribute("cx", p.x); marker.setAttribute("cy", p.y); }
        else if (marker.dataset.flip) {   // side-view train, car and boat: upright, facing the way they travel, tilted at most data-tilt (35°)
          const left = Math.abs(a) > 90, m = marker.dataset.tilt !== undefined ? +marker.dataset.tilt : 35, r = Math.max(-m, Math.min(m, left ? (a > 0 ? a - 180 : a + 180) : a));
          marker.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${r})` + (left ? " scale(-1 1)" : ""));
        }
        else marker.setAttribute("transform", `translate(${p.x} ${p.y})` + (rotate ? ` rotate(${a})` : ""));
      }
    });
  }
  // reveal the first t of a dashed path by masking it with a solid copy
  function reveal(pathEl, L, t) {
    let m = pathEl.__mask;
    if (!m) {
      const svg = pathEl.ownerSVGElement, NS = "http://www.w3.org/2000/svg";
      let defs = svg.querySelector("defs.j-masks"); if (!defs) { defs = document.createElementNS(NS, "defs"); defs.setAttribute("class", "j-masks"); svg.prepend(defs); }
      m = document.createElementNS(NS, "mask"); m.id = pathEl.id + "-mask"; m.setAttribute("maskUnits", "userSpaceOnUse");
      m.setAttribute("x", -5000); m.setAttribute("y", -5000); m.setAttribute("width", 10000); m.setAttribute("height", 10000);
      const p = document.createElementNS(NS, "path"); p.setAttribute("d", pathEl.getAttribute("d"));
      p.setAttribute("fill", "none"); p.setAttribute("stroke", "#fff"); p.setAttribute("stroke-width", 40);
      p.setAttribute("stroke-dasharray", L + " " + L); m.appendChild(p); defs.appendChild(m);
      pathEl.setAttribute("mask", `url(#${m.id})`); pathEl.__mask = m; m.__p = p;
    }
    m.__p.setAttribute("stroke-dashoffset", L * (1 - t));
  }
  function setView(v) { view = v; svgB.setAttribute("viewBox", v.map(n => n.toFixed(2)).join(" ")); }
  function zoomTo(target, ms) {
    const from = view.slice();
    return tween(ms, t => setView(from.map((f, i) => f + (target[i] - f) * t)));
  }

  const flight = J.querySelector("#j-flight"), plane = J.querySelector(".j-plane");
  const drive = J.querySelector("#j-drive"), car = J.querySelector(".j-car");
  const rail = J.querySelector("#j-rail"), train = J.querySelector(".j-train");
  const boatPath = J.querySelector("#j-boatpath"), boat = J.querySelector(".j-boat");

  async function go(n, opts = {}) {
    stopAll(); clearTimeout(autoplay);
    const me = ++run;
    step = Math.max(1, Math.min(LAST, n));
    J.dataset.step = step;
    steps.forEach(s => s.classList.toggle("on", +s.dataset.step === step));
    if (step >= 3) { reveal(drive, drive.getTotalLength(), 1); reveal(rail, rail.getTotalLength(), 1); }
    if (step === 1) {
      setView(VIEW[2].slice());
      await along(flight, plane, 3200, true);
    } else if (step === 2) {
      reveal(flight, flight.getTotalLength(), 1);
      if (view[2] < 2000) await zoomTo(VIEW[2], 1400);
      if (me !== run) return; else setView(VIEW[2].slice());
      await Promise.all([along(drive, car, 2600, false), along(rail, train, 3400, true)]);
    } else if (step === 3) {
      await zoomTo(VIEW[3], view[2] > 500 ? 2300 : 1200);
    } else if (step === 4) {
      await zoomTo(VIEW[4], 1600);
      if (me !== run) return;
      await along(boatPath, boat, 2600, false);
    }
    if (me !== run) return;
    if (opts.auto && step < LAST) autoplay = setTimeout(() => go(step + 1, { auto: true }), 2200);
  }
  function user(n) { clearTimeout(autoplay); go(n); }

  steps.forEach(s => s.querySelector("button").addEventListener("click", () => user(+s.dataset.step)));
  J.querySelector(".j-next").addEventListener("click", () => user(step < LAST ? step + 1 : 1));
  J.querySelector(".j-prev").addEventListener("click", () => user(step - 1));
  J.querySelector(".j-replay").addEventListener("click", () => { clearTimeout(autoplay); setView(VIEW[2].slice()); go(1, { auto: true }); });

  // map pins open Google Maps
  J.querySelectorAll(".j-pin[data-href]").forEach(g => {
    const open = () => window.open(g.dataset.href, "_blank", "noopener");
    g.addEventListener("click", open);
    g.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
  });

  // first state: the flight, waiting at Boston; play when the map comes into view
  J.dataset.step = 1; steps[0].classList.add("on");
  reveal(flight, flight.getTotalLength(), 0); reveal(drive, drive.getTotalLength(), 0); reveal(rail, rail.getTotalLength(), 0); reveal(boatPath, boatPath.getTotalLength(), 0);
  const p0 = flight.getPointAtLength(0); plane.setAttribute("transform", `translate(${p0.x} ${p0.y})`);
  const d0 = drive.getPointAtLength(0); car.setAttribute("transform", `translate(${d0.x} ${d0.y})`);
  const r0 = rail.getPointAtLength(0); train.setAttribute("transform", `translate(${r0.x} ${r0.y})`);
  const b0 = boatPath.getPointAtLength(0); boat.setAttribute("transform", `translate(${b0.x} ${b0.y})`);
  let started = false;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !started) { started = true; go(1, { auto: true }); io.disconnect(); }
  }), { threshold: .35 });
  io.observe(J.querySelector(".j-map"));
})();
