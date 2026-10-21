// #/ – „Meine Aufgaben“ am Handy: oben „Bei mir“, darunter „Noch offen“,
// Plus-Knopf für eine einmalige Aufgabe.

import {
  holeZustand, abonniere, aktuelleWoche, mitglied, ichBin, setzeIchBin,
  uebernehmen, zurueckgeben, erledigen, neueEinmaligeAufgabe,
} from '../store.js';
import { karten } from '../woche.js';
import { el, avatar, beispielMarke, wechselText } from '../ui.js';

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
    const ich = ichBin();
    const woche = aktuelleWoche();
    const alle = karten(zustand.aufgaben, woche.schluessel);
    const beiMir = alle.filter((k) => k.status === 'uebernommen' && k.uebernommenVon === ich.id);
    const offen = alle.filter((k) => k.status === 'offen');
    const erledigt = alle.filter((k) => k.status === 'erledigt');

    wurzel.textContent = '';
    wurzel.append(
      el(
        'header',
        { class: 'kopfleiste' },
        el('img', { class: 'kopfleiste-logo', src: 'icons/icon.svg', alt: '', width: 40, height: 40 }),
        el('div', { class: 'kopfleiste-text' }, el('h1', {}, 'Meine Aufgaben'), el('p', {}, `KW ${woche.kw} · Wechsel ${wechselText(woche.ende)}`)),
        avatar(ich),
      ),
      zustand.demo && vorschauHinweis(zustand, ich),
      fortschritt(erledigt.length, alle.length),
      abschnitt('Bei mir', beiMir, (k) => aufgabeKarte(k, [
        el('button', { class: 'knopf knopf-gruen', type: 'button', onclick: () => erledigen(k.id, ich.id) }, '✓ Erledigt'),
        el('button', { class: 'knopf knopf-zweit', type: 'button', onclick: () => zurueckgeben(k.id) }, 'Zurückgeben'),
      ]), 'Gerade nichts bei dir – übernimm unten eine Aufgabe.'),
      abschnitt('Noch offen', offen, (k) => aufgabeKarte(k, [
        el('button', { class: 'knopf knopf-primaer', type: 'button', onclick: () => uebernehmen(k.id, ich.id) }, 'Übernehmen'),
      ], true), 'Alles verteilt!'),
      erledigtListe(erledigt),
    );
  };

  zeichne();
  return abonniere(zeichne);
}

function vorschauHinweis(zustand, ich) {
  return el(
    'section',
    { class: 'hinweis-beispiel' },
    el('p', {}, el('strong', {}, 'Vorschau mit Beispieldaten (Phase 1). '), 'Änderungen werden nicht gespeichert und sind nur auf diesem Gerät sichtbar.'),
    el(
      'div',
      { class: 'vorschau-als', role: 'group', 'aria-label': 'Vorschau als' },
      el('span', {}, 'Ich bin:'),
      zustand.mitglieder.map((m) => el(
        'button',
        {
          class: 'vorschau-person',
          type: 'button',
          'aria-pressed': String(m.id === ich.id),
          title: m.name,
          onclick: () => setzeIchBin(m.id),
        },
        avatar(m),
      )),
    ),
  );
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
    el(
      'div',
      { class: 'aufgabe-text' },
      el('div', { class: 'aufgabe-titel' }, k.titel),
      el(
        'div',
        { class: 'aufgabe-meta' },
        k.typ === 'einmalig' ? [el('span', {}, k.raum), el('span', { class: 'typ-marke' }, 'einmalig')] : el('span', {}, `${k.raum} · Wochenaufgabe`),
        k.id.startsWith('demo-') && beispielMarke(),
      ),
    ),
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
  const raeume = [...new Set(holeZustand().aufgaben.map((a) => a.raum))].sort((a, b) => a.localeCompare(b, 'de'));
  const titel = el('input', { name: 'titel', required: true, maxlength: 80, autocomplete: 'off', placeholder: 'z. B. Fenster putzen' });
  const raum = el('input', { name: 'raum', list: 'raum-vorschlaege', maxlength: 40, autocomplete: 'off', placeholder: 'z. B. Wohnzimmer' });

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
          neueEinmaligeAufgabe(titel.value.trim(), raum.value.trim() || 'Allgemein');
          e.target.reset();
        },
      },
      el('h2', {}, 'Einmalige Aufgabe'),
      el('p', { class: 'dialog-hilfe' }, 'Bleibt stehen, bis sie erledigt ist.'),
      el('label', {}, 'Was ist zu tun?', titel),
      el('label', {}, 'Raum', raum),
      el('datalist', { id: 'raum-vorschlaege' }, raeume.map((r) => el('option', { value: r }))),
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
