// Prüft die Firestore-Regeln im lokalen Emulator – die echte Datenbank bleibt unberührt.
//
// Aufruf im Projektordner (braucht Java 21 für den Emulator):
//   npx firebase-tools@15.34.0 emulators:exec --only auth,firestore "node tools/regeln-pruefen.mjs"
//
// emulators:exec startet Auth- und Firestore-Emulator mit firestore.rules, setzt
// FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST und beendet beide danach wieder.

import { firebaseConfig } from '../js/config.js';

const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!FIRESTORE || !AUTH) {
  console.error('Nur im Emulator: npx firebase-tools@15.34.0 emulators:exec --only auth,firestore "node tools/regeln-pruefen.mjs"');
  process.exit(2);
}

const DB = `projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const BASIS = `http://${FIRESTORE}/v1/${DB}`;
const ZEICHEN = '23456789abcdefghjkmnpqrstuvwxyz';
const kennung = () => Array.from({ length: 6 }, () => ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)]).join('');

// ---------- REST ----------

function wert(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'string') return { stringValue: v };
  return { mapValue: { fields: felder(v) } };
}

const felder = (objekt) => Object.fromEntries(Object.entries(objekt).map(([k, v]) => [k, wert(v)]));

async function geraetAnmelden() {
  const antwort = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const daten = await antwort.json();
  return { uid: daten.localId, token: daten.idToken };
}

