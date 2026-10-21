// #/board – Anzeige für Fernseher und Browser: dunkel, große Schrift, drei Spalten.
// Keine Bedienung nötig; die Ansicht aktualisiert sich selbst.

import { holeZustand, abonniere, aktuelleWoche, mitglied } from '../store.js';
import { karten } from '../woche.js';
import { el, avatar, beispielMarke, uhrzeit, datumLang, wechselText, STATUS_NAMEN } from '../ui.js';

const SPALTEN = ['offen', 'uebernommen', 'erledigt'];

export function board(ziel) {
  const wurzel = el('div', { class: 'board' });
  ziel.append(wurzel);

  const zeichne = () => {
    const zustand = holeZustand();
    const jetzt = new Date();
    const woche = aktuelleWoche(jetzt);
    const alle = karten(zustand.aufgaben, woche.schluessel);
    const erledigt = alle.filter((k) => k.status === 'erledigt').length;

    wurzel.textContent = '';
    wurzel.append(
      kopf(zustand, jetzt, woche, erledigt, alle.length),
      el('div', { class: 'board-spalten' }, SPALTEN.map((status) => spalte(status, alle.filter((k) => k.status === status)))),
      fuss(zustand),
    );
    wurzel.querySelectorAll('.spalte-liste').forEach(passeAn);
  };

  zeichne();
  const abmelden = abonniere(zeichne);
  // Uhr weiterstellen und pünktlich zum Wochenwechsel umspringen.
  const takt = setInterval(zeichne, 30 * 1000);
  window.addEventListener('resize', zeichne);
  const wachFreigeben = bildschirmWachHalten();

  return () => {
    abmelden();
    clearInterval(takt);
    window.removeEventListener('resize', zeichne);
    wachFreigeben();
  };
}

function kopf(zustand, jetzt, woche, erledigt, gesamt) {
  const anteil = gesamt ? Math.round((erledigt / gesamt) * 100) : 0;
  return el(
    'header',
    { class: 'board-kopf' },
    el(
      'a',
      { class: 'board-marke', href: '#/', title: 'Zu „Meine Aufgaben“' },
      el('img', { src: 'icons/icon.svg', alt: '', width: 64, height: 64 }),
      el('span', {}, 'Putzteufel'),
    ),
    el(
      'div',
      { class: 'board-woche' },
      el('div', { class: 'board-kw' }, `KW ${woche.kw}`),
      el('div', { class: 'board-wechsel' }, `${datumLang(jetzt)} · Wechsel ${wechselText(woche.ende)}`),
    ),
    zustand.demo && el('div', { class: 'board-demo' }, 'Beispieldaten'),
    el(
      'div',
      { class: 'board-fortschritt' },
      el('div', { class: 'board-fortschritt-text' }, el('strong', {}, String(erledigt)), ` von ${gesamt} erledigt`),
      el(
        'div',
        {
          class: 'balken',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': gesamt,
          'aria-valuenow': erledigt,
        },
        el('div', { class: 'balken-fuellung', style: { width: `${anteil}%` } }),
      ),
    ),
    el('div', { class: 'board-uhr' }, uhrzeit(jetzt)),
  );
}

function spalte(status, liste) {
  return el(
    'section',
    { class: `spalte spalte-${status}` },
    el('h2', { class: 'spalte-kopf' }, el('span', {}, STATUS_NAMEN[status]), el('span', { class: 'spalte-anzahl' }, String(liste.length))),
    el(
      'div',
      { class: 'spalte-liste' },
      liste.length ? liste.map(karte) : el('p', { class: 'spalte-leer' }, status === 'offen' ? 'Alles verteilt!' : '—'),
    ),
  );
}

function karte(k) {
  return el(
    'article',
    { class: `karte karte-${k.status}` },
    avatar(mitglied(k.uebernommenVon)),
    el(
      'div',
      { class: 'karte-text' },
      el('div', { class: 'karte-titel' }, k.titel),
      el(
        'div',
        { class: 'karte-meta' },
        el('span', {}, k.raum),
        k.typ === 'einmalig' && el('span', { class: 'typ-marke' }, 'einmalig'),
        k.id.startsWith('demo-') && beispielMarke(),
      ),
    ),
  );
}

function fuss(zustand) {
  return el(
    'footer',
    { class: 'board-fuss' },
    el(
      'ul',
      { class: 'legende' },
      zustand.mitglieder.map((m) => el('li', {}, avatar(m), el('span', {}, m.name))),
    ),
    zustand.demo && el('p', { class: 'board-hinweis' }, 'Vorschau mit Platzhaltern (Phase 1) – noch nicht mit dem Haushalt verbunden'),
  );
}

// Passt eine Spalte nicht auf den Bildschirm, werden die Karten schrittweise
// kompakter (erst schmaler, dann zweispaltig). Am Handy scrollt die Seite.
function passeAn(liste) {
  for (const stufe of ['dicht', 'zweispaltig']) {
    if (liste.scrollHeight <= liste.clientHeight + 1) return;
    liste.classList.add(stufe);
  }
}

// Bildschirm möglichst wach halten (wirkt nur, wo der Browser die Wake-Lock-API kennt).
function bildschirmWachHalten() {
  let sperre = null;
  const anfordern = () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then((s) => { sperre = s; }).catch(() => {});
  };
  anfordern();
  document.addEventListener('visibilitychange', anfordern);
  return () => {
    document.removeEventListener('visibilitychange', anfordern);
    if (sperre) sperre.release().catch(() => {});
  };
}
