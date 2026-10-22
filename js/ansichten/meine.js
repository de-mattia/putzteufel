// #/ – „Meine Aufgaben“ am Handy: oben „Bei mir“, darunter „Noch offen“,
// Plus-Knopf für eine einmalige Aufgabe.

import {
  holeZustand, abonniere, aktuelleWoche, mitglied, ichBin,
  uebernehmen, zurueckgeben, erledigen, aufgabeAnlegen,
} from '../store.js';
import { karten } from '../woche.js';
import { el, fuelle, avatar, wechselText } from '../ui.js';

const fehlgeschlagen = (fehler) => {
  console.error(fehler);
  alert('Das hat nicht geklappt. Bitte erneut versuchen.');
};

export function meineAufgaben(ziel) {
  const wurzel = el('div', { class: 'seite meine' });
  const dialog = neueAufgabeDialog();
  ziel.append(wurzel, dialog, el('button', {
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
    const erledigt = alle.filter((k) => k.status === 'erledigt');

    fuelle(wurzel,
      el(
        'header',
        { class: 'kopfleiste' },
        el('img', { class: 'kopfleiste-logo', src: 'icons/icon-192.png', alt: '', width: 40, height: 40 }),
        el('div', { class: 'kopfleiste-text' }, el('h1', {}, 'Meine Aufgaben'), el('p', {}, `KW ${woche.kw} · Wechsel ${wechselText(woche.ende)}`)),
        ich.id && avatar(ich),
      ),
      alle.length === 0 && el('p', { class: 'leer' }, 'Noch keine Aufgaben – Wochenaufgaben legst du in den Einstellungen an.'),
      alle.length > 0 && fortschritt(erledigt.length, alle.length),
      abschnitt('Bei mir', beiMir, (k) => aufgabeKarte(k, [
        el('button', { class: 'knopf knopf-gruen', type: 'button', onclick: () => erledigen(k, ich.id).catch(fehlgeschlagen) }, '✓ Erledigt'),
        el('button', { class: 'knopf knopf-zweit', type: 'button', onclick: () => zurueckgeben(k).catch(fehlgeschlagen) }, 'Zurückgeben'),
      ]), 'Gerade nichts bei dir – übernimm unten eine Aufgabe.'),
      abschnitt('Noch offen', offen, (k) => aufgabeKarte(k, [
        el('button', { class: 'knopf knopf-primaer', type: 'button', onclick: () => uebernehmen(k, ich.id).catch(fehlgeschlagen) }, 'Übernehmen'),
      ], true), alle.length ? 'Alles verteilt!' : 'Nichts offen.'),
      erledigtListe(erledigt),
    );
  };

  zeichne();
  return abonniere(zeichne);
}

function fortschritt(erledigt, gesamt) {
  return el(
    'section',
    { class: 'fortschritt' },
    el('p', {}, 'Diese Woche: ', el('strong', {}, `${erledigt} von ${gesamt}`), ' erledigt'),
    el('div', { class: 'balken' }, el('div', { class: 'balken-fuellung', style: { width: `${gesamt ? Math.round((erledigt / gesamt) * 100) : 0}%` } })),
  );
}

function abschnitt(titel, liste, karteBauen, leerText) {
  return el(
    'section',
    { class: 'abschnitt' },
    el('h2', {}, titel, el('span', { class: 'anzahl' }, String(liste.length))),
    liste.length ? el('div', { class: 'aufgaben-liste' }, liste.map(karteBauen)) : el('p', { class: 'leer' }, leerText),
  );
}

function aufgabeKarte(k, knoepfe, kompakt = false) {
  return el(
    'article',
    { class: `aufgabe${kompakt ? ' aufgabe-kompakt' : ''}` },
    el('div', { class: 'aufgabe-text' }, el('div', { class: 'aufgabe-titel' }, k.titel)),
    el('div', { class: 'aufgabe-aktionen' }, knoepfe),
  );
}

function erledigtListe(liste) {
  return el(
    'details',
    { class: 'abschnitt erledigt' },
    el('summary', {}, el('h2', {}, 'Erledigt diese Woche', el('span', { class: 'anzahl' }, String(liste.length)))),
    el('ul', { class: 'erledigt-liste' }, liste.map((k) => el('li', {}, avatar(mitglied(k.uebernommenVon)), el('span', {}, k.titel)))),
  );
}

function neueAufgabeDialog() {
  const titel = el('input', { name: 'titel', required: true, maxlength: 80, autocomplete: 'off', placeholder: 'z. B. Fenster putzen' });

  const dialog = el(
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
  return dialog;
}
