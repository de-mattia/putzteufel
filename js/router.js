// Hash-Routing: Die Seite läuft auf GitHub Pages unter /putzteufel/, dort gibt es
// keine Server-Umleitungen. #/pfad?a=1 → Ansicht für „/pfad“ mit Parametern { a: '1' }.
// `umleiten(route)` darf eine andere Ansicht wählen (z. B. Startseite, solange das
// Gerät nicht gekoppelt ist), ohne die Adresse zu ändern.

export function starteRouter(routen, { ziel, beiWechsel, umleiten = (route) => route }) {
  let aufraeumen = null;

  function zeige() {
    const [pfad, abfrage] = location.hash.replace(/^#/, '').split('?');
    let route = pfad || '/';
    if (!routen[route]) {
      route = '/';
      history.replaceState(null, '', '#/');
    }
    const ansicht = umleiten(route);
    if (aufraeumen) aufraeumen();
    ziel.textContent = '';
    beiWechsel(ansicht);
    aufraeumen = routen[ansicht](ziel, new URLSearchParams(abfrage || '')) || null;
  }

  window.addEventListener('hashchange', zeige);
  zeige();
  return { neuZeigen: zeige };
}
