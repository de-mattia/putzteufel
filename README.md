# Putzteufel

Familien-Putzplan als Kanban-Board – eine Progressive Web App fürs Handy und den Fernseher.

**Live:** https://de-mattia.github.io/putzteufel/
(Board für den Fernseher: https://de-mattia.github.io/putzteufel/#/board)

> Stand: **Phase 1 (Gerüst)**. Die Ansichten zeigen Beispieldaten; gespeichert wird noch nichts.
> Plan, Datenmodell und alle Entscheidungen: [docs/PLAN.md](docs/PLAN.md)

## Installieren (Android)

Seite in **Chrome** öffnen → Menü ⋮ → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**.

## Entwickeln

Kein Build-Schritt – die Dateien werden so ausgeliefert, wie sie im Repo liegen.

```bash
py -m http.server 8137
```

Dann http://localhost:8137/ öffnen. Icons neu erzeugen: `py tools/make_icons.py` (braucht Pillow).

**Bei jeder Veröffentlichung** `CACHE_VERSION` in `sw.js` und `APP_VERSION` in `js/config.js` erhöhen.
Neue Dateien zusätzlich in die Liste `APP_SHELL` in `sw.js` eintragen.

## Technik

- HTML, CSS, JavaScript (ES-Module), Hash-Routing, alle Pfade relativ
- Hosting: GitHub Pages (`main`, Wurzelordner)
- Ab Phase 2: Firebase Firestore (Spark-Tarif) mit anonymer Anmeldung und Gerätekopplung
