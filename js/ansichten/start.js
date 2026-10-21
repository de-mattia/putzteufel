// #/start – für noch nicht gekoppelte Geräte: Einladung annehmen.
// Es gibt nur einen Haushalt. Ihn legt Christoph einmalig über #/start?einrichten=1 an;
// danach sperren die Firestore-Regeln jede weitere Neuanlage.
// #/start?test=1 legte vor der Einrichtung Test-Haushalte für die Entwicklung an.

import { holeZustand, haushaltAnlegen, leseEinladung, STANDARD_MITGLIEDER } from '../store.js';
import { el, avatar } from '../ui.js';

export function start(ziel, parameter) {
  const test = parameter.get('test') === '1';
  const einrichten = test || parameter.get('einrichten') === '1';
  const { meldung } = holeZustand();
  let ichBin = STANDARD_MITGLIEDER[0].id;

  // Einladung per Code (für den Fernseher) oder eingefügtem Link
  const codeFeld = el('input', {
    name: 'einladung', required: true, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
    placeholder: 'z. B. ABC-DEF-GHJ-KMN', 'aria-label': 'Einladungscode',
  });
  const codeFehler = el('p', { class: 'feld-fehler', hidden: true }, 'Das ist kein gültiger Einladungscode.');
  const einladungForm = el(
    'form',
    {
      class: 'einladung-form',
      onsubmit: (e) => {
        e.preventDefault();
        const einladung = leseEinladung(codeFeld.value);
        codeFehler.hidden = Boolean(einladung);
        if (einladung) location.hash = `#/beitreten?h=${einladung.hid}&c=${einladung.code}`;
      },
    },
    codeFeld,
    el('button', { class: 'knopf knopf-primaer', type: 'submit' }, 'Beitreten'),
  );

  // Neuer Haushalt
  const nameFeld = el('input', { name: 'name', required: true, maxlength: 60, value: test ? 'TEST – Entwicklung' : 'Unser Haushalt' });
  const personen = el('div', { class: 'personen-wahl', role: 'radiogroup', 'aria-label': 'Ich bin' });
  const zeichnePersonen = () => {
    personen.textContent = '';
    STANDARD_MITGLIEDER.forEach((m) => personen.append(el(
      'button',
      {
        type: 'button', class: 'person-knopf', role: 'radio', 'aria-checked': String(m.id === ichBin),
        onclick: () => { ichBin = m.id; zeichnePersonen(); },
      },
      avatar(m), el('span', {}, m.name),
    )));
  };
  zeichnePersonen();

  const anlegenKnopf = el('button', { class: 'knopf knopf-primaer', type: 'submit' }, 'Haushalt anlegen');
  const anlegenFehler = el('p', { class: 'feld-fehler', hidden: true });
  const anlegenForm = el(
    'form',
    {
      class: 'anlegen-form',
      onsubmit: async (e) => {
        e.preventDefault();
        anlegenKnopf.disabled = true;
        anlegenKnopf.textContent = 'Wird angelegt …';
        anlegenFehler.hidden = true;
        try {
          await haushaltAnlegen({ name: nameFeld.value.trim(), ichBin, test });
          location.hash = '#/';
        } catch (fehler) {
          console.error(fehler);
          anlegenFehler.textContent = fehler.code === 'permission-denied'
            ? 'Der Haushalt ist schon eingerichtet. Bitte über eine Einladung beitreten.'
            : 'Das hat nicht geklappt. Bitte Internetverbindung prüfen und erneut versuchen.';
          anlegenFehler.hidden = false;
          anlegenKnopf.disabled = false;
          anlegenKnopf.textContent = 'Haushalt anlegen';
        }
      },
    },
    el('label', {}, 'Name des Haushalts', nameFeld),
    el('p', { class: 'feld-titel' }, 'Mitglieder – wer bist du?'),
    personen,
    el('p', { class: 'einstellung-text' }, 'Namen und Farben lassen sich später in den Einstellungen anpassen.'),
    anlegenFehler,
    anlegenKnopf,
  );

  ziel.append(el(
    'div',
    { class: 'seite start' },
    el(
      'header',
      { class: 'start-kopf' },
      el('img', { class: 'gross-logo', src: 'icons/icon-192.png', alt: '', width: 96, height: 96 }),
      el('h1', {}, 'Putzteufel'),
      el('p', {}, 'Der Putzplan für die ganze Familie'),
    ),
    meldung && el('p', { class: 'meldung' }, meldung),
    test && el('p', { class: 'hinweis-beispiel' }, el('strong', {}, 'Testmodus: '), 'Der Haushalt wird als Test markiert.'),
    el(
      'section',
      { class: 'einstellung' },
      el('h2', {}, 'Ich wurde eingeladen'),
      el('p', { class: 'einstellung-text' }, 'Scanne mit der Handykamera den QR-Code aus den Einstellungen eines schon gekoppelten Handys. Am Fernseher gibst du stattdessen den Einladungscode ein, der dort darunter steht:'),
      einladungForm,
      codeFehler,
    ),
    einrichten && el(
      'section',
      { class: 'einstellung' },
      el('h2', {}, 'Haushalt einrichten'),
      el('p', { class: 'einstellung-text' }, test
        ? 'Test-Haushalt für die Entwicklung.'
        : 'Nur einmal, auf dem ersten Handy. Danach kann kein weiterer Haushalt angelegt werden – alle anderen Geräte treten per Einladung bei.'),
      anlegenForm,
    ),
  ));
}
