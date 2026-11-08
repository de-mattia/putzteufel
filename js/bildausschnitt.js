// Bildausschnitt fürs Profilbild: Nach der Fotoauswahl zeigt ein Dialog einen quadratischen
// Ausschnitt (mit rundem Hinweis, wie der Avatar aussieht). Verschieben mit Finger oder Maus,
// vergrößern mit dem Schieberegler, zwei Fingern oder dem Mausrad. Erst „Übernehmen“ liefert
// das Ergebnis: 128 × 128 JPEG als Data-URL (null bei „Abbrechen“).

import { el } from './ui.js';

const ANSICHT = 280; // Kantenlänge der Vorschau in CSS-Pixeln
const ERGEBNIS = 128;
const MAX_ZOOM = 4;
const MAX_QUELLE = 1600; // große Fotos vorab verkleinern, damit das Verschieben flüssig bleibt

export async function bildAusschnitt(datei) {
  let bild = await createImageBitmap(datei);
  const lang = Math.max(bild.width, bild.height);
  if (lang > MAX_QUELLE) {
    const f = MAX_QUELLE / lang;
    const klein = await createImageBitmap(bild, {
      resizeWidth: Math.round(bild.width * f), resizeHeight: Math.round(bild.height * f), resizeQuality: 'high',
    });
    bild.close();
    bild = klein;
  }
  const { width: w, height: h } = bild;
  const basis = Math.max(ANSICHT / w, ANSICHT / h); // Zoom 1: das Bild füllt den Ausschnitt

  let zoom = 1;
  let mx = 0; // Versatz der Bildmitte gegenüber der Mitte des Ausschnitts (CSS-Pixel)
  let my = 0;

  const dpr = window.devicePixelRatio || 1;
  const leinwand = el('canvas', { class: 'ausschnitt-leinwand', width: ANSICHT * dpr, height: ANSICHT * dpr, 'aria-label': 'Bildausschnitt' });
  const ctx = leinwand.getContext('2d');
  const regler = el('input', { type: 'range', min: 1, max: MAX_ZOOM, step: 0.01, value: 1, 'aria-label': 'Vergrößern' });

  const begrenze = () => {
    const maxX = (w * basis * zoom - ANSICHT) / 2;
    const maxY = (h * basis * zoom - ANSICHT) / 2;
    mx = Math.max(-maxX, Math.min(maxX, mx));
    my = Math.max(-maxY, Math.min(maxY, my));
  };

  const zeichne = () => {
    const bw = w * basis * zoom;
    const bh = h * basis * zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, ANSICHT, ANSICHT);
    ctx.drawImage(bild, ANSICHT / 2 - bw / 2 + mx, ANSICHT / 2 - bh / 2 + my, bw, bh);
    // Außerhalb des Kreises abdunkeln: So sieht der Avatar später aus.
    ctx.beginPath();
    ctx.rect(0, 0, ANSICHT, ANSICHT);
    ctx.arc(ANSICHT / 2, ANSICHT / 2, ANSICHT / 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill('evenodd');
  };

  // Zoom um die Mitte des Ausschnitts: der Versatz wächst mit.
  const setzeZoom = (wert) => {
    const neu = Math.max(1, Math.min(MAX_ZOOM, wert));
    mx *= neu / zoom;
    my *= neu / zoom;
    zoom = neu;
    regler.value = String(neu);
    begrenze();
    zeichne();
  };

  // Ziehen mit einem Finger/der Maus, Zoomen mit zwei Fingern
  const zeiger = new Map();
  let letzterAbstand = null;
  leinwand.addEventListener('pointerdown', (e) => {
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    letzterAbstand = null;
    try {
      leinwand.setPointerCapture(e.pointerId);
    } catch (fehler) { /* Zeiger schon weg – Ziehen geht trotzdem */ }
  });
  leinwand.addEventListener('pointermove', (e) => {
    const vorher = zeiger.get(e.pointerId);
    if (!vorher) return;
    const jetzt = { x: e.clientX, y: e.clientY };
    zeiger.set(e.pointerId, jetzt);
    if (zeiger.size === 1) {
      mx += jetzt.x - vorher.x;
      my += jetzt.y - vorher.y;
    } else if (zeiger.size === 2) {
      const [a, b] = [...zeiger.values()];
      const abstand = Math.hypot(a.x - b.x, a.y - b.y);
      if (letzterAbstand) setzeZoom(zoom * (abstand / letzterAbstand));
      letzterAbstand = abstand;
      mx += (jetzt.x - vorher.x) / 2;
      my += (jetzt.y - vorher.y) / 2;
    }
    begrenze();
    zeichne();
  });
  const loslassen = (e) => {
    zeiger.delete(e.pointerId);
    letzterAbstand = null;
  };
  leinwand.addEventListener('pointerup', loslassen);
  leinwand.addEventListener('pointercancel', loslassen);
  leinwand.addEventListener('wheel', (e) => {
    e.preventDefault();
    setzeZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });
  regler.addEventListener('input', () => setzeZoom(Number(regler.value)));

  const ausschneiden = () => {
    const s = basis * zoom; // Bildpixel → Ansichtspixel
    const seite = ANSICHT / s;
    const ergebnis = el('canvas', { width: ERGEBNIS, height: ERGEBNIS });
    ergebnis.getContext('2d').drawImage(bild, w / 2 - mx / s - seite / 2, h / 2 - my / s - seite / 2, seite, seite, 0, 0, ERGEBNIS, ERGEBNIS);
    return ergebnis.toDataURL('image/jpeg', 0.8);
  };

  let fertig = null;
  let beendet = false;
  const beenden = (uebernehmen) => {
    if (beendet) return;
    beendet = true;
    const ergebnis = uebernehmen ? ausschneiden() : null;
    bild.close();
    if (dialog.open) dialog.close();
    dialog.remove();
    fertig(ergebnis);
  };

  const dialog = el(
    'dialog',
    { class: 'dialog ausschnitt-dialog', onclose: () => beenden(false) }, // z. B. Zurück-Taste
    el('form', {
      method: 'dialog',
      onsubmit: (e) => {
        e.preventDefault();
        beenden(Boolean(e.submitter && e.submitter.value === 'ok'));
      },
    },
      el('h2', {}, 'Bildausschnitt'),
      el('p', { class: 'dialog-hilfe' }, 'Mit dem Finger verschieben, mit dem Regler oder zwei Fingern vergrößern.'),
      el('div', { class: 'ausschnitt-rahmen' }, leinwand),
      regler,
      el('div', { class: 'dialog-knoepfe' },
        el('button', { class: 'knopf knopf-zweit', value: 'abbrechen' }, 'Abbrechen'),
        el('button', { class: 'knopf knopf-primaer', value: 'ok' }, 'Übernehmen'))),
  );

  document.body.append(dialog);
  zeichne();
  dialog.showModal();

  return new Promise((aufloesen) => {
    fertig = aufloesen;
  });
}
