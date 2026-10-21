import { starteRouter } from './router.js';
import { holeZustand, abonniere, starte } from './store.js';
import { meineAufgaben } from './ansichten/meine.js';
import { board } from './ansichten/board.js';
import { einstellungen } from './ansichten/einstellungen.js';
import { start } from './ansichten/start.js';
import { beitreten } from './ansichten/beitreten.js';
import { status } from './ansichten/status.js';

const routen = {
  '/': meineAufgaben,
  '/board': board,
  '/einstellungen': einstellungen,
  '/start': start,
  '/beitreten': beitreten,
  '/status': status,
};

// Welche Ansicht darf dieses Gerät gerade sehen?
function umleiten(route) {
  const { phase, geraet } = holeZustand();
  if (phase === 'laedt' || phase === 'fehler') return '/status';
  if (phase === 'ungekoppelt') return route === '/beitreten' ? route : '/start';
  if (geraet.rolle === 'neu') return '/beitreten';
  if (geraet.rolle === 'anzeige') return '/board';
  return route === '/start' || route === '/status' ? '/' : route;
}

const router = starteRouter(routen, {
  ziel: document.getElementById('ansicht'),
  umleiten,
  beiWechsel(ansicht) {
    const { geraet } = holeZustand();
    document.documentElement.dataset.route = ansicht;
    document.documentElement.dataset.rolle = geraet ? geraet.rolle : 'keine';
    document.querySelectorAll('#navigation a').forEach((a) => {
      if (a.dataset.route === ansicht) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  },
});

// Neu entscheiden, sobald sich Ladezustand oder Rolle des Geräts ändern.
let torSchluessel = 'laedt:';
abonniere(({ phase, geraet }) => {
  const schluessel = `${phase}:${geraet ? geraet.rolle : ''}`;
  if (schluessel === torSchluessel) return;
  torSchluessel = schluessel;
  router.neuZeigen();
});

starte();
registriereServiceWorker();

function registriereServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Übernimmt ein neuer Service Worker (neue Version veröffentlicht), lädt die
  // Seite einmal neu. So holt sich auch der Fernseher Updates ohne Bedienung.
  const hatteSteuerung = Boolean(navigator.serviceWorker.controller);
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hatteSteuerung || neuGeladen) return;
    neuGeladen = true;
    location.reload();
  });

  const registrieren = () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((registrierung) => {
        setInterval(() => registrierung.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch((fehler) => console.warn('Service Worker nicht registriert:', fehler));
  };
  if (document.readyState === 'complete') registrieren();
  else window.addEventListener('load', registrieren);
}
