// #/statistik – wer hat wie viel erledigt? Ausgewertet wird der Verlauf (log): diese Woche
// und insgesamt. Die Balkenlänge richtet sich nach dem Aufwand (große Aufgabe zählt doppelt).

import { holeZustand, abonniere, aktuelleWoche, beobachteVerlauf, aufwandGewicht } from '../store.js';
import { el, fuelle, avatar } from '../ui.js';

export function statistik(ziel) {
  const wurzel = el('div', { class: 'seite statistik' });
  ziel.append(wurzel);
  let eintraege = null; // null = Verlauf wird noch geladen

  const zeichne = () => {
    const { mitglieder } = holeZustand();
    const woche = aktuelleWoche().schluessel;
    fuelle(wurzel,
      el('header', { class: 'kopfleiste' }, el('div', { class: 'kopfleiste-text' }, el('h1', {}, 'Statistik'))),
      eintraege === null
        ? el('p', { class: 'leer' }, 'Lädt …')
        : [
          abschnitt('Diese Woche', auswerten(mitglieder, eintraege.filter((e) => e.kw === woche))),
          abschnitt('Insgesamt', auswerten(mitglieder, eintraege)),
        ],
    );
  };

  const verlaufAbmelden = beobachteVerlauf((liste) => {
    eintraege = liste;
    zeichne();
  });
  zeichne();
  const abmelden = abonniere(zeichne);
  return () => {
    abmelden();
    verlaufAbmelden();
  };
}

function auswerten(mitglieder, eintraege) {
  return mitglieder
    .map((m) => {
      const eigene = eintraege.filter((e) => e.erledigtVon === m.id);
      return {
        m,
        anzahl: eigene.length,
        gross: eigene.filter((e) => e.aufwand === 'gross').length,
        punkte: eigene.reduce((summe, e) => summe + aufwandGewicht(e), 0),
      };
    })
    .sort((a, b) => b.punkte - a.punkte || b.anzahl - a.anzahl);
}

function abschnitt(titel, zeilen) {
  const hoechstes = Math.max(1, ...zeilen.map((z) => z.punkte));
  return el(
    'section',
    { class: 'abschnitt' },
    el('h2', { class: 'abschnitt-titel' }, titel),
    zeilen.every((z) => z.anzahl === 0)
      ? el('p', { class: 'leer' }, 'Noch nichts erledigt.')
      : el('ul', { class: 'gruppe' }, zeilen.map(({ m, anzahl, gross, punkte }) => el(
        'li',
        { class: 'zeile stat-zeile' },
        avatar(m),
        el('span', { class: 'zeile-titel' }, m.name, el('small', {}, `${anzahl} erledigt${gross ? ` · ${gross} groß` : ''}`)),
        el('span', { class: 'stat-balken' }, el('span', {
          class: 'stat-fuellung',
          style: { width: `${Math.round((punkte / hoechstes) * 100)}%`, '--farbe': m.farbe },
        })),
      ))),
  );
}
