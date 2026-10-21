// Prüft die eingespielten Firestore-Regeln gegen die echte Datenbank.
//
// Aufruf im Projektordner:  node tools/regeln-pruefen.mjs
//
// Legt dafür einen Haushalt „TEST – Regelprüfung …“ (Feld test: true) und mehrere
// anonyme Test-Geräte an. Die Testdaten lassen sich danach löschen mit
//   npx firebase-tools firestore:delete households/<ID> --recursive
//
// Hinweis: Test-Haushalte gehen nur, solange der echte Haushalt noch nicht angelegt ist
// (danach sperrt einrichtung/abgeschlossen jede Neuanlage). Spätere Regeländerungen
// werden dann mit vorübergehend gekoppelten Test-Geräten im echten Haushalt geprüft.

import { firebaseConfig } from '../js/config.js';

const { apiKey, projectId } = firebaseConfig;
const DB = `projects/${projectId}/databases/(default)/documents`;
const BASIS = `https://firestore.googleapis.com/v1/${DB}`;
const HERKUNFT = { Referer: 'https://de-mattia.github.io/putzteufel/' };
const ZEICHEN = '23456789abcdefghjkmnpqrstuvwxyz';

const kennung = () => Array.from({ length: 6 }, () => ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)]).join('');

// ---------- Firestore-REST ----------

function wert(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  if (typeof v === 'string') return { stringValue: v };
  return { mapValue: { fields: felder(v) } };
}

const felder = (objekt) => Object.fromEntries(Object.entries(objekt).map(([k, v]) => [k, wert(v)]));

async function geraetAnmelden() {
  const antwort = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...HERKUNFT },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const daten = await antwort.json();
  if (!antwort.ok) throw new Error(`Anonyme Anmeldung fehlgeschlagen: ${JSON.stringify(daten.error)}`);
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

// Schreibvorgänge als Batch (wie die App): [{ art: 'anlegen'|'aendern'|'setzen'|'loeschen', pfad, daten, zeit: [...] }]
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
console.log(`Test-Haushalt: ${hid}\n`);

const gruender = await geraetAnmelden();
const fremd = await geraetAnmelden();
const fernseher = await geraetAnmelden();
const handy = await geraetAnmelden();
const spaet = await geraetAnmelden();

const beitritt = (geraet, mitCode, rolle = 'neu') => schreiben(geraet, [{
  art: 'anlegen', pfad: `${h}/devices/${geraet.uid}`, zeit: ['gekoppeltAm'],
  daten: { rolle, mitglied: null, name: 'Regelprüfung', code: mitCode },
}]);
const rolle = (geraet, neueRolle, mitglied = null) => schreiben(geraet, [{
  art: 'aendern', pfad: `${h}/devices/${geraet.uid}`, daten: { rolle: neueRolle, mitglied }, entfernen: ['code'],
}]);

