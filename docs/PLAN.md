# Putzteufel – Plan und Entscheidungen

Familien-Putzplan als Kanban-Board. Diese Datei ist der **technische Plan** (Architektur, Datenmodell, Phasen,
offene Punkte) und wird mit jeder Phase fortgeschrieben. **Alle Vorgaben von Christoph und alle
Designentscheidungen mit Begründung** stehen in [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md).

## Ziel und Rahmen

- Putzplan für die Familie als Kanban-Board mit den Spalten **Offen / Übernommen / Erledigt**.
- **Progressive Web App (PWA)**, Oberfläche und Dokumentation auf **Deutsch**.
- **Kostenlos** betrieben (GitHub Pages + Firebase Spark-Tarif).
- **Nutzer:** Christoph (Auftraggeber, GitHub-Konto `de-mattia`), Sandra, Moira, Paula, Laura –
  alle mit Android-Handys, Installation über Chrome („Zum Startbildschirm hinzufügen“ / „App installieren“).
- **Fernseher:** Fire-TV-Stick mit Silk-Browser, 1920×1080, **nur Anzeige**, keine Bedienung.

## Architektur

| Thema | Entscheidung |
| --- | --- |
| App | Statisches HTML/CSS/JavaScript mit ES-Modulen, **kein Build-Schritt** |
| Hosting | **GitHub Pages** aus dem **öffentlichen** Repo `de-mattia/putzteufel`, Zweig `main`, Wurzelordner |
| Adresse | `https://de-mattia.github.io/putzteufel/` |
| Pfade | Alle Pfade **relativ** (die Seite liegt unter `/putzteufel/`), **Hash-Routing** (`#/…`), weil GitHub Pages keine Server-Umleitungen kann |
| Offline | Service Worker `sw.js` mit **versioniertem App-Shell-Cache** (`putzteufel-vX.Y.Z`), Strategie „Netz zuerst, nach 4 s bzw. offline aus dem Cache“ |
| Updates | `CACHE_VERSION` in `sw.js` und `APP_VERSION` in `js/config.js` bei jeder Veröffentlichung erhöhen. Geöffnete Seiten prüfen stündlich auf einen neuen Service Worker und laden dann einmal neu – so aktualisiert sich auch der Fernseher von selbst |
| Datenbank | **Firebase Firestore** im kostenlosen **Spark-Tarif**: Echtzeit-Listener, Offline-Cache (`persistentLocalCache` mit mehreren Tabs) |
| Firebase SDK | Per CDN (`https://www.gstatic.com/firebasejs/12.19.0/…`) mit **fest gepinnter Version** `12.19.0`, eingetragen in `js/config.js`. Der Service Worker speichert die SDK-Dateien („Cache zuerst“), damit die App auch offline startet |
| Nicht genutzt | **Keine Cloud Functions, kein Firebase Storage** – beides gibt es nur im kostenpflichtigen Blaze-Tarif |
| Konfiguration | `js/config.js` (`firebaseConfig`, `FIREBASE_SDK_VERSION`). Die Web-Konfiguration ist kein Geheimnis und darf ins öffentliche Repo; geschützt wird über die Firestore-Regeln |
| Regeln | `firestore.rules` (mit `firebase.json`, `.firebaserc`), einspielen: `npx firebase-tools@15.34.0 deploy --only firestore:rules`, prüfen: `node tools/regeln-pruefen.mjs` |

### Firebase-Projekt (Phase 0, eingerichtet von Christoph)

| Was | Wert |
| --- | --- |
| Projekt-ID | **`putzteufel-b6e23`** (Spark-Tarif) |
| Firestore | Edition Standard, Standort **europe-west3 (Frankfurt)**, Produktionsmodus – ohne eigene Regeln ist alles gesperrt (Lesen ohne Anmeldung → 403 `PERMISSION_DENIED`) |
| Authentication | Anbieter **„Anonym“** aktiv, `de-mattia.github.io` bei den autorisierten Domains |
| Web-App | `putzteufel-web`, ohne Firebase Hosting (Hosting bleibt GitHub Pages) |

### Ordnerstruktur