async function anfrage(geraet, methode, pfad, body) {
  const antwort = await fetch(`${BASIS}${pfad}`, {
    method: methode,
    headers: { 'Content-Type': 'application/json', ...(geraet ? { Authorization: `Bearer ${geraet.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return antwort.status;
}

const lesen = (geraet, pfad) => anfrage(geraet, 'GET', `/${pfad}`);

// Schreibvorgänge als Batch (wie die App): [{ art: 'anlegen'|'aendern'|'setzen'|'loeschen', pfad, daten, zeit, entfernen }]
function schreiben(geraet, vorgaenge) {
  const writes = vorgaenge.map(({ art, pfad, daten = {}, zeit = [], entfernen = [] }) => {
    const name = `${DB}/${pfad}`;
    if (art === 'loeschen') return { delete: name };
    const write = { update: { name, fields: felder(daten) } };
    if (art === 'anlegen') write.currentDocument = { exists: false };
    if (art === 'aendern') {
      write.currentDocument = { exists: true };
      write.updateMask = { fieldPaths: [...Object.keys(daten), ...entfernen] };
    }
    if (zeit.length) write.updateTransforms = zeit.map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' }));
    return write;
  });
  return anfrage(geraet, 'POST', ':commit', { writes });
}

// ---------- Prüfungen ----------

const ergebnisse = [];

async function erwarte(beschreibung, erlaubt, versuch) {
  const status = await versuch();
  const ok = erlaubt ? status === 200 : status === 403;
  ergebnisse.push(ok);
  console.log(`${ok ? '✓' : '✗'} ${erlaubt ? 'erlaubt ' : 'verboten'}  ${beschreibung}  (HTTP ${status})`);
}

const hid = kennung();
const code = kennung();
const h = `households/${hid}`;
const WECHSEL = { wochentag: 0, stunde: 20, minute: 0 };

const gruender = await geraetAnmelden();
const fremd = await geraetAnmelden();
const fernseher = await geraetAnmelden();
const handy = await geraetAnmelden();
const neues = await geraetAnmelden();
const spaet = await geraetAnmelden();

const gruendung = (geraet, haushalt, mitSperre) => [
  { art: 'anlegen', pfad: `households/${haushalt}`, zeit: ['erstelltAm'], daten: { name: 'Familie', wochenwechsel: WECHSEL, erstelltVon: geraet.uid } },
  { art: 'anlegen', pfad: `households/${haushalt}/geheim/beitritt`, daten: { code } },
  { art: 'anlegen', pfad: `households/${haushalt}/members/christoph`, daten: { name: 'Christoph', farbe: '#3b82f6', reihenfolge: 0 } },
  { art: 'anlegen', pfad: `households/${haushalt}/members/sandra`, daten: { name: 'Sandra', farbe: '#a855f7', reihenfolge: 1 } },
  { art: 'anlegen', pfad: `households/${haushalt}/devices/${geraet.uid}`, zeit: ['gekoppeltAm'], daten: { rolle: 'person', mitglied: 'christoph', name: 'Prüfung' } },
  ...(mitSperre ? [{ art: 'anlegen', pfad: 'einrichtung/abgeschlossen', zeit: ['erstelltAm'], daten: { haushalt } }] : []),
];
const beitritt = (geraet, mitCode, neueRolle = 'neu') => schreiben(geraet, [{
  art: 'anlegen', pfad: `${h}/devices/${geraet.uid}`, zeit: ['gekoppeltAm'],
  daten: { rolle: neueRolle, mitglied: null, name: 'Prüfung', code: mitCode },
}]);
const rolle = (geraet, neueRolle, mitglied = null) => schreiben(geraet, [{
  art: 'aendern', pfad: `${h}/devices/${geraet.uid}`, daten: { rolle: neueRolle, mitglied }, entfernen: ['code'],
}]);
const karte = (id, daten) => ({ art: 'aendern', pfad: `${h}/tasks/${id}`, daten });
const eintrag = (titel, erledigtVon = 'sandra') => ({
  art: 'anlegen', pfad: `${h}/log/${kennung()}`, zeit: ['zeitpunkt'], daten: { aufgabe: 'bad', titel, erledigtVon, kw: '2026-W43' },
});

console.log('Einrichtung (genau ein Haushalt)');
await erwarte('Haushalt ohne Einrichtungssperre anlegen', false, () => schreiben(gruender, gruendung(gruender, hid, false)));
await erwarte('Haushalt mit Mitgliedern und Sperre anlegen, als Person koppeln', true, () => schreiben(gruender, gruendung(gruender, hid, true)));
await erwarte('Zweiten Haushalt anlegen', false, () => schreiben(fremd, gruendung(fremd, kennung(), true)));
await erwarte('Einrichtungssperre lesen', false, () => lesen(gruender, 'einrichtung/abgeschlossen'));

console.log('\nOhne Anmeldung / fremdes Gerät');
await erwarte('Haushalt lesen ohne Anmeldung', false, () => lesen(null, h));
await erwarte('Haushalt lesen', false, () => lesen(fremd, h));
await erwarte('Alle Haushalte auflisten', false, () => lesen(fremd, 'households'));
await erwarte('Mitglieder lesen', false, () => lesen(fremd, `${h}/members`));
await erwarte('Aufgaben lesen', false, () => lesen(fremd, `${h}/tasks`));
await erwarte('Beitrittscode lesen', false, () => lesen(fremd, `${h}/geheim/beitritt`));
await erwarte('Beitreten mit falschem Code', false, () => beitritt(fremd, kennung()));
await erwarte('Beitreten ohne Code als Person', false, () => schreiben(fremd, [{
  art: 'anlegen', pfad: `${h}/devices/${fremd.uid}`, zeit: ['gekoppeltAm'], daten: { rolle: 'person', mitglied: 'christoph', name: 'x' },
}]));

console.log('\nAufgaben verwalten (Person)');
const neueKarte = (id, daten) => ({ art: 'anlegen', pfad: `${h}/tasks/${id}`, zeit: ['erstelltAm'], daten });
const OFFEN = { status: 'offen', uebernommenVon: null, statusWoche: null };
await erwarte('Wochenaufgabe anlegen', true, () => schreiben(gruender, [neueKarte('bad', { titel: 'Bad putzen', typ: 'woche', ...OFFEN })]));
await erwarte('Einmalige Aufgabe anlegen', true, () => schreiben(gruender, [neueKarte('keller', { titel: 'Keller', typ: 'einmalig', ...OFFEN })]));
await erwarte('Aufgabe mit Raum anlegen', false, () => schreiben(gruender, [neueKarte('x1', { titel: 'X', typ: 'woche', raum: 'Bad', ...OFFEN })]));
await erwarte('„Offen“ mit Person anlegen', false, () => schreiben(gruender, [neueKarte('x2', { titel: 'X', typ: 'woche', status: 'offen', uebernommenVon: 'sandra', statusWoche: null })]));
await erwarte('Aufgabe umbenennen', true, () => schreiben(gruender, [karte('bad', { titel: 'Bad & WC putzen' })]));

console.log('\nFernseher (Anzeige)');
await erwarte('Beitreten mit richtigem Code direkt als Anzeige', false, () => beitritt(fernseher, code, 'anzeige'));
await erwarte('Beitreten mit richtigem Code', true, () => beitritt(fernseher, code));
await erwarte('Beitrittscode lesen, solange noch „neu“', false, () => lesen(fernseher, `${h}/geheim/beitritt`));
await erwarte('Karte verschieben, solange noch „neu“', false, () => schreiben(fernseher, [karte('bad', { status: 'uebernommen', uebernommenVon: 'sandra', statusWoche: '2026-W43' })]));
await erwarte('Rolle „Anzeige“ wählen', true, () => rolle(fernseher, 'anzeige'));
await erwarte('Karte nach „Übernommen“ ziehen (Person gewählt)', true, () => schreiben(fernseher, [karte('bad', { status: 'uebernommen', uebernommenVon: 'sandra', statusWoche: '2026-W43' })]));
await erwarte('Karte nach „Erledigt“ ziehen mit Verlaufseintrag', true, () => schreiben(fernseher, [
  karte('bad', { status: 'erledigt', uebernommenVon: 'sandra', statusWoche: '2026-W43' }), eintrag('Bad & WC putzen'),
]));
await erwarte('Karte zurück nach „Offen“', true, () => schreiben(fernseher, [karte('bad', OFFEN)]));
await erwarte('Karte umbenennen', false, () => schreiben(fernseher, [karte('bad', { titel: 'gehackt' })]));
await erwarte('Aufgabe anlegen', false, () => schreiben(fernseher, [neueKarte('tv', { titel: 'TV', typ: 'woche', ...OFFEN })]));
await erwarte('Aufgabe löschen', false, () => schreiben(fernseher, [{ art: 'loeschen', pfad: `${h}/tasks/keller` }]));
await erwarte('Verlaufseintrag mit Zusatzfeld', false, () => schreiben(fernseher, [{ ...eintrag('X'), daten: { aufgabe: 'bad', titel: 'X', erledigtVon: 'sandra', kw: 'x', raum: 'Bad' } }]));
await erwarte('Sich selbst zur Person machen', false, () => rolle(fernseher, 'person', 'sandra'));
await erwarte('Mitglied anlegen', false, () => schreiben(fernseher, [{ art: 'anlegen', pfad: `${h}/members/x`, daten: { name: 'X', farbe: '#000000', reihenfolge: 9 } }]));
await erwarte('Beitrittscode lesen (Join-Knopf am Board)', true, () => lesen(fernseher, `${h}/geheim/beitritt`));
await erwarte('Beitrittscode ändern', false, () => schreiben(fernseher, [{ art: 'setzen', pfad: `${h}/geheim/beitritt`, daten: { code: kennung() } }]));
await erwarte('Anderes Gerät entfernen', false, () => schreiben(fernseher, [{ art: 'loeschen', pfad: `${h}/devices/${gruender.uid}` }]));

console.log('\nZweites Handy (Person)');
await erwarte('Beitreten mit richtigem Code', true, () => beitritt(handy, code));
await erwarte('„Ich bin Sandra“ wählen', true, () => rolle(handy, 'person', 'sandra'));
await erwarte('Als Person ein nicht vorhandenes Mitglied wählen', false, () => rolle(handy, 'person', 'niemand'));
await erwarte('Beitrittscode lesen (für den QR-Code)', true, () => lesen(handy, `${h}/geheim/beitritt`));
await erwarte('Übernehmen', true, () => schreiben(handy, [karte('keller', { status: 'uebernommen', uebernommenVon: 'sandra', statusWoche: '2026-W43' })]));
const logId = `pruefung-${Date.now()}`;
await erwarte('Erledigt mit Verlaufseintrag', true, () => schreiben(handy, [
  karte('keller', { status: 'erledigt', uebernommenVon: 'sandra', statusWoche: '2026-W43' }),
  { ...eintrag('Keller'), pfad: `${h}/log/${logId}` },
]));
await erwarte('Verlaufseintrag ändern', false, () => schreiben(handy, [{ art: 'aendern', pfad: `${h}/log/${logId}`, daten: { titel: 'geändert' } }]));
await erwarte('Verlaufseintrag löschen', false, () => schreiben(handy, [{ art: 'loeschen', pfad: `${h}/log/${logId}` }]));
await erwarte('Erledigte einmalige Aufgabe löschen (Wochenwechsel)', true, () => schreiben(handy, [{ art: 'loeschen', pfad: `${h}/tasks/keller` }]));
await erwarte('Haushalt löschen', false, () => schreiben(handy, [{ art: 'loeschen', pfad: h }]));

console.log('\nCode erneuern und Gerät entfernen');
await erwarte('Neues Gerät (Rolle „neu“) verschiebt Karte', false, async () => {
  await beitritt(neues, code);
  return schreiben(neues, [karte('bad', { status: 'uebernommen', uebernommenVon: 'sandra', statusWoche: '2026-W43' })]);
});
await erwarte('Gründer erneuert den Beitrittscode', true, () => schreiben(gruender, [{ art: 'setzen', pfad: `${h}/geheim/beitritt`, daten: { code: kennung() } }]));
await erwarte('Beitreten mit altem Code', false, () => beitritt(spaet, code));
await erwarte('Gründer entfernt den Fernseher', true, () => schreiben(gruender, [{ art: 'loeschen', pfad: `${h}/devices/${fernseher.uid}` }]));
await erwarte('Entfernter Fernseher verschiebt Karte', false, () => schreiben(fernseher, [karte('bad', { status: 'uebernommen', uebernommenVon: 'sandra', statusWoche: '2026-W43' })]));
await erwarte('Zweites Handy entkoppelt sich selbst', true, () => schreiben(handy, [{ art: 'loeschen', pfad: `${h}/devices/${handy.uid}` }]));
await erwarte('Gründer löscht Wochenaufgabe', true, () => schreiben(gruender, [{ art: 'loeschen', pfad: `${h}/tasks/bad` }]));

const fehler = ergebnisse.filter((ok) => !ok).length;
console.log(`\n${ergebnisse.length - fehler} von ${ergebnisse.length} Prüfungen bestanden.`);
process.exitCode = fehler ? 1 : 0;
