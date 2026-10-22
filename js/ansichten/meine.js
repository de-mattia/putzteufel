// #/ – „Meine Aufgaben“ am Handy: „Bei mir“ und „Offen“ als schlichte Listen,
// Plus-Knopf für eine einmalige Aufgabe.

import {
  holeZustand, abonniere, aktuelleWoche, ichBin,
  uebernehmen, zurueckgeben, erledigen, aufgabeAnlegen, profilbildSetzen,
} from '../store.js';
import { karten } from '../woche.js';
import { el, fuelle, avatar, wechselText, profilbild } from '../ui.js';

const fehlgeschlagen = (fehler) => {
  console.error(fehler);
  alert('Das hat nicht geklappt. Bitte erneut versuchen.');
};

export function meineAufgaben(ziel) {
  const wurzel = el('div', { class: 'seite meine' });
  const dialog = neueAufgabeDialog();
  const bildWahl = el('input', {
    type: 'file',
    accept: 'image/*',
    hidden: true,
    onchange: async (e) => {
      const datei = e.target.files[0];
      e.target.value = '';
      if (!datei) return;
      try {
        await profilbildSetzen(await profilbild(datei));
      } catch (fehler) {
        fehlgeschlagen(fehler);
      }
    },
  });
  ziel.append(wurzel, dialog, bildWahl, el('button', {
    class: 'plus-knopf',
    type: 'button',
    'aria-label': 'Einmalige Aufgabe anlegen',
    title: 'Einmalige Aufgabe anlegen',
    onclick: () => dialog.showModal(),
  }, '+'));

  const zeichne = () => {
    const zustand = holeZustand();
    const ich = ichBin() || { id: null, name: '' };
    const woche = aktuelleWoche();
    const alle = karten(zustand.aufgaben, woche.schluessel);
    const beiMir = alle.filter((k) => k.status === 'uebernommen' && k.uebernommenVon === ich.id);
    const offen = alle.filter((k) => k.status === 'offen');

    fuelle(wurzel,
      el(
        'header',
        { class: 'kopfleiste' },
        ich.id && el('button', {
          class: 'avatar-knopf',
          type: 'button',
          title: 'Profilbild ändern',
          'aria-label': 'Profilbild ändern',
          onclick: () => bildWahl.click(),
        }, avatar(ich)),
        el('div', { class: 'kopfleiste-text' },
          el('h1', {}, ich.id ? `Hallo ${ich.name}` : 'Meine Aufgaben'),
          el('p', {}, `KW ${woche.kw} · Wechsel ${wechselText(woche.ende)}`)),
      ),
      abschnitt('Bei mir', beiMir, (k) => zeile(k,
        el('button', { class: 'knopf knopf-gruen knopf-klein', type: 'button', onclick: () => erledigen(k, ich.id).catch(fehlgeschlagen) }, '✓ Erledigt'),
        el('button', { class: 'knopf knopf-leise knopf-klein', type: 'button', onclick: () => zurueckgeben(k).catch(fehlgeschlagen) }, 'Zurück'),
      ), 'Gerade nichts übernommen.'),
      abschnitt('Offen', offen, (k) => zeile(k,
        el('button', { class: 'knopf knopf-ton knopf-klein', type: 'button', onclick: () => uebernehmen(k, ich.id).catch(fehlgeschlagen) }, 'Übernehmen'),
      ), alle.length ? 'Alles verteilt!' : 'Noch keine Aufgaben – Wochenaufgaben legst du in den Einstellungen an.'),
    );
  };

  zeichne();
  return abonniere(zeichne);
}

function abschnitt(titel, liste, zeileBauen, leerText) {
  return el(
    'section',
    { class: 'abschnitt' },
    el('h2', { class: 'abschnitt-titel' }, titel, liste.length > 0 && el('span', { class: 'anzahl' }, String(liste.length))),
    liste.length ? el('ul', { class: 'gruppe' }, liste.map(zeileBauen)) : el('p', { class: 'leer' }, leerText),
  );
}

function zeile(k, ...knoepfe) {
  return el('li', { class: `zeile typ-${k.typ}` }, el('span', { class: 'zeile-titel' }, k.titel), el('span', { class: 'zeile-knoepfe' }, knoepfe));
}

function neueAufgabeDialog() {
  const titel = el('input', { name: 'titel', required: true, maxlength: 80, autocomplete: 'off', placeholder: 'z. B. Fenster putzen' });

  return el(
    'dialog',
    { class: 'dialog' },
    el(
      'form',
      {
        method: 'dialog',
        onsubmit: (e) => {
          if (e.submitter && e.submitter.value === 'abbrechen') return;
          if (!titel.value.trim()) {
            e.preventDefault();
            titel.focus();
            return;
          }
          aufgabeAnlegen(titel.value.trim(), 'einmalig').catch(fehlgeschlagen);
          e.target.reset();
        },
      },
      el('h2', {}, 'Einmalige Aufgabe'),
      el('p', { class: 'dialog-hilfe' }, 'Bleibt stehen, bis sie erledigt ist.'),
      el('label', {}, 'Was ist zu tun?', titel),
      el(
        'div',
        { class: 'dialog-knoepfe' },
        el('button', { class: 'knopf knopf-zweit', value: 'abbrechen', formnovalidate: true }, 'Abbrechen'),
        el('button', { class: 'knopf knopf-primaer', value: 'anlegen' }, 'Anlegen'),
      ),
    ),
  );
}