```
index.html              Einstieg, Navigation
manifest.webmanifest    PWA-Manifest (Name, Icons, display: standalone, relative start_url/scope)
sw.js                   Service Worker (App-Shell-Cache, Firebase SDK)
firestore.rules         Firestore-Sicherheitsregeln (+ firebase.json, .firebaserc)
css/app.css             Alle Stile (Handy hell/dunkel nach System, Board immer dunkel)
js/app.js               Start: Router mit Zugangsregeln je Gerät, Service-Worker-Registrierung
js/router.js            Hash-Router (#/pfad?param=wert)
js/config.js            App-Version, Firebase-Konfiguration und SDK-Version
js/firebase.js          Lädt das SDK, anonyme Anmeldung, Firestore mit Offline-Cache
js/store.js             Datenzugriff: Haushalt, Mitglieder, Geräte live aus Firestore; Aufgaben bis Phase 3 Beispiele
js/woche.js             Putzwoche, Kalenderwoche, effektiver Status
js/ui.js                DOM-Helfer (el, fuelle), Avatar, Formatierung
js/demo-daten.js        PLATZHALTER-Beispielaufgaben (bis Phase 3)
js/vendor/uqr.js        QR-Code-Erzeugung (uqr 0.1.3, MIT, unveränderte Kopie)
js/ansichten/*.js       Ansichten: meine, board, einstellungen, start, beitreten, status
icons/                  App-Icons, erzeugt aus putzteufel-original.png mit tools/make_icons.py
tools/                  make_icons.py, regeln-pruefen.mjs
docs/                   PLAN.md (diese Datei), ENTSCHEIDUNGEN.md
CLAUDE.md               Arbeitsregeln für Claude-Sitzungen
```

## Anmeldung, Haushalt und Kopplung (Phase 2, umgesetzt)

- **Kein Google-Login, kein Passwort.** Jedes Gerät meldet sich **anonym** bei Firebase Authentication an
  (eigene `uid` je Gerät/Browser; die Kopplung merkt sich das Gerät in `localStorage` unter `putzteufel.haushalt`).
- **Genau ein Haushalt.** Christoph legt ihn einmalig über `…/putzteufel/#/start?einrichten=1` an: Name,
  die fünf Mitglieder (Farben wie im Gerüst) und „Ich bin …“ – alles in **einem Batch**, zusammen mit
  `einrichtung/abgeschlossen`. Danach verbieten die Regeln **jede** weitere Neuanlage.
- **Einladen** (Einstellungen, nur Personen-Geräte): QR-Code mit dem Link
  `…/putzteufel/#/beitreten?h=<haushalt>&c=<code>` (der Teil nach `#` geht nicht an den Server), „Link teilen“,
  „Link kopieren“ und der **Einladungscode** zum Abtippen am Fernseher, z. B. `C48-9XW-B8Q-FNF`
  (Haushalts-ID + Code, je 6 Zeichen aus `23456789abcdefghjkmnpqrstuvwxyz`). „**Code erneuern**“ macht alte
  Einladungen ungültig.
- **Beitritt in zwei Schritten:**
  1. Das Gerät legt `devices/{uid}` mit `rolle: 'neu'` und dem Code an. Die Regel vergleicht den Code per `get()`
     mit `households/{id}/geheim/beitritt` – für das Gerät selbst ist dieses Dokument nicht lesbar.
  2. „**Ich bin …**“ (`rolle: 'person'`, `mitglied`) oder „**Anzeige**“ (`rolle: 'anzeige'`). Dabei wird der Code aus
     dem Gerätedokument entfernt. Aus „anzeige“ kann ein Gerät nicht selbst „person“ werden.
- **Rollen:** `person` liest und schreibt, `anzeige` (Fernseher) und `neu` lesen nur. Personen-Geräte dürfen den
  Beitrittscode lesen (für den QR-Code), Anzeigen nicht.
- **Geräte:** Liste in den Einstellungen; Personen-Geräte können jedes Gerät entfernen, jedes Gerät kann sich
  selbst entkoppeln. Ein entferntes Gerät verliert sofort den Zugriff und zeigt wieder die Startseite.
- **Zugang je Gerät** (`js/app.js`): nicht gekoppelt → Startseite (nur „Ich wurde eingeladen“) bzw. Beitritt;
  Rolle `neu` → „Wer bist du?“; Rolle `anzeige` → immer das Board, ohne Navigation; `person` → alle Ansichten.

## Datenmodell (Firestore)

