# Putzteufel – Plan und Entscheidungen

Familien-Putzplan als Kanban-Board. Diese Datei hält fest, **was entschieden ist und warum**.
Sie wird mit jeder Phase fortgeschrieben.

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
| Datenbank (ab Phase 2) | **Firebase Firestore** im kostenlosen **Spark-Tarif**: Echtzeit-Listener, Offline-Cache (`persistentLocalCache`) |
| Firebase SDK | Per CDN (`https://www.gstatic.com/firebasejs/<VERSION>/…`) mit **fest gepinnter Version**, eingetragen in `js/config.js` |
| Nicht genutzt | **Keine Cloud Functions, kein Firebase Storage** – beides gibt es nur im kostenpflichtigen Blaze-Tarif |
| Konfiguration | Vorbereitete Stelle: `js/config.js` (`firebaseConfig`, `FIREBASE_SDK_VERSION`). Die Web-Konfiguration ist kein Geheimnis und darf ins öffentliche Repo; geschützt wird über die Firestore-Regeln |

### Ordnerstruktur

```
index.html              Einstieg, Navigation
manifest.webmanifest    PWA-Manifest (Name, Icons, display: standalone, relative start_url/scope)
sw.js                   Service Worker (App-Shell-Cache)
css/app.css             Alle Stile (Handy hell/dunkel nach System, Board immer dunkel)
js/app.js               Start: Router, Service-Worker-Registrierung
js/router.js            Hash-Router (#/pfad?param=wert)
js/config.js            App-Version, Firebase-Konfiguration (Phase 2)
js/store.js             Datenzugriff – Phase 1 im Speicher, ab Phase 2 Firestore
js/woche.js             Putzwoche, Kalenderwoche, effektiver Status
js/ui.js                DOM-Helfer, Avatar, Formatierung
js/demo-daten.js        PLATZHALTER-Beispieldaten (nur Phase 1)
js/ansichten/*.js       Die drei Ansichten
icons/                  App-Icons (erzeugt mit tools/make_icons.py)
docs/PLAN.md            Diese Datei
```

## Anmeldung und Kopplung (ab Phase 2)

- **Kein Google-Login, kein Passwort.**
- Jedes Gerät meldet sich **anonym** bei Firebase Authentication an (eigene `uid` je Gerät/Browser).
- Ein Gerät wird über einen **Einladungslink bzw. QR-Code mit Code** an den Haushalt gekoppelt.
  Danach wählt man **„Ich bin …“** (eine Person aus den Mitgliedern).
  - Der Link nutzt den Hash, z. B. `…/putzteufel/#/beitreten?h=<haushalt>&c=<code>` – der Teil nach `#`
    wird nicht an den Server geschickt.
- Der **Fernseher** wird genauso gekoppelt, aber als reine **„Anzeige“** (liest nur).
- **Firestore-Regeln** lassen nur gekoppelte Geräte zu (`devices/{request.auth.uid}` muss existieren).
- **Beitritt:** Das Gerät legt `devices/{uid}` an und schickt dabei den Code mit. Die Regel vergleicht ihn per
  `get()` mit einem **nicht lesbaren Secret-Dokument** (z. B. `households/{id}/geheim/beitritt`, Feld `code`).
  Lesen darf dieses Dokument niemand; die Regel selbst darf es per `get()` prüfen. Ein neuer Code macht alte
  Einladungen ungültig.
- Der allererste Haushalt wird vom ersten Gerät (Christoph) angelegt; dieses Gerät ist damit gekoppelt.

## Datenmodell (Firestore)

```
households/{haushaltId}
  name, wochenwechsel { wochentag (0 = So … 6 = Sa), stunde, minute }, erstelltAm

households/{haushaltId}/members/{mitgliedId}        Person
  name, farbe ("#rrggbb"), einstellungen { … }, bild (optional, Base64 ~128×128)

households/{haushaltId}/devices/{uid}               Gerät
  rolle ("person" | "anzeige"), mitglied (mitgliedId | null), name, gekoppeltAm

households/{haushaltId}/tasks/{aufgabeId}           Aufgabe = Karte
  titel, raum, typ ("woche" | "einmalig"), aktiv (bool),
  status ("offen" | "uebernommen" | "erledigt"), uebernommenVon (mitgliedId | null),
  statusWoche ("2026-W43" – Putzwoche, in der der Status gesetzt wurde)

households/{haushaltId}/log/{eintragId}             Verlauf – nur anhängen
  aufgabe (aufgabeId), titel, erledigtVon (mitgliedId), zeitpunkt, kw ("2026-W43")

households/{haushaltId}/geheim/beitritt             nicht lesbar
  code
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
| `#/einstellungen` | Handy | **Wochenaufgaben**, **Mitglieder**, **Einladungs-QR**, **Geräte**, **Zeitpunkt des Wochenwechsels**, App-Infos |

Unten gibt es am Handy eine Navigation mit allen drei Ansichten. Auf großen Querformat-Bildschirmen ist sie im
Board ausgeblendet (der Schriftzug „Putzteufel“ führt zurück).

## Phasen

| Phase | Inhalt | Stand |
| --- | --- | --- |
| 0 – Einrichtung | Firebase-Projekt anlegen (durch Christoph), Web-App registrieren, Firestore und anonyme Anmeldung einschalten | **offen** |
| 1 – Gerüst | Statische PWA, Router mit drei Ansichten, Manifest, Service Worker, Icons, Platzhalter-Daten, GitHub Pages | **erledigt** |
| 2 – Daten & Kopplung | Firebase SDK einbinden, anonyme Anmeldung, Haushalt anlegen, Einladung per Link/QR, „Ich bin …“, Fernseher als Anzeige, Firestore-Regeln, `store.js` auf Firestore umstellen | geplant |
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

- **Kopplung des Fernsehers:** Einen langen Einladungslink mit der Fernbedienung einzutippen ist mühsam.
  In Phase 2 klären, ob der Fernseher stattdessen einen kurzen Code anzeigt, den ein Handy bestätigt.
- **Bildschirmschoner am Fire TV:** Die Wake-Lock-API verhindert ihn vermutlich nicht. Ggf. in den
  Fire-TV-Einstellungen (Anzeige & Töne → Bildschirmschoner) abschalten.
- **Volle Spalte „Erledigt“ zum Wochenende:** Sind fast alle Karten erledigt, wird die Spalte zweispaltig und
  die anderen beiden sind leer. In Phase 4 prüfen, ob die Spaltenbreite sich nach der Kartenzahl richten soll.
- **Silk-Browser:** Darstellung und Vollbild am echten Gerät prüfen (Ende Phase 1 durch Christoph).
