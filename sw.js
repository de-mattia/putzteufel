// Service Worker: hält die App-Shell offline verfügbar.
//
// Strategie „Netz zuerst“: Online gibt es immer den neuesten Stand (nach höchstens
// 4 Sekunden Wartezeit sonst die gespeicherte Version), offline die zuletzt geladene.
// CACHE_VERSION bei jeder Veröffentlichung erhöhen (zusammen mit APP_VERSION in
// js/config.js): Geöffnete Seiten – etwa der Fernseher – laden dann einmal neu.

const CACHE_VERSION = 'v0.1.0';
const CACHE_NAME = `putzteufel-${CACHE_VERSION}`;
const NETZ_ZEITLIMIT_MS = 4000;

// Alle Pfade relativ zum Service Worker, damit die App unter /putzteufel/ läuft.
const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/router.js',
  'js/store.js',
  'js/woche.js',
  'js/ui.js',
  'js/config.js',
  'js/demo-daten.js',
  'js/ansichten/board.js',
  'js/ansichten/meine.js',
  'js/ansichten/einstellungen.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((pfad) => new Request(pfad, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(
        namen.filter((n) => n.startsWith('putzteufel-') && n !== CACHE_NAME).map((n) => caches.delete(n)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Fremde Adressen (ab Phase 2 z. B. Firebase) gehen direkt ans Netz.
  if (!request.url.startsWith(self.registration.scope)) return;
  event.respondWith(netzZuerst(event));
});

async function netzZuerst(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  const ausDemNetz = fetch(request, { cache: 'no-cache' });
  // Cache im Hintergrund aktualisieren – auch wenn die Antwort wegen des
  // Zeitlimits schon aus dem Cache kam.
  event.waitUntil(
    ausDemNetz
      .then((antwort) => (antwort.ok ? cache.put(request, antwort.clone()) : undefined))
      .catch(() => {}),
  );

  try {
    return await mitZeitlimit(ausDemNetz, NETZ_ZEITLIMIT_MS);
  } catch (fehler) {
    const treffer = (await cache.match(request, { ignoreSearch: true }))
      || (request.mode === 'navigate' ? await cache.match('./') : undefined);
    return treffer || ausDemNetz;
  }
}

function mitZeitlimit(versprechen, ms) {
  return new Promise((erfuellt, abgelehnt) => {
    const uhr = setTimeout(() => abgelehnt(new Error('Zeitlimit')), ms);
    versprechen.then(
      (wert) => { clearTimeout(uhr); erfuellt(wert); },
      (fehler) => { clearTimeout(uhr); abgelehnt(fehler); },
    );
  });
}