```
einrichtung/abgeschlossen                           nicht lesbar; sperrt weitere Haushalte
  haushalt (haushaltId), erstelltAm

households/{haushaltId}                             ID: 6 Zeichen, z. B. "c489xw"
  name, wochenwechsel { wochentag (0 = So … 6 = Sa), stunde, minute }, erstelltAm, erstelltVon (uid),
  test (nur bei Test-Haushalten aus der Entwicklung: true)

households/{haushaltId}/members/{mitgliedId}        Person, ID z. B. "christoph"
  name, farbe ("#rrggbb"), reihenfolge, einstellungen { … }, bild (optional, Base64 ~128×128)

households/{haushaltId}/devices/{uid}               Gerät
  rolle ("person" | "anzeige" | "neu"), mitglied (mitgliedId | null), name (z. B. "Android-Gerät"),
  gekoppeltAm, code (nur während des Beitritts)

households/{haushaltId}/tasks/{aufgabeId}           Aufgabe = Karte
  titel, raum, typ ("woche" | "einmalig"), aktiv (bool),
  status ("offen" | "uebernommen" | "erledigt"), uebernommenVon (mitgliedId | null),
  statusWoche ("2026-W43" – Putzwoche, in der der Status gesetzt wurde)

households/{haushaltId}/log/{eintragId}             Verlauf – nur anhängen
  aufgabe (aufgabeId), titel, erledigtVon (mitgliedId), zeitpunkt, kw ("2026-W43")

households/{haushaltId}/geheim/beitritt             für Außenstehende nicht lesbar
  code (6 Zeichen)
```

- Der `log` ist die Grundlage für die spätere Statistik. Regeln: nur `create`, kein `update`/`delete`.
- Profilbild (Ausbaustufe „Mein Profil“): beim Hochladen im Browser auf ca. **128×128** verkleinern und als
  kleines **Base64** direkt im Member-Dokument speichern (kein Firebase Storage nötig).

## Wochenkarten und Wochenwechsel

- **Jede Wochenaufgabe ist genau eine dauerhafte Karte** – keine Karte pro Woche, keine Vorlagen-Sammlung.
- Der **Wochenwechsel** ist standardmäßig **Sonntag 20:00** und in den Einstellungen änderbar
  (`households/{id}.wochenwechsel`).
- Zum Wechsel springt jede Wochenkarte wieder auf **„Offen“** und verliert die Person.
- **Effektiver Status – berechnet die Anzeige selbst** (`js/woche.js`, `effektiv()`):
  - Wochenaufgabe mit `statusWoche` ≠ aktuelle Putzwoche → gilt als „Offen“ ohne Person.
  - So springt der Fernseher **pünktlich** um, ohne neu zu laden und ohne dass jemand schreibt.
    Das Board rechnet dafür alle 30 Sekunden neu.
- **Physisches Zurücksetzen:** Das nächste **Handy**, das die App lädt, setzt veraltete Karten per
  **Transaktion** in Firestore auf „Offen“ (der Fernseher schreibt nicht).
- Jeder Klick auf **„Erledigt“** schreibt zusätzlich einen **`log`-Eintrag**.
- **Einmalige Aufgaben** bleiben, bis sie erledigt sind (auch über den Wochenwechsel, auch wenn sie
  übernommen sind). **Erledigte** einmalige Aufgaben verschwinden beim nächsten Wochenwechsel aus „Erledigt“.
- **Putzwoche → Kalenderwoche:** Eine Putzwoche (z. B. So 20:00 bis So 20:00) bekommt die ISO-KW, in der ihre
  Mitte liegt. Bei Sonntag 20:00 ist das die folgende Montag–Sonntag-Woche. Schlüssel: `JJJJ-Www`.

## Ansichten

| Route | Für | Inhalt |
| --- | --- | --- |
| `#/board` | Fernseher, Browser | Dunkel, große Schrift, Spalten **Offen / Übernommen / Erledigt**. Karte mit **Initiale im Farbkreis** der Person. Kopfzeile mit **KW**, Datum, Zeitpunkt des Wechsels, **Fortschritt „11 von 18 erledigt“** und Uhr. Unten Legende der Personen. Skaliert mit der Bildschirmgröße (1920×1080 → 20 px Grundschrift); passt eine Spalte nicht, werden ihre Karten kompakter bzw. zweispaltig. Hält den Bildschirm per Wake-Lock wach, wo unterstützt |
| `#/` | Handy | **„Meine Aufgaben“**: oben **„Bei mir“** mit **✓ Erledigt / Zurückgeben**, darunter **„Noch offen“** mit **Übernehmen**, eingeklappt „Erledigt diese Woche“. **Plus-Knopf** für eine einmalige Aufgabe |
| `#/einstellungen` | Handy | **Einladen** (QR-Code, Link, Einladungscode, Code erneuern), **Mitglieder** (live), „Dieses Gerät gehört“, **Geräte** (entfernen/entkoppeln), **Zeitpunkt des Wochenwechsels**, Wochenaufgaben (noch Beispiele), App-Infos |
| `#/start` | neue Geräte | „Ich wurde eingeladen“ mit Feld für den Einladungscode; mit `?einrichten=1` einmalig „Haushalt einrichten“ |
| `#/beitreten` | neue Geräte | Koppelt per Einladung und fragt „Wer bist du?“ bzw. „Anzeige“ |

