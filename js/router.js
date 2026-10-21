// Hash-Routing: Die Seite läuft auf GitHub Pages unter /putzteufel/, dort gibt es
// keine Server-Umleitungen. #/pfad?a=1 → Ansicht für „/pfad“ mit Parametern { a: '1' }.

export function starteRouter(routen, { ziel, beiWechsel }) {
  let aufraeumen = null;

  function zeige() {
    const [pfad, abfrage] = location.hash.replace(/^#/, '').split('?');
    let route = pfad || '/';
    if (!routen[route]) {
      route = '/';
      history.replaceState(null, '', '#/');
    }
    if (aufraeumen) aufraeumen();
    ziel.textContent = '';
    beiWechsel(route);
    aufraeumen = routen[route](ziel, new URLSearchParams(abfrage || '')) || null;
  }

  window.addEventListener('hashchange', zeige);
  zeige();
}
