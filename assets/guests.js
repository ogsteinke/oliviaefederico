// =====================================================================
//  GUESTS AND QUESTIONS
// =====================================================================
//  The guest list, the questions and your answers come from the Google
//  Sheet (tab "Domande per sito e invitati"). After editing the sheet, run
//      python3 tools/sync_guests.py
//  which rewrites assets/guests-data.js. Don't edit that file by hand.
//
//  This file only holds the fallback questions for guests who have no
//  question of their own in the sheet (or whose name isn't found).
// =====================================================================

// Guests whose name is not in the list above get one of these questions
// (always the same one for the same name).
window.DEFAULT_QUESTIONS = [
  { it: "Che titolo dareste a un ritratto di Olivia e Federico?", en: "What title would you give a portrait of Olivia and Federico?" },
  { it: "Qual è il vostro ricordo più bello con gli sposi?", en: "What is your favourite memory with the couple?" },
  { it: "Descrivete Olivia e Federico in tre parole (una deve riguardare i cani).", en: "Describe Olivia and Federico in three words (one must be about dogs)." }
];

// Optional: where to send the answers (e.g. a Google Apps Script web app or
// a Formspree form URL). Leave empty while testing: answers then stay only in
// the guest's own browser.
window.ANSWERS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyqovKCatmAZGExXegdYArrk2r4N3NzKZOhA3rtnaI7ta1jDHp1RjVV013HzJ5jdG7YfQ/exec"; // same Google Sheet script as the RSVP (tab "Risposte")
