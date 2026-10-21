// Lade- und Fehleranzeige, solange die Verbindung zu Firebase noch nicht steht.

import { holeZustand, abonniere, starte } from '../store.js';
import { el, fuelle } from '../ui.js';

export function status(ziel) {
  const wurzel = el('div', { class: 'seite mitte' });
  ziel.append(wurzel);

  const zeichne = () => {
    const { phase, meldung } = holeZustand();
    fuelle(wurzel,
      el('img', { class: 'gross-logo', src: 'icons/icon-192.png', alt: '', width: 96, height: 96 }),
      el('h1', {}, 'Putzteufel'),
      phase === 'fehler'
        ? [
          el('p', { class: 'meldung meldung-fehler' }, meldung),
          el('button', { class: 'knopf knopf-primaer', type: 'button', onclick: () => starte() }, 'Erneut versuchen'),
        ]
        : el('p', { class: 'lade-text' }, 'Lädt …'),
    );
  };

  zeichne();
  return abonniere(zeichne);
}
