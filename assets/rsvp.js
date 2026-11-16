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

window.addEventListener("DOMContentLoaded", function () {
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
      errNotFound: "Non troviamo questo nome nella lista degli invitati: scrivetelo come appare sul vostro invito.",
      partner: "Il nome del vostro accompagnatore",
      notYou: "Non siete voi? Cambiate nome",
      errPizza: "Manca la domanda più importante: l'ananas sulla pizza!",
      sending: "Invio…",
      send: "Invia RSVP",
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
      errNotFound: "We can't find that name on our guest list. Please write it as it appears on your invitation.",
      partner: "Your guest's name",
      notYou: "Not you? Change name",
      errPizza: "You missed the most important question: pineapple on pizza!",
      sending: "Sending…",
      send: "Send RSVP",
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

  // ---------- "log in" by name: match the guest list (assets/guests-data.js) ----------
  // A guest record can carry: f = full name as on the invitation, p = their partner's
  // full name, plus = true when they may bring an unnamed guest. Older records only have
  // n (first name): the form then falls back to letting the guest choose 1 or 2.
  const lookup = name => (window.LA && window.LA.findGuest && name) ? window.LA.findGuest(name) : null;
  const countLabel = form.querySelector('label[for="rsvp-count"]');
  let rec = null;

  function setParty(r, keepNames) {
    rec = r;
    const known = r && (r.f || r.p || r.plus !== undefined);
    const max = known ? (r.p || r.plus ? 2 : 1) : MAX_GUESTS;
    const was = +countEl.value || max;
    countEl.innerHTML = "";
    for (let i = 1; i <= max; i++) {
      const o = document.createElement("option"); o.value = i; o.textContent = i; countEl.appendChild(o);
    }
    countEl.value = Math.min(keepNames ? was : max, max);
    countEl.hidden = max === 1; if (countLabel) countLabel.hidden = max === 1;
    if (countLabel && known && max === 2) countLabel.textContent = lang === "it" ? "Quanti sarete, voi compresi?" : "How many in your party, including you?";
    drawExtra(keepNames ? undefined : (r && r.p ? [r.p] : []));
  }

  // one name box for each extra guest (filled in and fixed when we know the partner's name)
  function drawExtra(values) {
    const n = +countEl.value, old = values || [...extraEl.querySelectorAll("input")].map(i => i.value);
    extraEl.innerHTML = "";
    for (let i = 2; i <= n; i++) {
      const inp = document.createElement("input");
      const named = rec && rec.p;
      inp.type = "text"; inp.className = "rsvp-input";
      inp.placeholder = rec && rec.plus ? T.partner : T.guest(i);
      inp.setAttribute("aria-label", inp.placeholder);
      inp.value = named ? rec.p : (old[i - 2] || "");
      if (named) inp.readOnly = true;
      extraEl.appendChild(inp);
    }
  }
  countEl.addEventListener("change", () => drawExtra());

  function attending() { const r = form.querySelector('input[name="attending"]:checked'); return r ? r.value : ""; }
  function syncAttend() { yesBlock.hidden = attending() !== "yes"; }
  form.querySelectorAll('input[name="attending"]').forEach(r => r.addEventListener("change", syncAttend));

  // the name typed at the entrance is the login; the name box is locked to it, with a way to change
  const guest = load("of-guest") || {};
  const last = load(KEY);
  const startRec = lookup(guest.name) || (last ? lookup(last.name) : null);
  const notYou = document.createElement("a");
  notYou.href = "#"; notYou.className = "rsvp-hint rsvp-notyou"; notYou.textContent = T.notYou; notYou.hidden = true;
  nameEl.insertAdjacentElement("afterend", notYou);
  function lockName(r, typed) {
    nameEl.value = (r && r.f) || typed || nameEl.value;
    nameEl.readOnly = !!r; notYou.hidden = !r;
  }
  notYou.addEventListener("click", e => {
    e.preventDefault(); lockName(null, ""); nameEl.value = ""; setParty(null); nameEl.focus();
  });
  nameEl.addEventListener("change", () => {
    const r = lookup(nameEl.value.trim());
    if (r) { lockName(r); setParty(r); }
  });

  setParty(startRec);
  if (last) {
    lockName(startRec, last.name);
    const r = form.querySelector('input[name="attending"][value="' + last.attending + '"]'); if (r) r.checked = true;
    if (last.guests) { countEl.value = Math.min(last.guests, countEl.options.length); drawExtra(last.guestNames || []); }
    $("rsvp-email").value = last.email || ""; $("rsvp-diet").value = last.dietary || "";
    $("rsvp-from").value = last.from || ""; $("rsvp-arrive").value = last.arrive || ""; $("rsvp-leave").value = last.leave || ""; $("rsvp-where").value = last.stayingAt || "";
    $("rsvp-msg").value = last.message || "";
    const pz = form.querySelector('input[name="pizza"][value="' + (last.song || "") + '"]'); if (pz) pz.checked = true;
  } else {
    lockName(startRec, guest.name);
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
    if (!rec) { const r = lookup(name); if (r) { lockName(r); setParty(r, true); } }
    if (!rec && window.GUEST_DATA && Object.keys(window.GUEST_DATA).length) { nameEl.focus(); return fail(T.errNotFound); }
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
      enteredAs: guest.name || "",
      invited: rec ? (rec.p || rec.plus ? 2 : (rec.f ? 1 : "")) : ""
    };

    if (!RSVP_ENDPOINT) { save(KEY, Object.assign({}, data, { sent: false })); return showDone(data, true); }

    btn.disabled = true; btn.textContent = T.sending;
    fetch(RSVP_ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(data) })
      .then(() => { save(KEY, Object.assign({}, data, { sent: true })); showDone(data, false); })
      .catch(() => fail(T.fail))
      .finally(() => { btn.disabled = false; btn.textContent = T.send; });
  });
});
