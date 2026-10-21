// #/beitreten?h=<haushalt>&c=<code> – Gerät per Einladung koppeln.
// Schritt 1 (automatisch): Gerät mit Code anlegen. Schritt 2: „Ich bin …“ oder „Anzeige“.

import { holeZustand, abonniere, beitreten as geraetKoppeln, rolleWaehlen, entkoppeln, leseEinladung } from '../store.js';
import { el, fuelle, avatar } from '../ui.js';

export function beitreten(ziel, parameter) {
  const einladung = leseEinladung(`?h=${parameter.get('h') || ''}&c=${parameter.get('c') || ''}`);
  const wurzel = el('div', { class: 'seite start' });
  ziel.append(wurzel);

  let fehler = null;
  let arbeitet = false;
  let gestartet = false;

  const koppeln = async () => {
    arbeitet = true;
    fehler = null;
    zeichne();
    try {
      await geraetKoppeln(einladung.hid, einladung.code);
    } catch (e) {
      console.error(e);
      fehler = e.code === 'permission-denied'
        ? 'Diese Einladung ist ungültig oder abgelaufen. Bitte einen aktuellen QR-Code scannen.'
        : 'Das Koppeln hat nicht geklappt. Bitte Internetverbindung prüfen und erneut versuchen.';
    }
    arbeitet = false;
    zeichne();
  };

  const waehlen = async (rolle, mitgliedId) => {
    arbeitet = true;
    zeichne();
    // Ziel schon vorher setzen: Die Ansicht wechselt, sobald die neue Rolle ankommt.
    location.hash = rolle === 'anzeige' ? '#/board' : '#/';
    try {
      await rolleWaehlen(rolle, mitgliedId);
    } catch (e) {
      console.error(e);
      alert('Das hat nicht geklappt. Bitte erneut versuchen.');
    }
  };

  function zeichne() {
    const z = holeZustand();
    const kopf = el(
      'header',
      { class: 'start-kopf' },
      el('img', { class: 'gross-logo', src: 'icons/icon-192.png', alt: '', width: 96, height: 96 }),
      el('h1', {}, 'Putzteufel'),
    );

    // Schritt 2: gekoppelt, aber noch keine Rolle
    if (z.phase === 'bereit' && z.geraet && z.geraet.rolle === 'neu') {
      fuelle(wurzel, kopf, 
        el('p', { class: 'start-gruss' }, 'Willkommen im Haushalt ', el('strong', {}, z.haushalt ? z.haushalt.name : '…'), '!'),
        el(
          'section',
          { class: 'einstellung' },
          el('h2', {}, 'Wer bist du?'),
          el('p', { class: 'einstellung-text' }, 'Dieses Gerät gehört danach zu dieser Person.'),
          el('div', { class: 'personen-wahl' }, z.mitglieder.map((m) => el(
            'button',
            { type: 'button', class: 'person-knopf', disabled: arbeitet, onclick: () => waehlen('person', m.id) },
            avatar(m), el('span', {}, m.name),
          ))),
        ),
        el(
          'section',
          { class: 'einstellung' },
          el('h2', {}, 'Oder: nur Anzeige'),
          el('p', { class: 'einstellung-text' }, 'Für den Fernseher: zeigt das Board an, kann aber nichts ändern.'),
          el('button', { class: 'knopf knopf-zweit', type: 'button', disabled: arbeitet, onclick: () => waehlen('anzeige', null) }, '📺 Dieses Gerät ist eine Anzeige'),
        ),
        fehler && el('p', { class: 'meldung meldung-fehler' }, fehler),
      );
      return;
    }

    // Schon gekoppelt
    if (z.phase === 'bereit') {
      const gleicherHaushalt = einladung && einladung.hid === z.haushaltId;
      fuelle(wurzel, kopf, el(
        'section',
        { class: 'einstellung' },
        el('h2', {}, 'Dieses Gerät ist schon gekoppelt'),
        el('p', { class: 'einstellung-text' }, `Haushalt: ${z.haushalt ? z.haushalt.name : '…'}`),
        el('div', { class: 'knopf-reihe' },
          el('a', { class: 'knopf knopf-primaer', href: '#/' }, 'Zu meinen Aufgaben'),
          einladung && !gleicherHaushalt && el('button', {
            class: 'knopf knopf-zweit',
            type: 'button',
            disabled: arbeitet,
            onclick: async () => {
              if (!confirm('Dieses Gerät aus dem bisherigen Haushalt entfernen und dem neuen beitreten?')) return;
              await entkoppeln();
              koppeln();
            },
          }, 'Haushalt wechseln')),
      ));
      return;
    }

    if (!einladung) {
      fuelle(wurzel, kopf, 
        el('p', { class: 'meldung meldung-fehler' }, 'Dieser Einladungslink ist unvollständig.'),
        el('a', { class: 'knopf knopf-zweit', href: '#/start' }, 'Zur Startseite'),
      );
      return;
    }

    if (fehler) {
      fuelle(wurzel, kopf, 
        el('p', { class: 'meldung meldung-fehler' }, fehler),
        el('div', { class: 'knopf-reihe' },
          el('button', { class: 'knopf knopf-primaer', type: 'button', onclick: koppeln }, 'Erneut versuchen'),
          el('a', { class: 'knopf knopf-zweit', href: '#/start' }, 'Zur Startseite')),
      );
      return;
    }

    fuelle(wurzel, kopf, el('p', { class: 'lade-text' }, 'Gerät wird gekoppelt …'));
  }

  zeichne();
  const abmelden = abonniere(zeichne);
  if (holeZustand().phase === 'ungekoppelt' && einladung && !gestartet) {
    gestartet = true;
    koppeln();
  }
  return abmelden;
}