Unten gibt es am Handy eine Navigation mit allen drei Ansichten. Auf großen Querformat-Bildschirmen ist sie im
Board ausgeblendet (der Schriftzug „Putzteufel“ führt zurück).

## Phasen

| Phase | Inhalt | Stand |
| --- | --- | --- |
| 0 – Einrichtung | Firebase-Projekt anlegen (durch Christoph), Web-App registrieren, Firestore und anonyme Anmeldung einschalten | **erledigt** (`putzteufel-b6e23`) |
| 1 – Gerüst | Statische PWA, Router mit drei Ansichten, Manifest, Service Worker, Icons, Platzhalter-Daten, GitHub Pages | **erledigt** |
| 2 – Daten & Kopplung | Firebase SDK einbinden, anonyme Anmeldung, Haushalt anlegen, Einladung per Link/QR/Code, „Ich bin …“, Fernseher als Anzeige, Geräteliste, Code erneuern, Firestore-Regeln (eingespielt, 41 Prüfungen bestanden), ein einziger Haushalt | **umgesetzt** – abgeschlossen, sobald Christoph den Haushalt angelegt und die Geräte gekoppelt hat |
| 3 – Aufgabenlogik | Übernehmen/Zurückgeben/Erledigt in Firestore, Wochenreset per Transaktion, `log`-Einträge, einmalige Aufgaben | geplant |
| 4 – Ansichten | Board, „Meine Aufgaben“ und Einstellungen fertig ausbauen (Aufgaben und Mitglieder verwalten, Wechselzeit, Geräte) | geplant |
| 5 – Inbetriebnahme | Echte Aufgaben und Mitglieder anlegen, alle Handys und den Fernseher koppeln, Alltagstest | geplant |

## Später (bewusst nicht jetzt)

- Statistik (aus dem `log`)
- Punkte / Aufwand je Aufgabe
- Weitere Rhythmen (z. B. alle zwei Wochen, monatlich)
- Push-Erinnerungen
- Rotation (Aufgaben reihum verteilen)
- Ausbaustufe „Mein Profil“ mit Profilbild

## Offene Punkte

- **API-Schlüssel einschränken (empfohlen):** In der Google Cloud Console (APIs & Dienste → Anmeldedaten) den
  Browser-Schlüssel des Projekts auf die Websites `https://de-mattia.github.io/*` und `http://localhost:8137/*`
  beschränken. Die Daten schützen weiterhin die Firestore-Regeln; das erschwert nur fremde Nutzung des Schlüssels.

- **Testdaten aus der Entwicklung:** Die Test-Haushalte (`avwg98`, `uh6erm`, `c489xw`) sind gelöscht. Übrig sind
  nur anonyme Test-Konten unter Authentication → Nutzer (harmlos, können bleiben oder gelöscht werden). Löschen
  eines Haushalts samt Unterdaten: `npx firebase-tools@15.34.0 firestore:delete households/<ID> --recursive --project putzteufel-b6e23`.
- **Regeltests nach der Einrichtung:** `tools/regeln-pruefen.mjs` legt einen Test-Haushalt an – das geht nach der
  Einrichtung nicht mehr. Für spätere Regeländerungen (Phase 3) das Skript auf vorübergehend gekoppelte
  Test-Geräte im echten Haushalt umstellen (ohne `log`-Einträge, da diese nicht löschbar sind).
- **Gelöschter Browserspeicher:** Löscht jemand die Website-Daten, ist die anonyme Anmeldung weg – das Gerät
  muss neu eingeladen werden; das alte Gerät in der Liste entfernen.
- **Bildschirmschoner am Fire TV:** Die Wake-Lock-API verhindert ihn vermutlich nicht. Ggf. in den
  Fire-TV-Einstellungen (Anzeige & Töne → Bildschirmschoner) abschalten.
- **Volle Spalte „Erledigt“ zum Wochenende:** Sind fast alle Karten erledigt, wird die Spalte zweispaltig und
  die anderen beiden sind leer. In Phase 4 prüfen, ob die Spaltenbreite sich nach der Kartenzahl richten soll.
- **Silk-Browser:** Darstellung und Vollbild am echten Gerät prüfen (Ende Phase 1 durch Christoph).
