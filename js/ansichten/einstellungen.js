// #/einstellungen – Wochenaufgaben, Handy einladen (QR-Code), Mitglieder, Geräte,
// Wochenwechsel. Alles live aus Firestore, als schlichte Listen.

import {
  holeZustand, abonniere, mitglied, geraetEntfernen, codeErneuern,
  einladungsLink, einladungsCode, aufgabeAnlegen, aufgabeUmbenennen, aufgabeLoeschen,
} from '../store.js';
import { APP_VERSION } from '../config.js';
import { WOCHENTAGE, STANDARD_WECHSEL } from '../woche.js';
import { el, fuelle, avatar, qrCode } from '../ui.js';

const fehlgeschlagen = (fehler) => {
  console.error(fehler);
  alert('Das hat nicht geklappt.');
};

export function einstellungen(ziel) {
  const wurzel = el('div', { class: 'seite einstellungen' });
  ziel.append(wurzel);

  // Bleibt über das Neuzeichnen hinweg erhalten, damit Eingaben nicht verloren gehen.
  const neuFeld = el('input', { maxlength: 80, autocomplete: 'off', placeholder: 'Neue Wochenaufgabe', 'aria-label': 'Neue Wochenaufgabe' });
  const neuForm = el(
    'form',
    {
      class: 'zeile zeile-neu',
      onsubmit: (e) => {
        e.preventDefault();
        const titel = neuFeld.value.trim();
        if (!titel) return;
        aufgabeAnlegen(titel, 'woche').catch(fehlgeschlagen);
        neuFeld.value = '';
      },
    },
    neuFeld,
    el('button', { class: 'knopf knopf-primaer knopf-klein', type: 'submit' }, 'Hinzufügen'),
  );

  const zeichne = () => {
    const z = holeZustand();
    const istPerson = z.geraet && z.geraet.rolle === 'person';
    const wechsel = (z.haushalt && z.haushalt.wochenwechsel) || STANDARD_WECHSEL;
    const neuFeldHatteFokus = document.activeElement === neuFeld;

    fuelle(wurzel,
      el('header', { class: 'kopfleiste' }, el('div', { class: 'kopfleiste-text' }, el('h1', {}, 'Einstellungen'))),
      z.offline && el('p', { class: 'meldung' }, 'Offline – angezeigt wird der zuletzt gespeicherte Stand.'),

      istPerson && abschnitt('Wochenaufgaben', el('ul', { class: 'gruppe' },
        wochenaufgaben(z).map((a) => el(
          'li',
          { class: 'zeile' },
          el('span', { class: 'zeile-titel' }, a.titel),
          el('span', { class: 'zeile-knoepfe' },
            el('button', { class: 'knopf-symbol', type: 'button', title: 'Umbenennen', 'aria-label': `${a.titel} umbenennen`, onclick: () => umbenennen(a) }, '✎'),
            el('button', { class: 'knopf-symbol', type: 'button', title: 'Löschen', 'aria-label': `${a.titel} löschen`, onclick: () => loeschen(a) }, '✕')),
        )),
        el('li', {}, neuForm))),

      istPerson && abschnitt('Handy einladen', einladen()),

      abschnitt('Mitglieder', el('div', { class: 'gruppe mitglieder-reihe' },
        z.mitglieder.map((m) => el('div', { class: 'mitglied' }, avatar(m), el('span', {}, m.name))))),

      abschnitt('Geräte', el('ul', { class: 'gruppe' }, sortierteGeraete(z).map((g) => el(
        'li',
        { class: 'zeile' },
        g.mitglied ? avatar(mitglied(g.mitglied)) : el('span', { class: 'geraet-symbol', 'aria-hidden': 'true' }, g.rolle === 'anzeige' ? '📺' : '?'),
        el('span', { class: 'zeile-titel' },
          g.id === z.uid ? 'Dieses Gerät' : g.name || 'Gerät',
          el('small', {}, geraeteText(g))),
        (istPerson || g.id === z.uid) && el('button', {
          class: 'knopf knopf-leise knopf-klein',
          type: 'button',
          onclick: () => entfernen(z, g),
        }, g.id === z.uid ? 'Entkoppeln' : 'Entfernen'),
      )))),

      abschnitt('Wochenwechsel', el('p', { class: 'gruppe zeile' },
        `${WOCHENTAGE[wechsel.wochentag]}, ${String(wechsel.stunde).padStart(2, '0')}:${String(wechsel.minute).padStart(2, '0')} Uhr`)),

      el('p', { class: 'fusszeile' }, `Putzteufel ${APP_VERSION}`),
    );
    if (neuFeldHatteFokus) neuFeld.focus();
  };

  zeichne();
  return abonniere(zeichne);
}

