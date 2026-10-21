// Datenhaltung der App. Haushalt, Mitglieder, Geräte und Beitrittscode kommen live
// aus Firestore (Phase 2). Die Aufgaben sind bis Phase 3 noch Beispiele im Speicher.
// Die Ansichten nutzen nur die exportierten Funktionen.

import { firebase } from './firebase.js';
import { demoAufgaben } from './demo-daten.js';
import { putzwoche, STANDARD_WECHSEL } from './woche.js';

// Vorlage für einen neuen Haushalt (IDs bleiben, auch wenn Namen später geändert werden).
export const STANDARD_MITGLIEDER = [
  { id: 'christoph', name: 'Christoph', farbe: '#3b82f6' },
  { id: 'sandra', name: 'Sandra', farbe: '#a855f7' },
  { id: 'moira', name: 'Moira', farbe: '#14b8a6' },
  { id: 'paula', name: 'Paula', farbe: '#f59e0b' },
  { id: 'laura', name: 'Laura', farbe: '#ec4899' },
];

const HAUSHALT_SCHLUESSEL = 'putzteufel.haushalt';
const ZEICHEN = '23456789abcdefghjkmnpqrstuvwxyz'; // ohne 0, 1, i, l, o
const KENNUNG_LAENGE = 6;

const zuhoerer = new Set();
let fb = null;
let beobachter = [];

const zustand = {
  phase: 'laedt', // laedt | fehler | ungekoppelt | bereit
  meldung: null, // Hinweis für den Startbildschirm, z. B. „Gerät wurde entfernt“
  uid: null,
  haushaltId: null,
  haushalt: null,
  geraet: null, // dieses Gerät (households/{id}/devices/{uid})
  mitglieder: [],
  geraete: [],
  code: null, // Beitrittscode – nur für Personen-Geräte lesbar
  offline: false,
  demoAufgaben: true,
  aufgaben: demoAufgaben(putzwoche(new Date(), STANDARD_WECHSEL).schluessel),
};

export const holeZustand = () => zustand;

export function abonniere(fn) {
  zuhoerer.add(fn);
  return () => zuhoerer.delete(fn);
}

function setze(felder) {
  Object.assign(zustand, felder);
  zuhoerer.forEach((fn) => fn(zustand));
}

export const aktuelleWoche = (jetzt = new Date()) =>
  putzwoche(jetzt, (zustand.haushalt && zustand.haushalt.wochenwechsel) || STANDARD_WECHSEL);

export const mitglied = (id) => zustand.mitglieder.find((m) => m.id === id) || null;

export const ichBin = () => (zustand.geraet ? mitglied(zustand.geraet.mitglied) : null);

// ---------- Start und Live-Daten ----------

export async function starte() {
  setze({ phase: 'laedt' });
  try {
    fb = await firebase();
  } catch (fehler) {
    console.error('Firebase nicht erreichbar:', fehler);
    setze({ phase: 'fehler', meldung: 'Keine Verbindung zur Datenbank. Bitte Internet prüfen und neu laden.' });
    return;
  }
  zustand.uid = fb.uid;
  const hid = gemerkterHaushalt();
  if (hid) beobachte(hid);
  else setze({ phase: 'ungekoppelt' });
}

