// #/start – für noch nicht gekoppelte Geräte. Ist Zuhause noch nicht eingerichtet, richtet
// das erste Gerät es hier ein („Wer bist du?“). Danach geht es nur noch per Einladung;
// die Firestore-Regeln sperren jede weitere Einrichtung.

import { holeZustand, abonniere, zuhauseEinrichten, leseEinladung, STANDARD_MITGLIEDER } from '../store.js';
import { el, fuelle, avatar } from '../ui.js';

export function start(ziel) {
  const wurzel = el('div', { class: 'seite start' });
  ziel.append(wurzel);

  // Einladung per Code (für den Fernseher) oder eingefügtem Link – bleibt beim Neuzeichnen erhalten
  const codeFeld = el('input', {
    name: 'einladung', required: true, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
    placeholder: 'z. B. K3M9-X2QA', 'aria-label': 'Einladungscode',
  });
  const codeFehler = el('p', { class: 'feld-fehler', hidden: true }, 'Das ist kein gültiger Einladungscode.');
  const einladungForm = el(
    'form',
    {
      class: 'einladung-form',
      onsubmit: (e) => {
        e.preventDefault();
        const code = leseEinladung(codeFeld.value);
        codeFehler.hidden = Boolean(code);
        if (code) location.hash = `#/beitreten?c=${code}`;
      },
    },
    codeFeld,
    el('button', { class: 'knopf knopf-primaer', type: 'submit' }, 'Beitreten'),
  );

  let arbeitet = false;
  let fehler = null;

  const einrichten = async (mitgliedId) => {
    arbeitet = true;
    fehler = null;
    zeichne();
    try {
      await zuhauseEinrichten(mitgliedId);
      location.hash = '#/';
    } catch (e) {
      console.error(e);
      fehler = e.code === 'permission-denied'
        ? 'Zuhause ist schon eingerichtet. Bitte über eine Einladung beitreten.'
        : 'Das hat nicht geklappt. Bitte Internetverbindung prüfen und erneut versuchen.';
      arbeitet = false;
      zeichne();
    }
  };

  function zeichne() {
    const { meldung, eingerichtet } = holeZustand();
    const codeFeldHatteFokus = document.activeElement === codeFeld;
    fuelle(wurzel,
      el(
        'header',
        { class: 'start-kopf' },
        el('img', { class: 'gross-logo', src: 'icons/icon-192.png', alt: '', width: 96, height: 96 }),
        el('h1', {}, 'Putzteufel'),
        el('p', {}, 'Der Putzplan für die ganze Familie'),
      ),
      meldung && el('p', { class: 'meldung' }, meldung),

      eingerichtet === false && el(
        'section',
        { class: 'einstellung' },
        el('h2', {}, 'Zuhause einrichten'),
        el('p', { class: 'einstellung-text' }, 'Nur einmal, auf dem ersten Handy. Danach kommen alle anderen Geräte per Einladung dazu.'),
        el('p', { class: 'feld-titel' }, 'Wer bist du?'),
        el('div', { class: 'personen-wahl' }, STANDARD_MITGLIEDER.map((m) => el(
          'button',
          { type: 'button', class: 'person-knopf', disabled: arbeitet, onclick: () => einrichten(m.id) },
          avatar(m), el('span', {}, m.name),
        ))),
        fehler && el('p', { class: 'feld-fehler' }, fehler),
      ),

      eingerichtet !== false && el(
        'section',
        { class: 'einstellung' },
        el('h2', {}, 'Ich wurde eingeladen'),
        el('p', { class: 'einstellung-text' }, 'Scanne mit der Handykamera den QR-Code (Einstellungen eines gekoppelten Handys oder „Join“ am Board). Am Fernseher gibst du stattdessen den Einladungscode ein:'),
        einladungForm,
        codeFehler,
      ),
    );
    if (codeFeldHatteFokus) codeFeld.focus();
  }

  zeichne();
  return abonniere(zeichne);
}
