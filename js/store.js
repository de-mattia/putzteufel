// Datenhaltung der App. In Phase 1 liegt alles nur im Speicher (Beispieldaten,
// nach dem Neuladen wieder wie vorher). In Phase 2 ersetzt Firestore diese
// Datei – die Ansichten nutzen nur die exportierten Funktionen.

import { DEMO_MITGLIEDER, demoAufgaben } from './demo-daten.js';
import { putzwoche, STANDARD_WECHSEL } from './woche.js';

const zuhoerer = new Set();

const zustand = {
  demo: true,
  haushalt: { name: 'Unser Haushalt', wochenwechsel: { ...STANDARD_WECHSEL } },
  mitglieder: DEMO_MITGLIEDER,
  aufgaben: demoAufgaben(putzwoche(new Date(), STANDARD_WECHSEL).schluessel),
};

export const holeZustand = () => zustand;

export function abonniere(fn) {
  zuhoerer.add(fn);
  return () => zuhoerer.delete(fn);
}

function geaendert() {
  zuhoerer.forEach((fn) => fn(zustand));
}

export const aktuelleWoche = (jetzt = new Date()) => putzwoche(jetzt, zustand.haushalt.wochenwechsel);

export const mitglied = (id) => zustand.mitglieder.find((m) => m.id === id) || null;

function setze(id, felder) {
  const aufgabe = zustand.aufgaben.find((a) => a.id === id);
  if (!aufgabe) return;
  Object.assign(aufgabe, felder, { statusWoche: aktuelleWoche().schluessel });
  geaendert();
}

export const uebernehmen = (id, mitgliedId) => setze(id, { status: 'uebernommen', uebernommenVon: mitgliedId });
export const zurueckgeben = (id) => setze(id, { status: 'offen', uebernommenVon: null });
// Phase 2: schreibt zusätzlich einen Eintrag in households/{id}/log.
export const erledigen = (id, mitgliedId) => setze(id, { status: 'erledigt', uebernommenVon: mitgliedId });

export function neueEinmaligeAufgabe(titel, raum) {
  zustand.aufgaben.push({
    id: `demo-${Date.now()}`,
    titel,
    raum,
    typ: 'einmalig',
    aktiv: true,
    status: 'offen',
    uebernommenVon: null,
    statusWoche: null,
  });
  geaendert();
}

// Wer bin ich? Ab Phase 2 ergibt sich das aus der Gerätekopplung
// (households/{id}/devices/{uid}). Bis dahin nur eine Vorschau-Auswahl.
const ICH_SCHLUESSEL = 'putzteufel.vorschauAls';

export function ichBin() {
  let id = null;
  try {
    id = localStorage.getItem(ICH_SCHLUESSEL);
  } catch (e) { /* Speicher nicht verfügbar */ }
  return mitglied(id) || zustand.mitglieder[0];
}

export function setzeIchBin(id) {
  try {
    localStorage.setItem(ICH_SCHLUESSEL, id);
  } catch (e) { /* Speicher nicht verfügbar */ }
  geaendert();
}
