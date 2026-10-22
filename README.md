# Putzteufel

Familien-Putzplan als Kanban-Board – eine Progressive Web App fürs Handy und den Fernseher.

**Live:** https://de-mattia.github.io/putzteufel/
(Board für den Fernseher: https://de-mattia.github.io/putzteufel/#/board)

> Stand: **Phase 3**. Aufgaben, Mitglieder und Geräte liegen in Firebase Firestore und sind in Echtzeit auf allen
> Geräten; am Board lassen sich Karten per Drag & Drop verschieben.
> Vorgaben und Designentscheidungen: [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md) ·
> Technischer Plan und Datenmodell: [docs/PLAN.md](docs/PLAN.md)

## Installieren (Android)

Seite in **Chrome** öffnen → Menü ⋮ → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**.
Danach den QR-Code aus den Einstellungen eines schon gekoppelten Handys scannen und „Ich bin …“ wählen.
Am Fernseher stattdessen den Einladungscode eingeben und „Anzeige“ wählen.

## Entwickeln

Kein Build-Schritt – die Dateien werden so ausgeliefert, wie sie im Repo liegen.

```bash
py -m http.server 8137
```

Dann http://localhost:8137/ öffnen. **Lokal spricht die App mit dem Firebase-Emulator**, nie mit der echten
Datenbank – vorher starten (braucht Java 21):

```bash
npx firebase-tools@15.34.0 emulators:start --only auth,firestore
```

Regeln im Emulator prüfen:

```bash
npx firebase-tools@15.34.0 emulators:exec --only auth,firestore "node tools/regeln-pruefen.mjs"
```

Regeln einspielen: `npx firebase-tools@15.34.0 deploy --only firestore:rules`. Icons aus
`icons/putzteufel-original.png` neu erzeugen: `py tools/make_icons.py` (braucht Pillow).

**Bei jeder Veröffentlichung** `CACHE_VERSION` in `sw.js` und `APP_VERSION` in `js/config.js` erhöhen.
Neue Dateien zusätzlich in die Liste `APP_SHELL` in `sw.js` eintragen.

## Technik

- HTML, CSS, JavaScript (ES-Module), Hash-Routing, alle Pfade relativ
- Hosting: GitHub Pages (`main`, Wurzelordner)
- Firebase Firestore (Spark-Tarif, Projekt `putzteufel-b6e23`) mit anonymer Anmeldung und Gerätekopplung
