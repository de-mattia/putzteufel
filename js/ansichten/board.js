// #/board – Board für Fernseher und Browser: dunkel, große Schrift, drei Spalten.
// Karten lassen sich per Drag & Drop in eine andere Spalte schieben (Maus sofort,
// Touch nach kurzem Gedrückthalten). Die Ansicht aktualisiert sich selbst.

import { holeZustand, abonniere, aktuelleWoche, mitglied, ichBin, statusSetzen, einladungsLink } from '../store.js';
import { karten } from '../woche.js';
import { el, fuelle, avatar, datumLang, wechselText, qrCode, STATUS_NAMEN } from '../ui.js';

const SPALTEN = ['offen', 'uebernommen', 'erledigt'];
const ZIEH_SCHWELLE = 6; // px, ab hier wird aus einem Klick ein Ziehen
const TOUCH_HALTEN_MS = 250;

export function board(ziel) {
  const wurzel = el('div', { class: 'board' });
  const auswahl = personenAuswahl();
  const join = joinDialog();
  ziel.append(wurzel, auswahl.dialog, join.dialog);

  let alle = [];
  let nachholen = false;
  let zug = null; // laufendes Ziehen einer Karte

  const zeichne = () => {
    // Während eine Karte gezogen wird, nicht neu zeichnen (sonst verschwindet sie unter dem Finger).
    if (zug) {
      nachholen = true;
      return;
    }
    const zustand = holeZustand();
    const jetzt = new Date();
    const woche = aktuelleWoche(jetzt);
    alle = karten(zustand.aufgaben, woche.schluessel);
    const erledigt = alle.filter((k) => k.status === 'erledigt').length;

    fuelle(wurzel,
      kopf(jetzt, woche, erledigt, alle.length, join.zeigen),
      el('div', { class: 'board-spalten' }, SPALTEN.map((status) => spalte(status, alle.filter((k) => k.status === status)))),
      fuss(zustand),
    );
  };

  // Wer bekommt die Karte? „Übernommen“ ↔ „Erledigt“ behält die Person, sonst die Person
  // dieses Geräts; ein Gerät ohne Person (Fernseher) fragt nach.
  async function ablegen(k, zielStatus) {
    if (zielStatus === k.status) return;
    let person = null;
    if (zielStatus !== 'offen') {
      person = k.uebernommenVon || (ichBin() && ichBin().id) || await auswahl.frage(k, zielStatus);
      if (!person) return;
    }
    statusSetzen(k, zielStatus, person).catch((fehler) => {
      console.error(fehler);
      alert('Das hat nicht geklappt. Bitte erneut versuchen.');
    });
  }

  // ---------- Drag & Drop mit Pointer Events ----------

  const spalteUnter = (x, y) => {
    const element = document.elementFromPoint(x, y);
    return element && element.closest('.spalte');
  };

  const zugStarten = () => {
    const rahmen = zug.karte.getBoundingClientRect();
    zug.versatz = { x: zug.startX - rahmen.left, y: zug.startY - rahmen.top };
    zug.geist = zug.karte.cloneNode(true);
    zug.geist.classList.add('zieh-geist');
    zug.geist.style.width = `${rahmen.width}px`;
    wurzel.append(zug.geist);
    zug.karte.classList.add('wird-gezogen');
    wurzel.classList.add('zieht');
    zug.aktiv = true;
    bewegeGeist(zug.startX, zug.startY);
  };

  const bewegeGeist = (x, y) => {
    zug.geist.style.transform = `translate(${x - zug.versatz.x}px, ${y - zug.versatz.y}px) rotate(2deg)`;
    const spalteEl = spalteUnter(x, y);
    wurzel.querySelectorAll('.spalte.ziel').forEach((s) => s !== spalteEl && s.classList.remove('ziel'));
    if (spalteEl && spalteEl.dataset.status !== zug.aufgabe.status) spalteEl.classList.add('ziel');
  };

  const zugBeenden = (x, y) => {
    const fertig = zug;
    zug = null;
    clearTimeout(fertig.timer);
    if (fertig.aktiv) {
      fertig.geist.remove();
      fertig.karte.classList.remove('wird-gezogen');
      wurzel.classList.remove('zieht');
      wurzel.querySelectorAll('.spalte.ziel').forEach((s) => s.classList.remove('ziel'));
      const spalteEl = x === undefined ? null : spalteUnter(x, y);
      if (spalteEl) ablegen(fertig.aufgabe, spalteEl.dataset.status);
    }
    if (nachholen) {
      nachholen = false;
      zeichne();
    }
  };

  wurzel.addEventListener('pointerdown', (e) => {
    const karte = e.target.closest('.karte');
    if (!karte || zug || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const aufgabe = alle.find((k) => k.id === karte.dataset.id);
    if (!aufgabe) return;
    zug = { karte, aufgabe, pointerId: e.pointerId, maus: e.pointerType === 'mouse', startX: e.clientX, startY: e.clientY, aktiv: false };
    if (!zug.maus) zug.timer = setTimeout(() => zug && !zug.aktiv && zugStarten(), TOUCH_HALTEN_MS);
    if (zug.maus) e.preventDefault(); // keine Textauswahl beim Ziehen
  });

  const beiBewegung = (e) => {
    if (!zug || e.pointerId !== zug.pointerId) return;
    if (!zug.aktiv) {
      if (Math.hypot(e.clientX - zug.startX, e.clientY - zug.startY) < ZIEH_SCHWELLE) return;
      if (zug.maus) zugStarten();
      else zugBeenden(); // Finger bewegt, bevor das Halten erkannt war: Seite scrollt
      return;
    }
    bewegeGeist(e.clientX, e.clientY);
  };
  const beiEnde = (e) => zug && e.pointerId === zug.pointerId && zugBeenden(e.clientX, e.clientY);
  const beiAbbruch = (e) => zug && e.pointerId === zug.pointerId && zugBeenden();
  // Während eine Karte per Touch gezogen wird, darf die Seite nicht scrollen.
  const beiTouch = (e) => zug && zug.aktiv && e.cancelable && e.preventDefault();
  const keinKontextmenue = (e) => e.target.closest('.karte') && e.preventDefault();

  window.addEventListener('pointermove', beiBewegung);
  window.addEventListener('pointerup', beiEnde);
  window.addEventListener('pointercancel', beiAbbruch);
  window.addEventListener('touchmove', beiTouch, { passive: false });
  wurzel.addEventListener('contextmenu', keinKontextmenue);

  zeichne();
  const abmelden = abonniere(zeichne);
  // Pünktlich zum Wochenwechsel umspringen, auch ohne neue Daten.
  const takt = setInterval(zeichne, 30 * 1000);
  const wachFreigeben = bildschirmWachHalten();

  return () => {
    abmelden();
    clearInterval(takt);
    window.removeEventListener('pointermove', beiBewegung);
    window.removeEventListener('pointerup', beiEnde);
    window.removeEventListener('pointercancel', beiAbbruch);
    window.removeEventListener('touchmove', beiTouch);
    wachFreigeben();
  };
}

function kopf(jetzt, woche, erledigt, gesamt, joinZeigen) {
  const anteil = gesamt ? Math.round((erledigt / gesamt) * 100) : 0;
  return el(
    'header',
    { class: 'board-kopf' },
    el(
      'a',
      { class: 'board-marke', href: '#/', title: 'Zu „Meine Aufgaben“' },
      el('img', { src: 'icons/icon-192.png', alt: '', width: 64, height: 64 }),
      el('span', {}, 'Putzteufel'),
    ),
    el(
      'div',
      { class: 'board-woche' },
      el('div', { class: 'board-kw' }, `KW ${woche.kw}`),
      el('div', { class: 'board-wechsel' }, `${datumLang(jetzt)} · Wechsel ${wechselText(woche.ende)}`),
    ),
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
    einladungsLink() && el('button', { class: 'knopf board-join', type: 'button', onclick: joinZeigen }, 'Join'),
  );
}

// QR-Code mit dem Einladungslink, damit ein Handy dem Haushalt beitreten kann.
function joinDialog() {
  const qr = el('div', { class: 'qr board-qr' });
  const dialog = el(
    'dialog',
    { class: 'dialog board-dialog join-dialog' },
    el('form', { method: 'dialog' },
      el('h2', {}, 'Mit dem Handy öffnen'),
      el('p', { class: 'dialog-hilfe' }, 'QR-Code mit der Handykamera scannen und „Ich bin …“ wählen.'),
      qr,
      el('div', { class: 'dialog-knoepfe' }, el('button', { class: 'knopf knopf-zweit' }, 'Schließen'))),
  );

  function zeigen() {
    const link = einladungsLink();
    if (!link) return;
    fuelle(qr, qrCode(link));
    dialog.showModal();
  }

  return { dialog, zeigen };
}

function spalte(status, liste) {
  return el(
    'section',
    { class: `spalte spalte-${status}`, 'data-status': status },
    el('h2', { class: 'spalte-kopf' }, el('span', {}, STATUS_NAMEN[status]), el('span', { class: 'spalte-anzahl' }, String(liste.length))),
    el(
      'div',
      { class: 'spalte-liste' },
      liste.length ? liste.map(karte) : el('p', { class: 'spalte-leer' }, '—'),
    ),
  );
}

function karte(k) {
  return el(
    'article',
    { class: `karte karte-${k.status} typ-${k.typ}`, 'data-id': k.id },
    avatar(mitglied(k.uebernommenVon)),
    el('div', { class: 'karte-titel' }, k.titel),
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
      el('li', { class: 'legende-typ typ-woche' }, el('span', {}, 'Wochenaufgabe')),
      el('li', { class: 'legende-typ typ-einmalig' }, el('span', {}, 'Einmalig')),
    ),
    el('p', { class: 'board-hinweis' }, [
      zustand.haushalt ? zustand.haushalt.name : '',
      zustand.offline ? 'offline' : '',
    ].filter(Boolean).join(' · ')),
  );
}

// Auswahl der Person für Geräte ohne eigene Person (Fernseher).
function personenAuswahl() {
  const titel = el('h2');
  const knoepfe = el('div', { class: 'personen-wahl' });
  const dialog = el(
    'dialog',
    { class: 'dialog board-dialog' },
    el('form', { method: 'dialog' },
      titel,
      knoepfe,
      el('div', { class: 'dialog-knoepfe' }, el('button', { class: 'knopf knopf-zweit', value: '' }, 'Abbrechen'))),
  );

  function frage(k, zielStatus) {
    titel.textContent = zielStatus === 'erledigt' ? `Wer hat „${k.titel}“ erledigt?` : `Wer übernimmt „${k.titel}“?`;
    fuelle(knoepfe, holeZustand().mitglieder.map((m) => el(
      'button',
      { class: 'person-knopf', value: m.id },
      avatar(m), el('span', {}, m.name),
    )));
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise((fertig) => {
      dialog.addEventListener('close', () => fertig(dialog.returnValue || null), { once: true });
    });
  }

  return { dialog, frage };
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
