// #/einstellungen – Wochenaufgaben, Einladung (QR-Code), Mitglieder, Geräte, Wochenwechsel.
// Alles live aus Firestore.

import {
  holeZustand, abonniere, mitglied, ichBin, ichBinWechseln, geraetEntfernen, codeErneuern,
  einladungsLink, einladungsCode, aufgabeAnlegen, aufgabeUmbenennen, aufgabeLoeschen,
} from '../store.js';
import { APP_VERSION, firebaseConfig } from '../config.js';
import { WOCHENTAGE, naechsterWechsel, STANDARD_WECHSEL } from '../woche.js';
import { encode } from '../vendor/uqr.js';
import { el, fuelle, avatar, wechselText } from '../ui.js';

const ROLLEN = { person: 'Person', anzeige: 'Anzeige', neu: 'noch nicht zugeordnet' };
const datumFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });
const fehlgeschlagen = (fehler) => {
  console.error(fehler);
  alert('Das hat nicht geklappt.');
};

export function einstellungen(ziel) {
  const wurzel = el('div', { class: 'seite einstellungen' });
  const swStatus = el('span', {}, 'wird geprüft …');
  ziel.append(wurzel);

  // Bleibt über das Neuzeichnen hinweg erhalten, damit Eingaben nicht verloren gehen.
  const neuFeld = el('input', { maxlength: 80, autocomplete: 'off', placeholder: 'Neue Wochenaufgabe', 'aria-label': 'Neue Wochenaufgabe' });
  const neuForm = el(
    'form',
    {
      class: 'einladung-form',
      onsubmit: (e) => {
        e.preventDefault();
        const titel = neuFeld.value.trim();
        if (!titel) return;
        aufgabeAnlegen(titel, 'woche').catch(fehlgeschlagen);
        neuFeld.value = '';
      },
    },
    neuFeld,
    el('button', { class: 'knopf knopf-primaer', type: 'submit' }, 'Hinzufügen'),
  );

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((r) => {
      swStatus.textContent = r && r.active ? 'aktiv' : 'noch nicht aktiv';
    });
  } else {
    swStatus.textContent = 'vom Browser nicht unterstützt';
  }

  const zeichne = () => {
    const z = holeZustand();
    const istPerson = z.geraet && z.geraet.rolle === 'person';
    const wechsel = (z.haushalt && z.haushalt.wochenwechsel) || STANDARD_WECHSEL;
    const neuFeldHatteFokus = document.activeElement === neuFeld;

    fuelle(wurzel,
      el(
        'header',
        { class: 'kopfleiste' },
        el('img', { class: 'kopfleiste-logo', src: 'icons/icon-192.png', alt: '', width: 40, height: 40 }),
        el('div', { class: 'kopfleiste-text' }, el('h1', {}, 'Einstellungen'), el('p', {}, z.haushalt ? z.haushalt.name : '…')),
      ),
      z.offline && el('p', { class: 'meldung' }, 'Offline – angezeigt wird der zuletzt gespeicherte Stand.'),

      istPerson && wochenaufgaben(z, neuForm),

      istPerson && einladen(z),

      karte('Mitglieder', 'Bearbeiten (Name, Farbe, Profilbild) folgt in Phase 4.',
        el('ul', { class: 'liste' }, z.mitglieder.map((m) => el(
          'li',
          {},
          avatar(m),
          el('div', { class: 'liste-text' }, el('strong', {}, m.name), el('span', {}, geraeteVon(z, m.id))),
        )))),

      istPerson && karte('Dieses Gerät gehört', null,
        el('label', { class: 'wechsel-felder' }, el('select', {
          'aria-label': 'Dieses Gerät gehört',
          onchange: (e) => ichBinWechseln(e.target.value).catch(fehlgeschlagen),
        }, z.mitglieder.map((m) => el('option', { value: m.id, selected: ichBin() && ichBin().id === m.id }, m.name))))),

      karte('Geräte', 'Jedes gekoppelte Gerät gehört zu einer Person – oder ist eine reine Anzeige.',
        el('ul', { class: 'liste' }, sortierteGeraete(z).map((g) => el(
          'li',
          {},
          g.mitglied ? avatar(mitglied(g.mitglied)) : el('span', { class: 'geraet-symbol', 'aria-hidden': 'true' }, g.rolle === 'anzeige' ? '📺' : '?'),
          el(
            'div',
            { class: 'liste-text' },
            el('strong', {}, g.name || 'Gerät', g.id === z.uid && el('span', { class: 'dieses-geraet' }, 'dieses Gerät')),
            el('span', {}, [
              g.rolle === 'person' && mitglied(g.mitglied) ? mitglied(g.mitglied).name : ROLLEN[g.rolle] || g.rolle,
              g.gekoppeltAm && g.gekoppeltAm.toDate ? `gekoppelt am ${datumFormat.format(g.gekoppeltAm.toDate())}` : null,
            ].filter(Boolean).join(' · ')),
          ),
          (istPerson || g.id === z.uid) && el('button', {
            class: 'knopf knopf-zweit knopf-klein',
            type: 'button',
            onclick: () => entfernen(z, g),
          }, g.id === z.uid ? 'Entkoppeln' : 'Entfernen'),
        )))),

      karte('Wochenwechsel', `Nächster Wechsel: ${wechselText(naechsterWechsel(new Date(), wechsel))}. Ändern folgt in Phase 4.`,
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
          el('dt', {}, 'Datenbank'), el('dd', {}, `Firebase ${firebaseConfig.projectId}${z.offline ? ' (offline)' : ''}`),
          el('dt', {}, 'Haushalt'), el('dd', {}, z.haushaltId || '–'),
        )),
    );
    if (neuFeldHatteFokus) neuFeld.focus();
  };

  zeichne();
  return abonniere(zeichne);
}