console.log('Gründung');
await erwarte('Fremdes Gerät legt Haushalt an, ohne sich zu koppeln', false, () => schreiben(fremd, [
  { art: 'anlegen', pfad: `households/${kennung()}`, zeit: ['erstelltAm'], daten: { name: 'TEST – unvollständig', wochenwechsel: { wochentag: 0, stunde: 20, minute: 0 }, erstelltVon: fremd.uid, test: true } },
]));
const echterHaushalt = kennung();
await erwarte('Echten Haushalt ohne Einrichtungssperre anlegen', false, () => schreiben(fremd, [
  { art: 'anlegen', pfad: `households/${echterHaushalt}`, zeit: ['erstelltAm'], daten: { name: 'TEST – ohne Sperre', wochenwechsel: { wochentag: 0, stunde: 20, minute: 0 }, erstelltVon: fremd.uid } },
  { art: 'anlegen', pfad: `households/${echterHaushalt}/members/christoph`, daten: { name: 'Christoph', farbe: '#3b82f6', reihenfolge: 0 } },
  { art: 'anlegen', pfad: `households/${echterHaushalt}/devices/${fremd.uid}`, zeit: ['gekoppeltAm'], daten: { rolle: 'person', mitglied: 'christoph', name: 'x' } },
]));
await erwarte('Einrichtungssperre für einen Test-Haushalt anlegen', false, () => schreiben(fremd, [
  { art: 'anlegen', pfad: `households/${echterHaushalt}`, zeit: ['erstelltAm'], daten: { name: 'TEST – Sperre', wochenwechsel: { wochentag: 0, stunde: 20, minute: 0 }, erstelltVon: fremd.uid, test: true } },
  { art: 'anlegen', pfad: `households/${echterHaushalt}/members/christoph`, daten: { name: 'Christoph', farbe: '#3b82f6', reihenfolge: 0 } },
  { art: 'anlegen', pfad: `households/${echterHaushalt}/devices/${fremd.uid}`, zeit: ['gekoppeltAm'], daten: { rolle: 'person', mitglied: 'christoph', name: 'x' } },
  { art: 'anlegen', pfad: 'einrichtung/abgeschlossen', zeit: ['erstelltAm'], daten: { haushalt: echterHaushalt } },
]));
await erwarte('Erstes Gerät legt Haushalt mit Mitgliedern an und koppelt sich als Person', true, () => schreiben(gruender, [
  { art: 'anlegen', pfad: h, zeit: ['erstelltAm'], daten: { name: `TEST – Regelprüfung ${new Date().toISOString().slice(0, 16)}`, wochenwechsel: { wochentag: 0, stunde: 20, minute: 0 }, erstelltVon: gruender.uid, test: true } },
  { art: 'anlegen', pfad: `${h}/geheim/beitritt`, daten: { code } },
  { art: 'anlegen', pfad: `${h}/members/christoph`, daten: { name: 'Christoph', farbe: '#3b82f6', reihenfolge: 0 } },
  { art: 'anlegen', pfad: `${h}/members/sandra`, daten: { name: 'Sandra', farbe: '#a855f7', reihenfolge: 1 } },
  { art: 'anlegen', pfad: `${h}/devices/${gruender.uid}`, zeit: ['gekoppeltAm'], daten: { rolle: 'person', mitglied: 'christoph', name: 'Regelprüfung' } },
]));

console.log('\nOhne Anmeldung');
await erwarte('Haushalt lesen', false, () => lesen(null, h));
await erwarte('Mitglieder lesen', false, () => lesen(null, `${h}/members`));

console.log('\nFremdes Gerät (angemeldet, nicht gekoppelt)');
await erwarte('Haushalt lesen', false, () => lesen(fremd, h));
await erwarte('Alle Haushalte auflisten', false, () => lesen(fremd, 'households'));
await erwarte('Mitglieder lesen', false, () => lesen(fremd, `${h}/members`));
await erwarte('Beitrittscode lesen', false, () => lesen(fremd, `${h}/geheim/beitritt`));
await erwarte('Beitreten mit falschem Code', false, () => beitritt(fremd, kennung()));
await erwarte('Beitreten ohne Code als Person', false, () => schreiben(fremd, [{
  art: 'anlegen', pfad: `${h}/devices/${fremd.uid}`, zeit: ['gekoppeltAm'], daten: { rolle: 'person', mitglied: 'christoph', name: 'x' },
}]));
await erwarte('Gerät des Gründers löschen', false, () => schreiben(fremd, [{ art: 'loeschen', pfad: `${h}/devices/${gruender.uid}` }]));

