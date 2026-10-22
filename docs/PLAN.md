# Putzteufel – Plan und Entscheidungen

Familien-Putzplan als Kanban-Board. Diese Datei ist der **technische Plan** (Architektur, Datenmodell, Phasen,
offene Punkte) und wird mit jeder Phase fortgeschrieben. **Alle Vorgaben von Christoph und alle
Designentscheidungen mit Begründung** stehen in [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md).

> **Grundsatz (seit 2026-10-22): Die Features bleiben minimal.** Gebaut wird nur, was ausdrücklich verlangt ist –
> „Neue Ideen kommen dann sicher später von alleine.“ Was beim Arbeiten überflüssig wirkt, wird als Vorschlag
> genannt, nicht eigenmächtig entfernt.

## Ziel und Rahmen

- Putzplan für die Familie als Kanban-Board mit den Spalten **Offen / Übernommen / Erledigt**.
- **Progressive Web App (PWA)**, Oberfläche und Dokumentation auf **Deutsch**.
- **Kostenlos** betrieben (GitHub Pages + Firebase Spark-Tarif).
- **Nutzer:** Christoph (Auftraggeber, GitHub-Konto `de-mattia`), Sandra, Moira, Paula, Laura –
  alle mit Android-Handys, Installation über Chrome („Zum Startbildschirm hinzufügen“ / „App installieren“).
- **Fernseher:** Fire-TV-Stick mit Silk-Browser, 1920×1080, gekoppelt als „Anzeige“ – **nur anschauen, keine
  Bedienung**; das Board läuft dort ohne Eingriff live.
- **Bedienung des Boards:** mit der Maus, z. B. am Laptop (mit Person oder als gemeinsamer Laptop ohne Person).

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
| Regeln | `firestore.rules` (mit `firebase.json`, `.firebaserc`), einspielen: `npx firebase-tools@15.34.0 deploy --only firestore:rules` |
| Testen | Nur im **Firebase-Emulator** (braucht Java 21): Regeln mit `npx firebase-tools@15.34.0 emulators:exec --only auth,firestore "node tools/regeln-pruefen.mjs"`; die App unter `localhost`/`127.0.0.1` spricht automatisch mit dem Emulator (`npx firebase-tools@15.34.0 emulators:start --only auth,firestore`). Die echte Datenbank bleibt dabei unberührt |

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
js/firebase.js          Lädt das SDK, anonyme Anmeldung, Firestore mit Offline-Cache (lokal: Emulator)
js/store.js             Datenzugriff: Haushalt, Mitglieder, Geräte, Aufgaben, Verlauf live aus Firestore
js/woche.js             Putzwoche, Kalenderwoche, effektiver Status
js/ui.js                DOM-Helfer (el, fuelle), Avatar, Formatierung
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
- **Rollen:** `person` liest und schreibt alles; `anzeige` (Fernseher, gemeinsamer Laptop) liest und darf Karten
  verschieben (nur `status`, `uebernommenVon`, `statusWoche`) sowie Verlaufseinträge anlegen; `neu` liest nur.
  Personen und Anzeigen dürfen den Beitrittscode lesen (QR-Code in den Einstellungen bzw. Join-Knopf am Board),
  ändern dürfen ihn nur Personen. Den Code fragt ein Gerät erst ab, wenn seine Rolle beim Server bestätigt ist.
- **Geräte:** Liste in den Einstellungen; Personen-Geräte können jedes Gerät entfernen, jedes Gerät kann sich
  selbst entkoppeln. Ein entferntes Gerät verliert sofort den Zugriff und zeigt wieder die Startseite.
- **Zugang je Gerät** (`js/app.js`): nicht gekoppelt → Startseite (nur „Ich wurde eingeladen“) bzw. Beitritt;
  Rolle `neu` → „Wer bist du?“; Rolle `anzeige` → immer das Board, ohne Navigation; `person` → alle Ansichten.