function wochenaufgaben(z, neuForm) {
  const liste = z.aufgaben.filter((a) => a.typ === 'woche').sort((a, b) => a.titel.localeCompare(b.titel, 'de'));
  return karte('Wochenaufgaben', 'Jede Wochenaufgabe ist eine dauerhafte Karte und springt zum Wochenwechsel wieder auf „Offen“.',
    liste.length
      ? el('ul', { class: 'liste' }, liste.map((a) => el(
        'li',
        {},
        el('div', { class: 'liste-text' }, el('strong', {}, a.titel)),
        el('button', { class: 'knopf knopf-zweit knopf-klein', type: 'button', onclick: () => umbenennen(a) }, 'Umbenennen'),
        el('button', { class: 'knopf knopf-zweit knopf-klein', type: 'button', onclick: () => loeschen(a) }, 'Löschen'),
      )))
      : el('p', { class: 'einstellung-text' }, 'Noch keine Wochenaufgaben.'),
    neuForm);
}

function umbenennen(a) {
  const titel = (prompt('Neuer Name der Wochenaufgabe:', a.titel) || '').trim().slice(0, 80);
  if (titel && titel !== a.titel) aufgabeUmbenennen(a.id, titel).catch(fehlgeschlagen);
}

function loeschen(a) {
  if (confirm(`Wochenaufgabe „${a.titel}“ löschen?`)) aufgabeLoeschen(a.id).catch(fehlgeschlagen);
}

function einladen(z) {
  const link = einladungsLink();
  const code = einladungsCode();
  if (!link) return karte('Einladen', 'Einladung wird geladen …');

  return karte('Einladen', 'Neues Handy: QR-Code mit der Kamera scannen und „Ich bin …“ wählen. Fernseher: Putzteufel im Browser öffnen und den Einladungscode eingeben.',
    el('div', { class: 'qr' }, qrCode(link)),
    el('p', { class: 'einladungs-code', 'aria-label': 'Einladungscode' }, code),
    el(
      'div',
      { class: 'knopf-reihe' },
      navigator.share && el('button', {
        class: 'knopf knopf-primaer', type: 'button',
        onclick: () => navigator.share({ title: 'Putzteufel', text: `Einladung in den Haushalt „${z.haushalt ? z.haushalt.name : ''}“`, url: link }).catch(() => {}),
      }, 'Link teilen'),
      el('button', {
        class: 'knopf knopf-zweit', type: 'button',
        onclick: (e) => kopieren(link, e.currentTarget),
      }, 'Link kopieren'),
      el('button', {
        class: 'knopf knopf-zweit', type: 'button',
        onclick: () => {
          if (confirm('Neuen Code erzeugen? Bisherige QR-Codes und Links funktionieren dann nicht mehr. Schon gekoppelte Geräte bleiben gekoppelt.')) {
            codeErneuern().catch(fehlgeschlagen);
          }
        },
      }, 'Code erneuern'),
    ));
}

// QR-Code als SVG, Module als ein einziger Pfad
function qrCode(text) {
  const { data, size } = encode(text, { ecc: 'M', border: 2 });
  let pfad = '';
  data.forEach((zeile, y) => zeile.forEach((an, x) => { if (an) pfad += `M${x},${y}h1v1h-1z`; }));
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'QR-Code mit dem Einladungslink');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const hintergrund = document.createElementNS(ns, 'rect');
  hintergrund.setAttribute('width', size);
  hintergrund.setAttribute('height', size);
  hintergrund.setAttribute('fill', '#ffffff');
  const module = document.createElementNS(ns, 'path');
  module.setAttribute('d', pfad);
  module.setAttribute('fill', '#16141f');
  svg.append(hintergrund, module);
  return svg;
}

async function kopieren(text, knopf) {
  try {
    await navigator.clipboard.writeText(text);
    knopf.textContent = 'Kopiert ✓';
  } catch (e) {
    prompt('Link zum Kopieren:', text);
  }
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

function geraeteVon(z, mitgliedId) {
  const anzahl = z.geraete.filter((g) => g.mitglied === mitgliedId).length;
  return anzahl === 0 ? 'noch kein Gerät' : anzahl === 1 ? '1 Gerät' : `${anzahl} Geräte`;
}

function karte(titel, text, ...inhalt) {
  return el('section', { class: 'einstellung' }, el('h2', {}, titel), text && el('p', { class: 'einstellung-text' }, text), inhalt);
}