console.log('\nFernseher (Beitritt, dann Anzeige)');
await erwarte('Beitreten mit richtigem Code direkt als Anzeige', false, () => beitritt(fernseher, code, 'anzeige'));
await erwarte('Beitreten mit richtigem Code', true, () => beitritt(fernseher, code));
await erwarte('Mitglieder lesen (Rolle „neu“)', true, () => lesen(fernseher, `${h}/members`));
await erwarte('Beitrittscode lesen (Rolle „neu“)', false, () => lesen(fernseher, `${h}/geheim/beitritt`));
await erwarte('Rolle „Anzeige“ wählen', true, () => rolle(fernseher, 'anzeige'));
await erwarte('Haushalt lesen', true, () => lesen(fernseher, h));
await erwarte('Sich selbst zur Person machen', false, () => rolle(fernseher, 'person', 'sandra'));
await erwarte('Mitglied anlegen', false, () => schreiben(fernseher, [{ art: 'anlegen', pfad: `${h}/members/x`, daten: { name: 'X', farbe: '#000000', reihenfolge: 9 } }]));
await erwarte('Aufgabe anlegen', false, () => schreiben(fernseher, [{ art: 'anlegen', pfad: `${h}/tasks/x`, daten: { titel: 'x' } }]));
await erwarte('Verlaufseintrag anlegen', false, () => schreiben(fernseher, [{ art: 'anlegen', pfad: `${h}/log/x`, daten: { titel: 'x' } }]));
await erwarte('Haushalt umbenennen', false, () => schreiben(fernseher, [{ art: 'aendern', pfad: h, daten: { name: 'gehackt' } }]));
await erwarte('Beitrittscode ändern', false, () => schreiben(fernseher, [{ art: 'setzen', pfad: `${h}/geheim/beitritt`, daten: { code: kennung() } }]));
await erwarte('Anderes Gerät entfernen', false, () => schreiben(fernseher, [{ art: 'loeschen', pfad: `${h}/devices/${gruender.uid}` }]));

console.log('\nZweites Handy (Beitritt als Person)');
await erwarte('Beitreten mit richtigem Code', true, () => beitritt(handy, code));
await erwarte('„Ich bin Sandra“ wählen', true, () => rolle(handy, 'person', 'sandra'));
await erwarte('Als Person ein nicht vorhandenes Mitglied wählen', false, () => rolle(handy, 'person', 'niemand'));
await erwarte('Beitrittscode lesen (für den QR-Code)', true, () => lesen(handy, `${h}/geheim/beitritt`));
const eintrag = `${h}/log/regelpruefung-${Date.now()}`;
await erwarte('Verlaufseintrag anlegen', true, () => schreiben(handy, [{ art: 'anlegen', pfad: eintrag, daten: { titel: 'Regelprüfung', erledigtVon: 'sandra', kw: 'test' } }]));
await erwarte('Verlaufseintrag ändern', false, () => schreiben(handy, [{ art: 'aendern', pfad: eintrag, daten: { titel: 'geändert' } }]));
await erwarte('Verlaufseintrag löschen', false, () => schreiben(handy, [{ art: 'loeschen', pfad: eintrag }]));
await erwarte('Aufgabe anlegen', true, () => schreiben(handy, [{ art: 'anlegen', pfad: `${h}/tasks/regelpruefung`, daten: { titel: 'Regelprüfung' } }]));
await erwarte('Aufgabe löschen', true, () => schreiben(handy, [{ art: 'loeschen', pfad: `${h}/tasks/regelpruefung` }]));
await erwarte('Haushalt löschen', false, () => schreiben(handy, [{ art: 'loeschen', pfad: h }]));

console.log('\nCode erneuern und Gerät entfernen');
const neuerCode = kennung();
await erwarte('Gründer erneuert den Beitrittscode', true, () => schreiben(gruender, [{ art: 'setzen', pfad: `${h}/geheim/beitritt`, daten: { code: neuerCode } }]));
await erwarte('Beitreten mit altem Code', false, () => beitritt(spaet, code));
await erwarte('Gründer entfernt den Fernseher', true, () => schreiben(gruender, [{ art: 'loeschen', pfad: `${h}/devices/${fernseher.uid}` }]));
await erwarte('Entfernter Fernseher liest Haushalt', false, () => lesen(fernseher, h));
await erwarte('Zweites Handy entkoppelt sich selbst', true, () => schreiben(handy, [{ art: 'loeschen', pfad: `${h}/devices/${handy.uid}` }]));

const fehler = ergebnisse.filter((ok) => !ok).length;
console.log(`\n${ergebnisse.length - fehler} von ${ergebnisse.length} Prüfungen bestanden.`);
console.log(`Testdaten: households/${hid} (test: true) und ${5} anonyme Test-Konten.`);
process.exitCode = fehler ? 1 : 0;
