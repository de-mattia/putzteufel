# Putzteufel – Hinweise für Claude

- **Alle Vorgaben von Christoph und alle Designentscheidungen stehen in [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md).**
  Jede neue Anweisung von Christoph dort mit Datum ins Vorgaben-Protokoll eintragen und betroffene
  Entscheidungen in derselben Änderung anpassen.
- Technischer Plan, Datenmodell, Phasen und offene Punkte: [docs/PLAN.md](docs/PLAN.md).
- Sprache: Deutsch – Oberfläche, Doku, Commit-Texte und Bezeichner im Code.
- Kein Build-Schritt. Bei jeder Veröffentlichung `CACHE_VERSION` in `sw.js` und `APP_VERSION` in
  `js/config.js` erhöhen und neue Dateien in `APP_SHELL` (sw.js) eintragen.
- Texte nur über `el()`/`fuelle()` aus `js/ui.js` einfügen, nie per `innerHTML`.
- Firestore-Regeln: `firestore.rules`; einspielen mit `npx firebase-tools@15.34.0 deploy --only firestore:rules`
  (Christoph meldet die CLI selbst an), danach prüfen.
- Lokal testen: `.claude/launch.json` („putzteufel“, Port 8137). `127.0.0.1:8137` ist ein eigener Ursprung
  und verhält sich wie ein zweites Gerät.
