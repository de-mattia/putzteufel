import { starteRouter } from './router.js';
import { meineAufgaben } from './ansichten/meine.js';
import { board } from './ansichten/board.js';
import { einstellungen } from './ansichten/einstellungen.js';

const routen = {
  '/': meineAufgaben,
  '/board': board,
  '/einstellungen': einstellungen,
};

starteRouter(routen, {
  ziel: document.getElementById('ansicht'),
  beiWechsel(route) {
    document.documentElement.dataset.route = route;
    document.querySelectorAll('#navigation a').forEach((a) => {
      if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  },
});

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
