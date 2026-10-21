// #/einstellungen – Gerüst: zeigt, was hier ab Phase 2 einstellbar wird.

import { holeZustand } from '../store.js';
import { APP_VERSION, firebaseConfig, firebaseBereit } from '../config.js';
import { WOCHENTAGE, naechsterWechsel } from '../woche.js';
import { el, avatar, beispielMarke, wechselText } from '../ui.js';

export function einstellungen(ziel) {
  const zustand = holeZustand();
  const wechsel = zustand.haushalt.wochenwechsel;
  const swStatus = el('span', {}, 'wird geprüft …');

  ziel.append(el(
    'div',
    { class: 'seite einstellungen' },
    el(
      'header',
      { class: 'kopfleiste' },
      el('img', { class: 'kopfleiste-logo', src: 'icons/icon.svg', alt: '', width: 40, height: 40 }),
      el('div', { class: 'kopfleiste-text' }, el('h1', {}, 'Einstellungen'), el('p', {}, zustand.haushalt.name)),
    ),
    el('section', { class: 'hinweis-beispiel' }, el('p', {}, el('strong', {}, 'Gerüst (Phase 1). '), 'Hier sieht man schon, was später einstellbar ist. Speichern kommt mit Phase 2.')),

    karte('Wochenaufgaben', 'Jede Wochenaufgabe ist eine dauerhafte Karte und springt zum Wochenwechsel wieder auf „Offen“.',
      el('ul', { class: 'liste' }, zustand.aufgaben.filter((a) => a.typ === 'woche').map((a) => el(
        'li',
        {},
        el('div', { class: 'liste-text' }, el('strong', {}, a.titel), el('span', {}, a.raum)),
        beispielMarke(),
        el('input', { type: 'checkbox', checked: a.aktiv, disabled: true, 'aria-label': `${a.titel} aktiv` }),
      ))),
      el('button', { class: 'knopf knopf-zweit', type: 'button', disabled: true }, '+ Wochenaufgabe (Phase 2)')),

    karte('Mitglieder', 'Name, Farbe und später ein eigenes Profilbild.',
      el('ul', { class: 'liste' }, zustand.mitglieder.map((m) => el(
        'li',
        {},
        avatar(m),
        el('div', { class: 'liste-text' }, el('strong', {}, m.name), el('span', {}, m.farbe)),
        beispielMarke(),
      ))),
      el('button', { class: 'knopf knopf-zweit', type: 'button', disabled: true }, '+ Mitglied (Phase 2)')),

    karte('Einladen', 'Neues Handy oder den Fernseher koppeln: QR-Code scannen bzw. Link öffnen und „Ich bin …“ wählen.',
      el('div', { class: 'qr-platzhalter', 'aria-label': 'Platzhalter für den Einladungs-QR-Code' }, 'QR-Code', el('small', {}, 'folgt in Phase 2'))),

    karte('Geräte', 'Jedes gekoppelte Gerät gehört zu einer Person – oder ist eine reine Anzeige.',
      el('ul', { class: 'liste' },
        el('li', {}, el('div', { class: 'liste-text' }, el('strong', {}, 'Dieses Gerät'), el('span', {}, 'noch nicht gekoppelt'))),
        el('li', {}, el('div', { class: 'liste-text' }, el('strong', {}, 'Fernseher (Fire TV)'), el('span', {}, 'Anzeige')), beispielMarke()))),

    karte('Wochenwechsel', `Nächster Wechsel: ${wechselText(naechsterWechsel(new Date(), wechsel))}`,
      el(
        'div',
        { class: 'wechsel-felder' },
        el('label', {}, 'Tag', el('select', { disabled: true }, WOCHENTAGE.map((tag, i) => el('option', { value: i, selected: i === wechsel.wochentag }, tag)))),
        el('label', {}, 'Uhrzeit', el('input', {
          type: 'time',
          disabled: true,
          value: `${String(wechsel.stunde).padStart(2, '0')}:${String(wechsel.minute).padStart(2, '0')}`,
        })),
      )),

    karte('App', null,
      el(
        'dl',
        { class: 'app-infos' },
        el('dt', {}, 'Version'), el('dd', {}, APP_VERSION),
        el('dt', {}, 'Offline-Speicher'), el('dd', {}, swStatus),
        el('dt', {}, 'Läuft als'), el('dd', {}, window.matchMedia('(display-mode: standalone)').matches ? 'installierte App' : 'Webseite im Browser'),
        el('dt', {}, 'Datenbank'), el('dd', {}, datenbankStatus()),
      )),
  ));

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((r) => {
      swStatus.textContent = r && r.active ? 'aktiv' : 'noch nicht aktiv';
    });
  } else {
    swStatus.textContent = 'vom Browser nicht unterstützt';
  }
}

function datenbankStatus() {
  if (firebaseBereit()) return `Firebase (${firebaseConfig.projectId})`;
  if (firebaseConfig) return `Projekt ${firebaseConfig.projectId} eingetragen, Anbindung folgt in Phase 2`;
  return 'noch nicht eingerichtet (Phase 2)';
}

function karte(titel, text, ...inhalt) {
  return el('section', { class: 'einstellung' }, el('h2', {}, titel), text && el('p', { class: 'einstellung-text' }, text), inhalt);
}