## Datenmodell (Firestore)

```
einrichtung/abgeschlossen                           nicht lesbar; sperrt weitere Haushalte
  haushalt (haushaltId), erstelltAm

households/{haushaltId}                             der einzige Haushalt, ID: 6 Zeichen
  name, wochenwechsel { wochentag (0 = So … 6 = Sa), stunde, minute }, erstelltAm, erstelltVon (uid)

households/{haushaltId}/members/{mitgliedId}        Person, ID z. B. "christoph"
  name, farbe ("#rrggbb"), reihenfolge, einstellungen { … }, bild (optional, Base64 ~128×128)

households/{haushaltId}/devices/{uid}               Gerät
  rolle ("person" | "anzeige" | "neu"), mitglied (mitgliedId | null), name (z. B. "Android-Gerät"),
  gekoppeltAm, code (nur während des Beitritts)

households/{haushaltId}/tasks/{aufgabeId}           Aufgabe = Karte (nur Titel und Person, keine Tags)
  titel, typ ("woche" | "einmalig"), status ("offen" | "uebernommen" | "erledigt"),
  uebernommenVon (mitgliedId; null genau dann, wenn "offen"),
  statusWoche ("2026-W43" – Putzwoche, in der der Status gesetzt wurde, oder null), erstelltAm

households/{haushaltId}/log/{eintragId}             Verlauf – nur anhängen
  aufgabe (aufgabeId), titel, erledigtVon (mitgliedId), zeitpunkt, kw ("2026-W43")

households/{haushaltId}/geheim/beitritt             für Außenstehende nicht lesbar
  code (6 Zeichen)
```

- Der `log` ist die Grundlage für die spätere Statistik. Regeln: nur `create` (Person oder Anzeige), kein
  `update`/`delete`.
- Sortierung der Karten: nach Titel.
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
- **Physisches Zurücksetzen:** Das nächste Gerät, das die App lädt (Person oder Anzeige), setzt veraltete
  Wochenkarten je Karte per **Transaktion** auf „Offen“ (`uebernommenVon` und `statusWoche` → null). Erledigte
  einmalige Aufgaben aus Vorwochen löscht das nächste Personen-Gerät (der Verlauf behält sie).
- Jeder Wechsel nach **„Erledigt“** (Knopf am Handy oder Ziehen am Board) schreibt im selben Batch einen
  **`log`-Eintrag**.
- **Einmalige Aufgaben** bleiben, bis sie erledigt sind (auch über den Wochenwechsel, auch wenn sie
  übernommen sind). **Erledigte** einmalige Aufgaben verschwinden beim nächsten Wochenwechsel aus „Erledigt“.
- **Putzwoche → Kalenderwoche:** Eine Putzwoche (z. B. So 20:00 bis So 20:00) bekommt die ISO-KW, in der ihre
  Mitte liegt. Bei Sonntag 20:00 ist das die folgende Montag–Sonntag-Woche. Schlüssel: `JJJJ-Www`.

## Ansichten