function beobachte(hid) {
  stoppeBeobachtung();
  const { db, fs } = fb;
  const haushalt = fs.doc(db, 'households', hid);
  Object.assign(zustand, { haushaltId: hid, haushalt: null, geraet: null, mitglieder: [], geraete: [], code: null });

  const beiFehler = (fehler) => {
    if (fehler.code === 'permission-denied') entkoppelt('Dieses Gerät gehört nicht (mehr) zu diesem Haushalt.');
    else console.error(fehler);
  };

  beobachter.push(fs.onSnapshot(fs.doc(haushalt, 'devices', zustand.uid), { includeMetadataChanges: true }, (snap) => {
    if (!snap.exists()) {
      // Nur der Server (nicht der Offline-Cache) entscheidet, ob das Gerät entfernt wurde.
      if (!snap.metadata.fromCache) entkoppelt('Dieses Gerät wurde aus dem Haushalt entfernt.');
      return;
    }
    const warPerson = Boolean(zustand.geraet && zustand.geraet.rolle === 'person');
    setze({ phase: 'bereit', meldung: null, geraet: { id: snap.id, ...snap.data() } });
    if (zustand.geraet.rolle === 'person' && !warPerson) beobachteCode(haushalt);
  }, beiFehler));

  beobachter.push(fs.onSnapshot(haushalt, { includeMetadataChanges: true }, (snap) => {
    setze({ haushalt: snap.exists() ? { id: snap.id, ...snap.data() } : null, offline: snap.metadata.fromCache });
  }, beiFehler));

  beobachter.push(fs.onSnapshot(fs.query(fs.collection(haushalt, 'members'), fs.orderBy('reihenfolge')), (snap) => {
    setze({ mitglieder: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }, beiFehler));

  beobachter.push(fs.onSnapshot(fs.collection(haushalt, 'devices'), (snap) => {
    setze({ geraete: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }, beiFehler));
}

function beobachteCode(haushalt) {
  const { fs } = fb;
  beobachter.push(fs.onSnapshot(fs.doc(haushalt, 'geheim', 'beitritt'), (snap) => {
    setze({ code: snap.exists() ? snap.data().code : null });
  }, () => setze({ code: null })));
}

function stoppeBeobachtung() {
  beobachter.forEach((abmelden) => abmelden());
  beobachter = [];
}

function entkoppelt(meldung) {
  stoppeBeobachtung();
  vergissHaushalt();
  setze({
    phase: 'ungekoppelt', meldung, haushaltId: null, haushalt: null, geraet: null,
    mitglieder: [], geraete: [], code: null,
  });
}

// ---------- Haushalt anlegen, beitreten, Geräte ----------

export async function haushaltAnlegen({ name, ichBin: mitgliedId, test = false }) {
  const { db, fs, uid } = fb;
  const hid = zufallsKennung();
  const haushalt = fs.doc(db, 'households', hid);
  const batch = fs.writeBatch(db);
  batch.set(haushalt, {
    name,
    wochenwechsel: { ...STANDARD_WECHSEL },
    erstelltAm: fs.serverTimestamp(),
    erstelltVon: uid,
    ...(test ? { test: true } : {}),
  });
  batch.set(fs.doc(haushalt, 'geheim', 'beitritt'), { code: zufallsKennung() });
  STANDARD_MITGLIEDER.forEach((m, i) => {
    batch.set(fs.doc(haushalt, 'members', m.id), { name: m.name, farbe: m.farbe, reihenfolge: i });
  });
  batch.set(fs.doc(haushalt, 'devices', uid), {
    rolle: 'person', mitglied: mitgliedId, name: geraeteName(), gekoppeltAm: fs.serverTimestamp(),
  });
  // Es gibt nur einen Haushalt: Der echte sperrt jede weitere Neuanlage (siehe firestore.rules).
  if (!test) batch.set(fs.doc(db, 'einrichtung', 'abgeschlossen'), { haushalt: hid, erstelltAm: fs.serverTimestamp() });
  await batch.commit();
  merkeHaushalt(hid);
  beobachte(hid);
}

// Schritt 1 des Beitritts: Gerät mit Code anlegen (Rolle „neu“). Danach „Ich bin …“ wählen.
export async function beitreten(hid, code) {
  const { db, fs, uid } = fb;
  if (zustand.haushaltId && zustand.haushaltId !== hid) await entkoppeln();
  const geraet = fs.doc(db, 'households', hid, 'devices', uid);

  // Schon gekoppelt (z. B. nach gelöschtem Browserspeicher)? Dann nur wieder verbinden.
  try {
    if ((await fs.getDoc(geraet)).exists()) {
      merkeHaushalt(hid);
      beobachte(hid);
      return;
    }
  } catch (fehler) {
    if (fehler.code !== 'permission-denied') throw fehler;
  }

  await fs.setDoc(geraet, { rolle: 'neu', mitglied: null, name: geraeteName(), gekoppeltAm: fs.serverTimestamp(), code });
  merkeHaushalt(hid);
  beobachte(hid);
}

// Schritt 2: rolle 'person' mit Mitglied oder 'anzeige'. Entfernt den Code aus dem Gerät.
export function rolleWaehlen(rolle, mitgliedId = null) {
  const { db, fs, uid } = fb;
  return fs.updateDoc(fs.doc(db, 'households', zustand.haushaltId, 'devices', uid), {
    rolle, mitglied: mitgliedId, code: fs.deleteField(),
  });
}

export function ichBinWechseln(mitgliedId) {
  const { db, fs, uid } = fb;
  return fs.updateDoc(fs.doc(db, 'households', zustand.haushaltId, 'devices', uid), { mitglied: mitgliedId });
}

export async function geraetEntfernen(uid) {
  if (uid === zustand.uid) return entkoppeln();
  const { db, fs } = fb;
  return fs.deleteDoc(fs.doc(db, 'households', zustand.haushaltId, 'devices', uid));
}

export async function entkoppeln() {
  const { db, fs, uid } = fb;
  const hid = zustand.haushaltId;
  stoppeBeobachtung();
  if (hid) await fs.deleteDoc(fs.doc(db, 'households', hid, 'devices', uid));
  entkoppelt(null);
}

export function codeErneuern() {
  const { db, fs } = fb;
  return fs.setDoc(fs.doc(db, 'households', zustand.haushaltId, 'geheim', 'beitritt'), { code: zufallsKennung() });
}

// ---------- Einladung ----------

export function einladungsLink() {
  if (!zustand.haushaltId || !zustand.code) return null;
  return `${location.origin}${location.pathname}#/beitreten?h=${zustand.haushaltId}&c=${zustand.code}`;
}

// Zum Abtippen (z. B. am Fernseher): Haushalts-ID und Code, in Dreiergruppen.
export function einladungsCode() {
  if (!zustand.haushaltId || !zustand.code) return null;
  return `${zustand.haushaltId}${zustand.code}`.toUpperCase().match(/.{3}/g).join('-');
}

// Liest einen eingegebenen Einladungscode oder einen eingefügten Einladungslink.
export function leseEinladung(text) {
  const eingabe = String(text || '').trim();
  const link = eingabe.match(/[?&]h=([^&#\s]+).*?[?&]c=([^&#\s]+)/);
  if (link) return pruefe(link[1], link[2]);
  const zeichen = eingabe.toLowerCase().replace(/[^0-9a-z]/g, '');
  return zeichen.length === 2 * KENNUNG_LAENGE
    ? pruefe(zeichen.slice(0, KENNUNG_LAENGE), zeichen.slice(KENNUNG_LAENGE))
    : null;
}

function pruefe(h, c) {
  const gueltig = (s) => s.length === KENNUNG_LAENGE && [...s].every((z) => ZEICHEN.includes(z));
  const hid = h.toLowerCase();
  const code = c.toLowerCase();
  return gueltig(hid) && gueltig(code) ? { hid, code } : null;
}

// ---------- Hilfen ----------

function zufallsKennung() {
  const zahlen = crypto.getRandomValues(new Uint8Array(32));
  let kennung = '';
  for (const z of zahlen) {
    if (z < 248) kennung += ZEICHEN[z % ZEICHEN.length]; // 248 = 8 × 31, gleichverteilt
    if (kennung.length === KENNUNG_LAENGE) return kennung;
  }
  return zufallsKennung();
}

function geraeteName() {
  const ua = navigator.userAgent;
  if (/AFT|Silk/i.test(ua)) return 'Fire TV';
  if (/Android/i.test(ua)) return 'Android-Gerät';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone/iPad';
  if (/Windows/i.test(ua)) return 'Windows-PC';
  if (/Macintosh/i.test(ua)) return 'Mac';
  return 'Browser';
}

function gemerkterHaushalt() {
  try {
    return localStorage.getItem(HAUSHALT_SCHLUESSEL);
  } catch (e) {
    return null;
  }
}

function merkeHaushalt(hid) {
  try {
    localStorage.setItem(HAUSHALT_SCHLUESSEL, hid);
  } catch (e) { /* Speicher nicht verfügbar */ }
}

function vergissHaushalt() {
  try {
    localStorage.removeItem(HAUSHALT_SCHLUESSEL);
  } catch (e) { /* Speicher nicht verfügbar */ }
}

// ---------- Aufgaben (bis Phase 3 nur Beispiele im Speicher) ----------

function setzeAufgabe(id, felder) {
  const aufgabe = zustand.aufgaben.find((a) => a.id === id);
  if (!aufgabe) return;
  Object.assign(aufgabe, felder, { statusWoche: aktuelleWoche().schluessel });
  setze({});
}

export const uebernehmen = (id, mitgliedId) => setzeAufgabe(id, { status: 'uebernommen', uebernommenVon: mitgliedId });
export const zurueckgeben = (id) => setzeAufgabe(id, { status: 'offen', uebernommenVon: null });
// Phase 3: schreibt zusätzlich einen Eintrag in households/{id}/log.
export const erledigen = (id, mitgliedId) => setzeAufgabe(id, { status: 'erledigt', uebernommenVon: mitgliedId });

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
  setze({});
}
