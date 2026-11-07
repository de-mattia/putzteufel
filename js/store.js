// Datenhaltung der App: Zuhause, Mitglieder, Geräte, Beitrittscode und Aufgaben kommen
// live aus Firestore. Die Ansichten nutzen nur die exportierten Funktionen.
// Es gibt genau einen Haushalt mit der festen ID „zuhause“.

import { firebase } from './firebase.js';
import { putzwoche, STANDARD_WECHSEL } from './woche.js';

// Die Mitglieder von Zuhause (werden beim Einrichten angelegt).
export const STANDARD_MITGLIEDER = [
  { id: 'christoph', name: 'Christoph', farbe: '#3b82f6' },
  { id: 'sandra', name: 'Sandra', farbe: '#a855f7' },
  { id: 'moira', name: 'Moira', farbe: '#14b8a6' },
  { id: 'paula', name: 'Paula', farbe: '#f59e0b' },
  { id: 'laura', name: 'Laura', farbe: '#ec4899' },
];

const HAUSHALT = 'zuhause';
const ZEICHEN = '23456789abcdefghjkmnpqrstuvwxyz'; // ohne 0, 1, i, l, o
const CODE_LAENGE = 8; // 31^8 ≈ 8,5 · 10^11 Möglichkeiten

const zuhoerer = new Set();
let fb = null;
let beobachter = [];
let aufgabenGeladen = false; // erster Stand der Aufgaben vom Server da?
let codeBeobachtet = false;
let aufgeraeumtFuer = null; // Putzwoche, für die der Wochenwechsel schon geschrieben wurde

const zustand = {
  phase: 'laedt', // laedt | fehler | ungekoppelt | bereit
  meldung: null, // Hinweis für den Startbildschirm, z. B. „Gerät wurde entfernt“
  eingerichtet: null, // Ist Zuhause schon angelegt? (nur für nicht gekoppelte Geräte)
  uid: null,
  haushalt: null,
  geraet: null, // dieses Gerät (households/{id}/devices/{uid})
  mitglieder: [],
  geraete: [],
  code: null, // Beitrittscode – für Geräte mit Person und Anzeigen lesbar
  aufgaben: [],
  offline: false,
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

  // Gekoppelt? Das eigene Gerätedokument ist nur lesbar, wenn es existiert.
  try {
    if ((await fb.fs.getDoc(geraetRef())).exists()) {
      beobachte();
      return;
    }
  } catch (fehler) {
    if (fehler.code !== 'permission-denied') {
      console.error(fehler);
      setze({ phase: 'fehler', meldung: 'Keine Verbindung zur Datenbank. Bitte Internet prüfen und neu laden.' });
      return;
    }
  }
  setze({ phase: 'ungekoppelt', eingerichtet: await istEingerichtet() });
}

// Ist Zuhause schon angelegt? Das Merkdokument darf jedes angemeldete Gerät lesen.
async function istEingerichtet() {
  try {
    return (await fb.fs.getDoc(fb.fs.doc(fb.db, 'einrichtung', 'abgeschlossen'))).exists();
  } catch (fehler) {
    console.error(fehler);
    return true; // im Zweifel nur die Einladung anbieten
  }
}

const haushaltRef = () => fb.fs.doc(fb.db, 'households', HAUSHALT);
const geraetRef = (uid = zustand.uid) => fb.fs.doc(haushaltRef(), 'devices', uid);