| Route | Für | Inhalt |
| --- | --- | --- |
| `#/board` | Fernseher (nur anschauen), Laptop/Browser (Maus) | Dunkel, große Schrift, Spalten **Offen / Übernommen / Erledigt**. Karte = **Titel + Initiale im Farbkreis** der Person. Kopfzeile mit **KW**, Datum, Zeitpunkt des Wechsels, **Fortschritt**, Knopf **„Join“** (QR-Code mit dem Einladungslink zum Scannen mit dem Handy) und Uhr; unten Legende der Personen. **Drag & Drop mit der Maus** (Pointer Events; Touch nach 250 ms Halten geht nebenbei): Gerät mit Person → diese Person übernimmt/erledigt; Gerät ohne Person (gemeinsamer Laptop) → Auswahl der Avatare, wenn die Karte noch niemandem gehört; Übernommen ↔ Erledigt behält die Person; nach Offen wird die Person entfernt. Skaliert mit der Bildschirmgröße (1920×1080 → 20 px Grundschrift); passt eine Spalte nicht, werden ihre Karten kompakter bzw. zweispaltig. Wake-Lock, wo unterstützt |
| `#/` | Handy | **„Meine Aufgaben“**: oben **„Bei mir“** mit **✓ Erledigt / Zurückgeben**, darunter **„Noch offen“** mit **Übernehmen**, eingeklappt „Erledigt diese Woche“. **Plus-Knopf** für eine einmalige Aufgabe (nur Titel) |
| `#/einstellungen` | Handy | **Wochenaufgaben** (anlegen, umbenennen, löschen), **Einladen** (QR-Code, Link, Einladungscode, Code erneuern), **Mitglieder** (live), „Dieses Gerät gehört“, **Geräte** (entfernen/entkoppeln), **Zeitpunkt des Wochenwechsels** (nur Anzeige), App-Infos |
| `#/start` | neue Geräte | „Ich wurde eingeladen“ mit Feld für den Einladungscode; mit `?einrichten=1` einmalig „Haushalt einrichten“ |
| `#/beitreten` | neue Geräte | Koppelt per Einladung und fragt „Wer bist du?“ bzw. „Anzeige“ |

Unten gibt es am Handy eine Navigation mit allen drei Ansichten. Auf großen Querformat-Bildschirmen ist sie im
Board ausgeblendet (der Schriftzug „Putzteufel“ führt zurück).

## Phasen

| Phase | Inhalt | Stand |
| --- | --- | --- |
| 0 – Einrichtung | Firebase-Projekt anlegen (durch Christoph), Web-App registrieren, Firestore und anonyme Anmeldung einschalten | **erledigt** (`putzteufel-b6e23`) |
| 1 – Gerüst | Statische PWA, Router mit drei Ansichten, Manifest, Service Worker, Icons, Platzhalter-Daten, GitHub Pages | **erledigt** |
| 2 – Daten & Kopplung | Firebase SDK einbinden, anonyme Anmeldung, Haushalt anlegen, Einladung per Link/QR/Code, „Ich bin …“, Fernseher als Anzeige, Geräteliste, Code erneuern, Firestore-Regeln, ein einziger Haushalt | **erledigt** |
| 3 – Aufgabenlogik | Aufgaben in Firestore (nur Titel), Übernehmen/Zurückgeben/Erledigt in Echtzeit, Wochenreset per Transaktion, `log`-Einträge, einmalige Aufgaben, **interaktives Board mit Drag & Drop**, Wochenaufgaben in den Einstellungen verwalten, Demo- und Test-Code entfernt, Regeln im Emulator geprüft (49 Prüfungen) | **umgesetzt** (v0.3.0) |
| 4 – Ansichten | Nur noch, was Christoph ausdrücklich verlangt (Grundsatz: minimal) – z. B. Mitglieder bearbeiten oder Wechselzeit ändern, falls gewünscht | offen |
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

- **Testdaten:** Getestet wird nur noch im Emulator. In der echten Datenbank liegen keine Testdaten mehr; übrig
  sind nur anonyme Test-Konten aus Phase 2 unter Authentication → Nutzer (harmlos).
- **Gelöschter Browserspeicher:** Löscht jemand die Website-Daten, ist die anonyme Anmeldung weg – das Gerät
  muss neu eingeladen werden; das alte Gerät in der Liste entfernen.
- **Bildschirmschoner am Fire TV:** Die Wake-Lock-API verhindert ihn vermutlich nicht. Ggf. in den
  Fire-TV-Einstellungen (Anzeige & Töne → Bildschirmschoner) abschalten.
- **Volle Spalte „Erledigt“ zum Wochenende:** Sind fast alle Karten erledigt, wird die Spalte zweispaltig und
  die anderen beiden sind leer. In Phase 4 prüfen, ob die Spaltenbreite sich nach der Kartenzahl richten soll.
