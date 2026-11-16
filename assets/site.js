// Shared logic: guest state, entry gate, page guard, countdown, reveal.
(function () {
  const KEY = "of-guest";
  const PASS_HASH = "7c80c860"; // ✎ hash of the password (case-insensitive).
                                  // New password: python3 tools/password_hash.py "YOUR WORD"

  function hash(s) { let x = 5381; for (const c of s) x = ((x * 33) ^ c.charCodeAt(0)) >>> 0; return x.toString(16); }
  function norm(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim(); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return window.__guest || {}; } }
  function save(g) { window.__guest = g; try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (e) {} }

  window.LA = { load, save, norm };

  // guest data generated from the Google Sheet by tools/sync_guests.py
  const SALT = "#olivia-federico-2027"; // must match SALT in tools/sync_guests.py
  function unscramble(b64, key) {
    try {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      let x = parseInt(hash(key + SALT), 16) || 1;
      for (let i = 0; i < bytes.length; i++) {
        x ^= (x << 13) >>> 0; x >>>= 0; x ^= x >>> 17; x ^= (x << 5) >>> 0; x >>>= 0;
        bytes[i] ^= x & 255;
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }
  function findGuest(name) {
    const D = window.GUEST_DATA || {}, n = norm(name);
    const k = hash(n);
    return D[k] ? unscramble(D[k], n) : null;
  }
  window.LA.findGuest = findGuest;   // used by the RSVP page to "log in" by name
  // loose comparison of the guest's answer with the expected one
  function answerOk(given, expected) {
    const a = norm(given), b = norm(expected);
    if (!a || !b) return false;
    if (a === b || a.includes(b) || (b.includes(a) && a.length >= 3)) return true;
    const tb = b.split(" ").filter(w => w.length >= 4), ta = a.split(" ");
    if (tb.some(w => ta.includes(w))) return true;
    // initials, e.g. "HRH" for "His Royal Highness"
    if (a.replace(/ /g, "") === b.split(" ").map(w => w[0]).join("")) return true;
    // small typos
    const d = (s, t) => { const m = s.length, n = t.length, dp = Array.from({length: m + 1}, (_, i) => [i]);
      for (let j = 1; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
        dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (s[i-1] === t[j-1] ? 0 : 1));
      return dp[m][n]; };
    return d(a, b) <= Math.max(1, Math.floor(b.length / 5));
  }

  // ?reset in the address (e.g. index.html?reset) forgets the guest, to test the entry again
  if (/[?&]reset\b/.test(location.search)) { try { localStorage.removeItem(KEY); } catch (e) {} }

  // ---------- guard on the content pages ----------
  const page = ["gate", "it", "en"].find(p => document.body.classList.contains("page-" + p));
  if (page === "it" || page === "en") {
    const g = load();
    if (!g.unlocked) { location.replace("index.html"); return; }
    if (g.lang !== page) { g.lang = page; save(g); }
    const hello = document.getElementById("hello");
    if (hello && g.name) {
      const first = g.name.split(" ")[0];
      hello.textContent = (page === "it" ? "Ciao " : "Hi ") + first + "!";
    }
    // logout / change guest
    document.querySelectorAll("[data-reset]").forEach(a => a.addEventListener("click", e => {
      e.preventDefault(); const g2 = load(); delete g2.name; delete g2.answer; delete g2.done; save(g2); location.href = "index.html";
    }));
  }

  // ---------- entry gate ----------
  if (page === "gate") {
    document.querySelector(".gate").classList.add("js");
    const steps = [...document.querySelectorAll(".step")];
    const show = id => steps.forEach(s => s.classList.toggle("active", s.id === id));
    const g = load();
    let lang = g.lang || "it";

    const T = {
      it: { name: "Come ti chiami?", namePh: "Nome e cognome", next: "Avanti", q: "Una domanda per voi", ansPh: "La vostra risposta…", answerBtn: "Rispondi", enter: "Entra", skip: "Rispondo dopo", hi: "Ciao", err: "Scrivete nome e cognome.", wrong: "Quasi! La risposta giusta era:", thanks: "Grazie! Ce lo racconterete al matrimonio." },
      en: { name: "What's your name?", namePh: "First and last name", next: "Next", q: "A question for you", ansPh: "Your answer…", answerBtn: "Answer", enter: "Come in", skip: "I'll answer later", hi: "Hi", err: "Please write your first and last name.", wrong: "So close! The right answer was:", thanks: "Thank you! Tell us more at the wedding." }
    };

    function applyLang() {
      document.documentElement.lang = lang;
      document.querySelectorAll("[data-t]").forEach(el => { el.textContent = T[lang][el.dataset.t]; });
      document.querySelectorAll("[data-ph]").forEach(el => { el.placeholder = T[lang][el.dataset.ph]; });
    }

    // step 1: password
    const pw = document.getElementById("pw");
    document.getElementById("form-pw").addEventListener("submit", e => {
      e.preventDefault();
      if (hash(pw.value.trim().toUpperCase()) === PASS_HASH) {
        g.unlocked = true; save(g); show("step-lang");
      } else {
        pw.classList.remove("shake"); void pw.offsetWidth; pw.classList.add("shake");
        document.getElementById("pw-err").hidden = false;
      }
    });

    // step 2: language
    document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => {
      lang = b.dataset.lang; g.lang = lang; save(g); applyLang(); show("step-name");
      document.getElementById("name").focus();
    }));

    // step 3: name
    document.getElementById("form-name").addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      if (!norm(name)) { document.getElementById("name-err").hidden = false; return; }
      const guest = findGuest(name);
      if (!guest && norm(name).split(" ").length < 2) { document.getElementById("name-err").hidden = false; return; }
      g.name = name; g.guest = guest || null;
      let q;
      if (guest && guest.q) q = { text: guest.q, a: guest.a, r: guest.r };
      else { const D = window.DEFAULT_QUESTIONS; const d = D[parseInt(hash(norm(name)), 16) % D.length]; q = { text: d[lang] }; }
      g.question = q.text; save(g);
      const first = guest ? guest.n : name.split(" ")[0];
      document.getElementById("q-hello").textContent = T[lang].hi + " " + first + "!";
      document.getElementById("q-text").textContent = q.text;
      window.__q = q;
      show("step-q");
      document.getElementById("answer").focus();
    });

    // step 4: question, then our answer
    function send(answer) {
      if (answer && window.ANSWERS_ENDPOINT) {
        fetch(window.ANSWERS_ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ type: "answer", name: g.name, lang, question: g.question, answer, at: new Date().toISOString() }) }).catch(() => {});
      }
    }
    function enter() { g.done = true; save(g); setTimeout(() => location.href = lang + ".html", 200); }
    document.getElementById("form-q").addEventListener("submit", e => {
      e.preventDefault();
      const answer = document.getElementById("answer").value.trim();
      if (!answer) { document.getElementById("answer").focus(); return; }
      g.answer = answer; save(g); send(answer);
      const q = window.__q || {}, reply = document.getElementById("q-reply"), right = document.getElementById("q-right");
      if (q.a) {
        const ok = answerOk(answer, q.a);
        reply.textContent = ok ? (q.r || "👏") : T[lang].wrong;
        right.textContent = ok ? "" : q.a;
        right.hidden = ok;
        if (!ok && q.r) { reply.textContent = T[lang].wrong; }
      } else { reply.textContent = T[lang].thanks; right.hidden = true; }
      document.getElementById("form-q").hidden = true;
      document.getElementById("q-result").hidden = false;
      document.getElementById("go").focus();
    });
    document.getElementById("go").addEventListener("click", enter);
    document.getElementById("skip").addEventListener("click", e => { e.preventDefault(); enter(); });

    applyLang();
    // returning guest: jump ahead
    if (g.unlocked && g.done && g.lang) location.replace(g.lang + ".html");
    else if (g.unlocked) show("step-lang");
    else show("step-pw");
  }

  // ---------- countdown ----------
  const cd = document.getElementById("cd-days");
  if (cd) {
    const target = new Date("2027-09-04T17:00:00+02:00") /* wedding date, time and UTC offset (Italy, summer time) */.getTime();
    const h = document.getElementById("cd-hours"), m = document.getElementById("cd-mins");
    const tick = () => {
      let diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 864e5); diff -= days * 864e5;
      const hours = Math.floor(diff / 36e5); diff -= hours * 36e5;
      cd.textContent = days; h.textContent = hours; m.textContent = Math.floor(diff / 6e4);
    };
    tick(); setInterval(tick, 30000);
  }

  // ---------- reveal on scroll ----------
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) els.forEach(e => e.classList.add("visible"));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach(e => io.observe(e));
  }
})();
