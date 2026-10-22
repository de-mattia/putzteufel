// Putzwoche: Die Woche wechselt nicht um Mitternacht, sondern zum eingestellten
// Wochenwechsel (Standard: Sonntag 20:00). Die Anzeige berechnet den effektiven
// Status jeder Karte selbst, damit z. B. der Fernseher pünktlich umspringt.

// wochentag wie Date#getDay(): 0 = Sonntag … 6 = Samstag
export const STANDARD_WECHSEL = { wochentag: 0, stunde: 20, minute: 0 };

const TAG_MS = 24 * 60 * 60 * 1000;

export const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// Letzter Wechselzeitpunkt, der nicht nach `jetzt` liegt.
export function letzterWechsel(jetzt = new Date(), wechsel = STANDARD_WECHSEL) {
  const d = new Date(jetzt);
  d.setHours(wechsel.stunde, wechsel.minute, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - wechsel.wochentag + 7) % 7));
  if (d > jetzt) d.setDate(d.getDate() - 7);
  return d;
}

export function naechsterWechsel(jetzt = new Date(), wechsel = STANDARD_WECHSEL) {
  const d = letzterWechsel(jetzt, wechsel);
  d.setDate(d.getDate() + 7);
  return d;
}

// ISO-Kalenderwoche eines Datums.
export function isoWoche(datum) {
  const t = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const jahresAnfang = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { jahr: t.getUTCFullYear(), kw: Math.ceil(((t - jahresAnfang) / TAG_MS + 1) / 7) };
}

// Die Putzwoche bekommt die KW, in der der größte Teil von ihr liegt
// (die KW ihrer Mitte). Bei Sonntag 20:00 ist das die folgende Mo–So-Woche.
export function putzwoche(jetzt = new Date(), wechsel = STANDARD_WECHSEL) {
  const start = letzterWechsel(jetzt, wechsel);
  const { jahr, kw } = isoWoche(new Date(start.getTime() + 3.5 * TAG_MS));
  return {
    jahr,
    kw,
    schluessel: `${jahr}-W${String(kw).padStart(2, '0')}`,
    start,
    ende: naechsterWechsel(jetzt, wechsel),
  };
}

// Effektiver Zustand einer Karte in der angegebenen Putzwoche.
// Liefert null, wenn die Karte nicht (mehr) angezeigt wird.
export function effektiv(aufgabe, wochenSchluessel) {
  if (aufgabe.typ === 'woche' && aufgabe.statusWoche !== wochenSchluessel) {
    return { status: 'offen', uebernommenVon: null };
  }
  if (aufgabe.typ === 'einmalig' && aufgabe.status === 'erledigt' && aufgabe.statusWoche !== wochenSchluessel) {
    return null;
  }
  return { status: aufgabe.status, uebernommenVon: aufgabe.uebernommenVon };
}

// Alle sichtbaren Karten der Woche, sortiert nach Titel.
export function karten(aufgaben, wochenSchluessel) {
  return aufgaben
    .map((aufgabe) => ({ aufgabe, zustand: effektiv(aufgabe, wochenSchluessel) }))
    .filter((k) => k.zustand)
    .map(({ aufgabe, zustand }) => ({ ...aufgabe, ...zustand }))
    .sort((a, b) => a.titel.localeCompare(b.titel, 'de'));
}
