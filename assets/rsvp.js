// =====================================================================
//  RSVP form (rsvp.qmd / en-rsvp.qmd)
// =====================================================================
//  Where the replies go: paste the web-app URL of the Google Apps Script
//  (tools/rsvp-apps-script.gs) between the quotes. Each reply becomes a
//  row in the "RSVP" tab of your Google Sheet; a guest who replies again
//  updates their own row instead of adding a new one.
//  Leave it empty while testing: the form works, but nothing is saved.
// =====================================================================
const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbyqovKCatmAZGExXegdYArrk2r4N3NzKZOhA3rtnaI7ta1jDHp1RjVV013HzJ5jdG7YfQ/exec";

(function () {
  const form = document.getElementById("rsvp-form");
  if (!form) return;
  const lang = document.body.classList.contains("page-it") ? "it" : "en";
  const KEY = "of-rsvp";
  const MAX_GUESTS = 2;   // ✎ party size is at most 2

  const T = {
    it: {
      guest: n => "Nome dell'ospite " + n,
      errName: "Scrivete il vostro nome e cognome.",
      errAttend: "Fateci sapere se ci sarete.",
      errNames: "Scrivete il nome di ogni ospite.",
      errFrom: "Diteci da dove arrivate.",
      errPizza: "Manca la domanda più importante: l'ananas sulla pizza!",
      sending: "Invio…",
      send: "Invia la risposta",
      yesTitle: "Che gioia!",
      yesText: n => n > 1 ? "Abbiamo ricevuto la vostra risposta: vi aspettiamo in " + n + "." : "Abbiamo ricevuto la tua risposta: ti aspettiamo!",
      noTitle: "Ci mancherete",
      noText: "Grazie per avercelo fatto sapere. Vi penseremo con un brindisi.",
      test: "Modalità di prova: l'RSVP non è ancora collegato, quindi questa risposta non è stata salvata.",
      fail: "Qualcosa non ha funzionato. Riprovate tra poco, oppure scriveteci a ogsteinke@gmail.com o fe.ascoli@gmail.com.",
      summaryYes: n => "Ci sarete · " + n + (n > 1 ? " persone" : " persona"),
      summaryNo: "Non potrete esserci"
    },
    en: {
      guest: n => "Name of guest " + n,
      errName: "Please write your first and last name.",
      errAttend: "Please let us know whether you can come.",
      errNames: "Please write the name of each guest.",
      errFrom: "Please tell us where you're traveling from.",
      errPizza: "You missed the most important question: pineapple on pizza!",
      sending: "Sending…",
      send: "Send reply",
      yesTitle: "Wonderful!",
      yesText: n => n > 1 ? "We've received your reply: we can't wait to see all " + n + " of you." : "We've received your reply: we can't wait to see you!",
      noTitle: "You'll be missed",
      noText: "Thank you for letting us know. We'll raise a glass to you.",
      test: "Test mode: the RSVP isn't connected yet, so this reply was not saved.",
      fail: "Something went wrong. Please try again in a moment, or write to us at ogsteinke@gmail.com or fe.ascoli@gmail.com.",
      summaryYes: n => "Attending · " + n + (n > 1 ? " guests" : " guest"),
      summaryNo: "Not attending"
    }
  }[lang];

  const $ = id => document.getElementById(id);
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const nameEl = $("rsvp-name"), countEl = $("rsvp-count"), extraEl = $("rsvp-extra-names");
  const yesBlock = $("rsvp-yes"), errEl = $("rsvp-err"), btn = $("rsvp-send");

  // number-of-guests menu
  for (let i = 1; i <= MAX_GUESTS; i++) {
    const o = document.createElement("option"); o.value = i; o.textContent = i; countEl.appendChild(o);
  }

  // one name box for each extra guest
  function drawExtra(values) {
    const n = +countEl.value, old = values || [...extraEl.querySelectorAll("input")].map(i => i.value);
    extraEl.innerHTML = "";
    for (let i = 2; i <= n; i++) {
      const inp = document.createElement("input");
      inp.type = "text"; inp.className = "rsvp-input"; inp.placeholder = T.guest(i);
      inp.setAttribute("aria-label", T.guest(i)); inp.value = old[i - 2] || "";
      extraEl.appendChild(inp);
    }
  }
  countEl.addEventListener("change", () => drawExtra());

  function attending() { const r = form.querySelector('input[name="attending"]:checked'); return r ? r.value : ""; }
  function syncAttend() { yesBlock.hidden = attending() !== "yes"; }
  form.querySelectorAll('input[name="attending"]').forEach(r => r.addEventListener("change", syncAttend));

  // fill in what we know: the guest's name from the entry, or their last reply
  const guest = load("of-guest") || {};
  const last = load(KEY);
  if (last) {
    nameEl.value = last.name || "";
    const r = form.querySelector('input[name="attending"][value="' + last.attending + '"]'); if (r) r.checked = true;
    countEl.value = last.guests || 1; drawExtra(last.guestNames || []);
    $("rsvp-email").value = last.email || ""; $("rsvp-diet").value = last.dietary || "";
    $("rsvp-from").value = last.from || ""; $("rsvp-arrive").value = last.arrive || ""; $("rsvp-leave").value = last.leave || ""; $("rsvp-where").value = last.stayingAt || "";
    $("rsvp-msg").value = last.message || "";
    const pz = form.querySelector('input[name="pizza"][value="' + (last.song || "") + '"]'); if (pz) pz.checked = true;
  } else if (guest.name) {
    nameEl.value = guest.name;
  }
  syncAttend();

  function showDone(data, testMode) {
    const yes = data.attending === "yes";
    $("rsvp-done-title").textContent = yes ? T.yesTitle : T.noTitle;
    $("rsvp-done-text").textContent = yes ? T.yesText(data.guests) : T.noText;
    $("rsvp-done-summary").textContent = data.name + " · " + (yes ? T.summaryYes(data.guests) : T.summaryNo);
    const tm = $("rsvp-test"); tm.textContent = T.test; tm.hidden = !testMode;
    form.hidden = true; $("rsvp-done").hidden = false;
    $("rsvp-done").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // a guest who already replied sees their reply, with a link to change it
  if (last && last.sent) showDone(last, false);
  $("rsvp-change").addEventListener("click", e => {
    e.preventDefault(); $("rsvp-done").hidden = true; form.hidden = false; nameEl.focus();
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    errEl.hidden = true;
    const fail = msg => { errEl.textContent = msg; errEl.hidden = false; };
    const name = nameEl.value.trim();
    if (name.split(/\s+/).filter(Boolean).length < 2) { nameEl.focus(); return fail(T.errName); }
    const att = attending();
    if (!att) return fail(T.errAttend);
    const guests = att === "yes" ? +countEl.value : 0;
    const guestNames = att === "yes" ? [...extraEl.querySelectorAll("input")].map(i => i.value.trim()) : [];
    if (guestNames.some(n => !n)) return fail(T.errNames);
    if (att === "yes" && !$("rsvp-from").value.trim()) { $("rsvp-from").focus(); return fail(T.errFrom); }
    if (!form.querySelector('input[name="pizza"]:checked')) return fail(T.errPizza);

    const data = {
      type: "rsvp", at: new Date().toISOString(), lang, name, attending: att, guests, guestNames,
      email: $("rsvp-email").value.trim(),
      dietary: att === "yes" ? $("rsvp-diet").value.trim() : "",
      from: att === "yes" ? $("rsvp-from").value.trim() : "",
      arrive: att === "yes" ? $("rsvp-arrive").value : "",
      leave: att === "yes" ? $("rsvp-leave").value : "",
      stayingAt: att === "yes" ? $("rsvp-where").value.trim() : "",
      // pineapple on pizza: sent in the "song" field, so the Google Sheet script needs no change
      song: (form.querySelector('input[name="pizza"]:checked') || {}).value || "",
      message: $("rsvp-msg").value.trim(),
      enteredAs: guest.name || ""
    };

    if (!RSVP_ENDPOINT) { save(KEY, Object.assign({}, data, { sent: false })); return showDone(data, true); }

    btn.disabled = true; btn.textContent = T.sending;
    fetch(RSVP_ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(data) })
      .then(() => { save(KEY, Object.assign({}, data, { sent: true })); showDone(data, false); })
      .catch(() => fail(T.fail))
      .finally(() => { btn.disabled = false; btn.textContent = T.send; });
  });
})();