function abschnitt(titel, ...inhalt) {
  return el('section', { class: 'abschnitt' }, el('h2', { class: 'abschnitt-titel' }, titel), inhalt);
}

const wochenaufgaben = (z) => z.aufgaben
  .filter((a) => a.typ === 'woche')
  .sort((a, b) => a.titel.localeCompare(b.titel, 'de'));

function umbenennen(a) {
  const titel = (prompt('Neuer Name der Wochenaufgabe:', a.titel) || '').trim().slice(0, 80);
  if (titel && titel !== a.titel) aufgabeUmbenennen(a.id, titel).catch(fehlgeschlagen);
}

function loeschen(a) {
  if (confirm(`Wochenaufgabe „${a.titel}“ löschen?`)) aufgabeLoeschen(a.id).catch(fehlgeschlagen);
}

function einladen() {
  const link = einladungsLink();
  if (!link) return el('p', { class: 'leer' }, 'Einladung wird geladen …');

  return el(
    'div',
    { class: 'gruppe einladen' },
    el('div', { class: 'qr' }, qrCode(link)),
    el('p', { class: 'einstellung-text' }, 'Mit der Handykamera scannen. Am Fernseher stattdessen diesen Code eingeben:'),
    el('p', { class: 'einladungs-code', 'aria-label': 'Einladungscode' }, einladungsCode()),
    el(
      'div',
      { class: 'knopf-reihe' },
      navigator.share
        ? el('button', {
          class: 'knopf knopf-zweit knopf-klein', type: 'button',
          onclick: () => navigator.share({ title: 'Putzteufel', text: 'Einladung zum Putzteufel', url: link }).catch(() => {}),
        }, 'Link teilen')
        : el('button', { class: 'knopf knopf-zweit knopf-klein', type: 'button', onclick: (e) => kopieren(link, e.currentTarget) }, 'Link kopieren'),
      el('button', {
        class: 'knopf knopf-leise knopf-klein', type: 'button',
        onclick: () => {
          if (confirm('Neuen Code erzeugen? Bisherige QR-Codes und Links funktionieren dann nicht mehr. Schon gekoppelte Geräte bleiben gekoppelt.')) {
            codeErneuern().catch(fehlgeschlagen);
          }
        },
      }, 'Code erneuern'),
    ),
  );
}

async function kopieren(text, knopf) {
  try {
    await navigator.clipboard.writeText(text);
    knopf.textContent = 'Kopiert ✓';
  } catch (e) {
    prompt('Link zum Kopieren:', text);
  }
}

function geraeteText(g) {
  if (g.rolle === 'person') return mitglied(g.mitglied) ? mitglied(g.mitglied).name : 'Person';
  return g.rolle === 'anzeige' ? `${g.name || 'Gerät'} · ohne Person` : 'noch nicht zugeordnet';
}

function entfernen(z, g) {
  const eigenes = g.id === z.uid;
  const frage = eigenes
    ? 'Dieses Gerät vom Haushalt entkoppeln? Danach braucht es eine neue Einladung.'
    : `Gerät „${g.name || 'Gerät'}“ entfernen? Es verliert sofort den Zugriff.`;
  if (confirm(frage)) geraetEntfernen(g.id).catch(fehlgeschlagen);
}

function sortierteGeraete(z) {
  const rang = { person: 0, anzeige: 1, neu: 2 };
  return [...z.geraete].sort((a, b) => (a.id === z.uid ? -1 : b.id === z.uid ? 1 : (rang[a.rolle] ?? 3) - (rang[b.rolle] ?? 3)));
}