function beobachte() {
  stoppeBeobachtung();
  const { fs } = fb;
  const haushalt = haushaltRef();
  Object.assign(zustand, { haushalt: null, geraet: null, mitglieder: [], geraete: [], code: null, aufgaben: [] });
  aufgabenGeladen = false;
  aufgeraeumtFuer = null;
  codeBeobachtet = false;

  const beiFehler = (fehler) => {
    if (fehler.code === 'permission-denied') entkoppelt('Dieses Gerät ist nicht mehr gekoppelt.');
    else console.error(fehler);
  };

  beobachter.push(fs.onSnapshot(geraetRef(), { includeMetadataChanges: true }, (snap) => {
    if (!snap.exists()) {
      // Nur der Server (nicht der Offline-Cache) entscheidet, ob das Gerät entfernt wurde.
      if (!snap.metadata.fromCache) entkoppelt('Dieses Gerät wurde entfernt.');
      return;
    }
    setze({ phase: 'bereit', meldung: null, geraet: { id: snap.id, ...snap.data() } });
    // Den Code erst abfragen, wenn die Rolle beim Server angekommen ist – sonst lehnt er ab.
    const darfCode = zustand.geraet.rolle === 'person' || zustand.geraet.rolle === 'anzeige';
    if (darfCode && !codeBeobachtet && !snap.metadata.hasPendingWrites) beobachteCode(haushalt);
    wochenwechselSchreiben();
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

  // Mit Metadaten, damit auch die Bestätigung „vom Server“ ankommt, wenn der Cache schon stimmte.
  beobachter.push(fs.onSnapshot(fs.collection(haushalt, 'tasks'), { includeMetadataChanges: true }, (snap) => {
    setze({ aufgaben: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    if (!snap.metadata.fromCache) aufgabenGeladen = true;
    wochenwechselSchreiben();
  }, beiFehler));
}

function beobachteCode(haushalt) {
  const { fs } = fb;
  codeBeobachtet = true;
  beobachter.push(fs.onSnapshot(fs.doc(haushalt, 'geheim', 'beitritt'), (snap) => {
    setze({ code: snap.exists() ? snap.data().code : null });
  }, () => {
    codeBeobachtet = false; // beim nächsten Stand des Geräts erneut versuchen
    setze({ code: null });
  }));
}

function stoppeBeobachtung() {
  beobachter.forEach((abmelden) => abmelden());
  beobachter = [];
}

function entkoppelt(meldung) {
  stoppeBeobachtung();
  setze({
    phase: 'ungekoppelt', meldung, eingerichtet: true, haushalt: null, geraet: null,
    mitglieder: [], geraete: [], code: null, aufgaben: [],
  });
}

// ---------- Zuhause einrichten, beitreten, Geräte ----------

// Legt Zuhause an (nur einmal möglich, dafür sorgen die Firestore-Regeln) und koppelt
// dieses Gerät als die gewählte Person.
export async function zuhauseEinrichten(mitgliedId) {
  const { db, fs, uid } = fb;
  const haushalt = haushaltRef();
  const batch = fs.writeBatch(db);
  batch.set(haushalt, { wochenwechsel: { ...STANDARD_WECHSEL }, erstelltAm: fs.serverTimestamp(), erstelltVon: uid });
  batch.set(fs.doc(haushalt, 'geheim', 'beitritt'), { code: zufallsCode() });
  STANDARD_MITGLIEDER.forEach((m, i) => {
    batch.set(fs.doc(haushalt, 'members', m.id), { name: m.name, farbe: m.farbe, reihenfolge: i });
  });
  batch.set(fs.doc(haushalt, 'devices', uid), {
    rolle: 'person', mitglied: mitgliedId, name: geraeteName(), gekoppeltAm: fs.serverTimestamp(),
  });
  batch.set(fs.doc(db, 'einrichtung', 'abgeschlossen'), { erstelltAm: fs.serverTimestamp() });
  await batch.commit();
  beobachte();
}

// Schritt 1 des Beitritts: Gerät mit Code anlegen (Rolle „neu“). Danach „Ich bin …“ wählen.
export async function beitreten(code) {
  const { fs } = fb;
  await fs.setDoc(geraetRef(), { rolle: 'neu', mitglied: null, name: geraeteName(), gekoppeltAm: fs.serverTimestamp(), code });
  beobachte();
}

// Schritt 2: rolle 'person' mit Mitglied oder 'anzeige'. Entfernt den Code aus dem Gerät.
export function rolleWaehlen(rolle, mitgliedId = null) {
  return fb.fs.updateDoc(geraetRef(), { rolle, mitglied: mitgliedId, code: fb.fs.deleteField() });
}

// Profilbild der eigenen Person (die Regeln erlauben nur das eigene).
export function profilbildSetzen(bild) {
  return fb.fs.updateDoc(fb.fs.doc(haushaltRef(), 'members', zustand.geraet.mitglied), { bild });
}

export async function geraetEntfernen(uid) {
  if (uid === zustand.uid) return entkoppeln();
  return fb.fs.deleteDoc(geraetRef(uid));
}

export async function entkoppeln() {
  stoppeBeobachtung();
  await fb.fs.deleteDoc(geraetRef());
  entkoppelt(null);
}

export function codeErneuern() {
  return fb.fs.setDoc(fb.fs.doc(haushaltRef(), 'geheim', 'beitritt'), { code: zufallsCode() });
}

// ---------- Einladung ----------

export function einladungsLink() {
  return zustand.code ? `${location.origin}${location.pathname}#/beitreten?c=${zustand.code}` : null;
}

// Zum Abtippen (z. B. am Fernseher): 8 Zeichen in zwei Vierergruppen, z. B. „K3M9-X2QA“.
export function einladungsCode() {
  return zustand.code ? zustand.code.toUpperCase().match(/.{4}/g).join('-') : null;
}

// Liest einen eingegebenen Einladungscode oder einen eingefügten Einladungslink.
export function leseEinladung(text) {
  const eingabe = String(text || '').trim();
  const link = eingabe.match(/[?&]c=([^&#\s]+)/);
  const code = (link ? link[1] : eingabe).toLowerCase().replace(/[^0-9a-z]/g, '');
  return code.length === CODE_LAENGE && [...code].every((z) => ZEICHEN.includes(z)) ? code : null;
}

// ---------- Aufgaben ----------

const aufgabenRef = () => fb.fs.collection(haushaltRef(), 'tasks');
const aufgabeRef = (id) => fb.fs.doc(aufgabenRef(), id);

export function aufgabeAnlegen(titel, typ) {
  return fb.fs.addDoc(aufgabenRef(), {
    titel, typ, status: 'offen', uebernommenVon: null, statusWoche: null, erstelltAm: fb.fs.serverTimestamp(),
  });
}

export const aufgabeUmbenennen = (id, titel) => fb.fs.updateDoc(aufgabeRef(id), { titel });

export const aufgabeLoeschen = (id) => fb.fs.deleteDoc(aufgabeRef(id));

// Neuer Status einer Karte. Wer „Erledigt“ setzt, schreibt im selben Batch einen Verlaufseintrag.
export function statusSetzen(aufgabe, status, mitgliedId) {
  const { db, fs } = fb;
  const woche = aktuelleWoche().schluessel;
  const batch = fs.writeBatch(db);
  batch.update(aufgabeRef(aufgabe.id), {
    status, uebernommenVon: status === 'offen' ? null : mitgliedId, statusWoche: woche,
  });
  if (status === 'erledigt') {
    batch.set(fs.doc(fs.collection(haushaltRef(), 'log')), {
      aufgabe: aufgabe.id, titel: aufgabe.titel, erledigtVon: mitgliedId, zeitpunkt: fs.serverTimestamp(), kw: woche,
    });
  }
  return batch.commit();
}

export const uebernehmen = (aufgabe, mitgliedId) => statusSetzen(aufgabe, 'uebernommen', mitgliedId);
export const zurueckgeben = (aufgabe) => statusSetzen(aufgabe, 'offen', null);
export const erledigen = (aufgabe, mitgliedId) => statusSetzen(aufgabe, 'erledigt', mitgliedId);

// Wochenwechsel physisch nachziehen (die Anzeige rechnet ohnehin schon richtig): veraltete
// Wochenkarten zurück auf „Offen“, erledigte einmalige Aufgaben aus Vorwochen löschen.
// Je Karte eine Transaktion, damit zwei Geräte sich nicht in die Quere kommen.
function wochenwechselSchreiben() {
  const rolle = zustand.geraet && zustand.geraet.rolle;
  if (!aufgabenGeladen || (rolle !== 'person' && rolle !== 'anzeige')) return;
  const woche = aktuelleWoche().schluessel;
  if (aufgeraeumtFuer === woche) return;
  aufgeraeumtFuer = woche;

  const { db, fs } = fb;
  const veraltet = (a) => a.statusWoche && a.statusWoche !== woche;
  zustand.aufgaben.filter(veraltet).forEach((a) => {
    const zuruecksetzen = a.typ === 'woche' && a.status !== 'offen';
    const loeschen = a.typ === 'einmalig' && a.status === 'erledigt' && rolle === 'person';
    if (!zuruecksetzen && !loeschen) return;
    fs.runTransaction(db, async (t) => {
      const snap = await t.get(aufgabeRef(a.id));
      if (!snap.exists() || !veraltet(snap.data())) return;
      if (zuruecksetzen) t.update(snap.ref, { status: 'offen', uebernommenVon: null, statusWoche: null });
      else t.delete(snap.ref);
    }).catch((fehler) => console.warn('Wochenwechsel nicht geschrieben:', fehler));
  });
}

// ---------- Hilfen ----------

function zufallsCode() {
  const zahlen = crypto.getRandomValues(new Uint8Array(32));
  let code = '';
  for (const z of zahlen) {
    if (z < 248) code += ZEICHEN[z % ZEICHEN.length]; // 248 = 8 × 31, gleichverteilt
    if (code.length === CODE_LAENGE) return code;
  }
  return zufallsCode();
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
