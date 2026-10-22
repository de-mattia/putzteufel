# Putzteufel – Vorgaben und Designentscheidungen

Diese Datei sammelt **alle Vorgaben von Christoph** (Auftraggeber) und **alle Designentscheidungen** mit
Begründung. Technische Einzelheiten (Datenmodell, Phasen, offene Punkte) stehen in [PLAN.md](PLAN.md).

> **Regel für alle künftigen Arbeiten:** Jede neue Anweisung von Christoph wird mit Datum in das
> [Vorgaben-Protokoll](#1-vorgaben-protokoll) eingetragen, und betroffene Entscheidungen in Abschnitt 2 werden
> in derselben Änderung angepasst. Ältere Einträge werden nicht gelöscht, sondern als „ersetzt durch …“ markiert.

## 1. Vorgaben-Protokoll

### 2026-10-21 – Ausgangsauftrag (über die Planungssitzung)

| # | Vorgabe |
| --- | --- |
| V1 | Familien-Putzplan-App **„Putzteufel“** als **Kanban-Board**, **Progressive Web App**, **kostenlos** betrieben. |
| V2 | Sprache der Oberfläche und der Doku: **Deutsch**. |
| V3 | Nutzer: **Christoph** (Auftraggeber, GitHub `de-mattia`), **Sandra, Moira, Paula, Laura** – alle mit **Android**, Installation über **Chrome**. |
| V4 | Das Board läuft zusätzlich auf dem **Fernseher** (Fire-TV-Stick, **Silk-Browser**, 1920×1080), **nur Anzeige, keine Bedienung**. |
| V5 | Statische App aus HTML/CSS/JavaScript (ES-Module), **kein Build-Schritt**, Hosting auf **GitHub Pages** aus einem **öffentlichen** Repo `putzteufel`; alle Pfade relativ, Hash-Routing. |
| V6 | Datenbank: **Firebase Firestore** im kostenlosen **Spark-Tarif** (Echtzeit, Offline-Cache), SDK per CDN mit **fest gepinnter Version**. **Keine Cloud Functions, kein Firebase Storage.** |
| V7 | Anmeldung: **kein Google-Login, kein Passwort**. Jedes Gerät meldet sich **anonym** an und wird per **Einladungslink/QR-Code mit Code** gekoppelt („**Ich bin …**“). Der Fernseher wird als **„Anzeige“** gekoppelt. Regeln lassen nur gekoppelte Geräte zu; der Beitritt prüft den Code per `get()` auf ein **nicht lesbares Secret-Dokument**. |
| V8 | Datenmodell: `households/{id}` mit `members`, `devices`, `tasks`, `log` (Verlauf nur anhängen). |
| V9 | **Wochenkarten:** Jede Wochenaufgabe ist **genau eine dauerhafte Karte**. Zum Wochenwechsel **Sonntag 20:00** (änderbar) springt sie auf „Offen“ und verliert die Person. Die Anzeige berechnet den effektiven Status selbst; das Zurücksetzen schreibt das nächste Handy per Transaktion. Jeder Klick auf „Erledigt“ schreibt einen `log`-Eintrag. |
| V10 | **Einmalige Aufgaben** bleiben, bis sie erledigt sind; erledigte verschwinden beim nächsten Wochenwechsel. |
| V11 | Ansichten: `#/board` (TV: dunkel, große Schrift, Offen/Übernommen/Erledigt, Initiale im Farbkreis, KW, „11 von 18 erledigt“), `#/` „Meine Aufgaben“ (Bei mir mit ✓ Erledigt/Zurückgeben, Noch offen mit Übernehmen, Plus-Knopf), `#/einstellungen` (Wochenaufgaben, Mitglieder, Einladungs-QR, Geräte, Reset-Zeitpunkt). |
| V12 | Profilbild (später): auf ca. **128×128** verkleinern, als **Base64** im Member-Dokument. |
| V13 | Später, nicht jetzt: Statistik, Punkte/Aufwand, weitere Rhythmen, Push-Erinnerungen, Rotation. |
| V14 | Commits enden mit `Co-Authored-By: Claude …`. Nichts unter `D:\Michi` ablegen. |

### 2026-10-21 – im Verlauf von Phase 1 und 2

| # | Vorgabe |
| --- | --- |
| V15 | Phase 0 erledigt: Firebase-Projekt **`putzteufel-b6e23`** (Firestore europe-west3, anonyme Anmeldung, Web-App `putzteufel-web`). Die Web-Konfiguration darf ins öffentliche Repo. |
| V16 | GitHub meldet den Firebase-API-Schlüssel als „Secret“ → siehe Entscheidung D6. |
| V17 | Go für **Phase 2** (Datenbank-Anbindung und Kopplung der Geräte). |
| V18 | **Eigenes App-Icon** von Christoph: Waschbär mit Teufelshörnern, Sprühflasche und Tuch, Schriftzug „Putzteufel“ (Datei `icons/putzteufel-original.png`). Ersetzt das zuvor generierte Icon. |
| V19 | „Es reicht mir, **einen einzigen Haushalt** zu haben.“ |
| V20 | Eine Markdown-Datei mit **allen Designentscheidungen**, insbesondere Christophs Vorgaben, anlegen und **alle künftigen Anweisungen** dort eintragen (diese Datei). |
| V21 | Die drei Test-Haushalte aus der Entwicklung (`avwg98`, `uh6erm`, `c489xw`) löschen – erledigt am 2026-10-21. |
| V22 | Phase 3 (echte Aufgaben, live auf allen Geräten) **noch nicht** beginnen – Christoph testet zuerst Phase 2 und gibt dann das Go. *(erledigt durch V23)* |

### 2026-10-22 – nach Christophs Test von Phase 2 (über die Planungssitzung)

| # | Vorgabe |
| --- | --- |
| V23 | **Go für Phase 3**: Aufgaben in Firestore, Wochenkarten mit Status-Woche und Reset Sonntag 20:00 (effektiver Status in der Anzeige, Zurücksetzen per Transaktion beim nächsten Laden), einmalige Aufgaben bleiben bis erledigt, jeder Wechsel nach „Erledigt“ schreibt einen Verlaufseintrag, alles in Echtzeit auf allen Geräten. |
| V24 | **Grundsatz: Features bleiben minimal.** Nichts einbauen, was nicht ausdrücklich verlangt ist („Neue Ideen kommen dann sicher später von alleine“). Was überflüssig wirkt, als Vorschlag nennen statt selbst entfernen. |
| V25 | **Keine Tags mehr:** kein Raum (Datenfeld, Eingabe, Vorschläge, Sortierung), keine „einmalig“-Marke, kein Zusatz „Wochenaufgabe“. Eine Karte zeigt nur **Titel und Person**. *(ersetzt den Raum aus V8/V11)* |
| V26 | **Keine Mehrfach-Haushalte im Code:** keine Test-Haushalte, kein Wechsel zwischen Haushalten. Der Pfad `households/{id}` darf bleiben. *(präzisiert V19)* |
| V27 | **Interaktives Board:** Mauszeiger sichtbar; Karten per **Drag & Drop** (Pointer Events, Maus und Touch) in andere Spalten schieben. Gerät mit Person → diese Person übernimmt/erledigt; Gerät ohne Person (Fernseher) → beim Ablegen in „Übernommen“/„Erledigt“ Auswahl der fünf Avatare, sofern die Karte noch niemandem gehört; „Übernommen“ → „Erledigt“ behält die Person; zurück nach „Offen“ entfernt die Person. Die Rolle „Anzeige“ darf dafür Aufgaben ändern und Verlaufseinträge anlegen. *(ersetzt „nur Anzeige, keine Bedienung“ aus V4)* |
| V28 | **Vorgezogen:** minimale Verwaltung der Wochenaufgaben in den Einstellungen – anlegen, umbenennen, löschen. Christoph trägt seine Liste selbst ein; keine Startliste, keine Demo-Daten mehr. |
| V29 | **Testen** ohne Test-Haushalte, z. B. mit dem Firestore-Emulator. Am echten Haushalt nur nach Absprache mit Christoph und mit klar markierten Testkarten, die danach wieder entfernt werden. |
| V30 | **Ergänzung zu V27:** Am Fernseher wird nicht geklickt – das Board wird dort nur angeschaut und muss ohne jede Bedienung sauber und live laufen. Bedient wird das Board mit der **Maus**, z. B. am Laptop. Kein Aufwand für die Fire-TV-Fernbedienung; Touch darf nebenbei funktionieren, wenn es nichts extra kostet. Die Personenauswahl beim Ablegen gibt es nur für Geräte ohne Person (z. B. ein gemeinsamer Laptop); ein Laptop mit Person verschiebt ohne Nachfrage für diese Person. |

### 2026-10-22 – direkt von Christoph

| # | Vorgabe |
| --- | --- |
| V31 | „Bau auf der Übersichtsseite einen Button **Join** ein; wenn man den klickt, kommt ein **QR-Code**, mit dem ich das Ding im Handy öffnen kann.“ |

## 2. Designentscheidungen

Quelle: **V…** = Vorgabe von Christoph, **C** = von Claude vorgeschlagen bzw. umgesetzt.

### Grundsatz

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D0 | **Features bleiben minimal.** Gebaut wird nur, was ausdrücklich verlangt ist. Was überflüssig wirkt, wird als Vorschlag genannt statt eigenmächtig entfernt. | „Neue Ideen kommen dann sicher später von alleine.“ | V24 |

### Plattform und Betrieb

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D1 | PWA aus HTML/CSS/ES-Modulen ohne Build-Schritt. | Einfach zu ändern, keine Werkzeugkette, läuft auf Handy und TV. | V1, V5 |
| D2 | Hosting GitHub Pages (`main`, Wurzel), Adresse `https://de-mattia.github.io/putzteufel/`, alle Pfade relativ, Hash-Routing. | Kostenlos; Pages kann keine Server-Umleitungen. | V5 |
| D3 | Firestore (Spark), keine Cloud Functions/Storage; alle Logik im Browser, Schutz über Sicherheitsregeln. | Kostenlos. | V6 |
| D4 | Firebase JS SDK **12.19.0** per CDN, fest gepinnt in `js/config.js`. | Letzte 12er-Version, seit Wochen stabil; 13.x war beim Einbau erst wenige Tage bis zwei Wochen alt. Nur bewusst anheben. | V6, C |
| D5 | Service Worker: App-Dateien „Netz zuerst“ (nach 4 s bzw. offline aus dem Cache), Firebase SDK „Cache zuerst“. Bei jeder Veröffentlichung `CACHE_VERSION` (sw.js) und `APP_VERSION` (js/config.js) erhöhen – offene Seiten laden dann einmal neu. | Immer aktueller Stand, trotzdem offline nutzbar; der Fernseher aktualisiert sich ohne Bedienung. | C |
| D6 | Die Firebase-Web-Konfiguration (inkl. API-Schlüssel) liegt öffentlich im Repo; die GitHub-Warnung wird als „Won't fix“ geschlossen. Empfohlen: Schlüssel in der Google Cloud Console auf `https://de-mattia.github.io/*` und `http://localhost:8137/*` beschränken. | Der Schlüssel ist eine Projektkennung und muss ohnehin an jeden Browser ausgeliefert werden; geschützt wird über die Regeln. | V15, V16, C |

### Anmeldung, Haushalt und Geräte

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D7 | Anonyme Firebase-Anmeldung je Gerät, kein Login, kein Passwort. | Kinderleicht, keine Konten nötig. | V7 |
| D8 | **Genau ein Haushalt.** Christoph richtet ihn einmalig über `#/start?einrichten=1` ein. Dabei entsteht `einrichtung/abgeschlossen`; danach verbieten die Regeln **jede** weitere Neuanlage. Die Startseite zeigt sonst nur „Ich wurde eingeladen“. Kein Code für Test-Haushalte oder Haushaltswechsel; der Pfad `households/{id}` bleibt. | Mehr wird nicht gebraucht; Fremde können so gar nichts mehr anlegen. | V19, V26, C |
| D9 | Einladung = Link/QR mit Haushalts-ID und Code (`#/beitreten?h=…&c=…`). Am Fernseher stattdessen den **Einladungscode** abtippen (12 Zeichen in Dreiergruppen, z. B. `C48-9XW-B8Q-FNF`, ohne verwechselbare Zeichen 0/1/i/l/o, Groß-/Kleinschreibung egal). | QR für Handys, kurzer Code für die Fernbedienung; der Teil nach `#` geht nicht an den Server. | V7, C |
| D10 | Beitritt in zwei Schritten: Gerät meldet sich mit Code an (Rolle „neu“, darf nur lesen), dann „**Ich bin …**“ (Rolle „person“) oder „**Anzeige**“. Eine Anzeige kann sich nicht selbst zur Person machen. | Vor dem Beitritt darf niemand die Mitgliederliste lesen. | V7, C |
| D11 | Der Beitrittscode (`households/{id}/geheim/beitritt`) ist für Außenstehende und neue Geräte nicht lesbar, für Personen-Geräte und Anzeigen schon (QR-Code in den Einstellungen bzw. Join-Knopf am Board). Ändern dürfen ihn nur Personen. „**Code erneuern**“ macht alte Einladungen ungültig; gekoppelte Geräte bleiben gekoppelt. | Einladungen müssen anzeigbar sein – auch am Board eines Geräts ohne Person. | V7, V31, C |
| D12 | Geräteliste in den Einstellungen: Personen-Geräte können jedes Gerät entfernen, jedes Gerät kann sich selbst entkoppeln. Entfernte Geräte verlieren sofort den Zugriff und landen auf der Startseite. „Dieses Gerät gehört …“ lässt eine Person ihr Gerät umstellen. | Verlorene Handys oder ein neuer Fernseher lassen sich selbst verwalten. | V11, C |
| D13 | Geräte ohne Person haben die Rolle „Anzeige“: der Fernseher (nur anschauen, keine Bedienung) und z. B. ein gemeinsamer Laptop. Sie sehen immer das Board, ohne Navigation, und dürfen dort **Karten verschieben** (nur Status, Person, Status-Woche) und Verlaufseinträge anlegen – aber keine Aufgaben anlegen, umbenennen oder löschen, keine Mitglieder oder Geräte ändern. Start- und Beitrittsseite werden auf großen Bildschirmen größer dargestellt. | Der gemeinsame Laptop kann das Board bedienen; alles andere bleibt geschützt. | V4, V27, V30, C |
| D14 | Der Verlauf (`log`) darf nur ergänzt, nie geändert oder gelöscht werden. | Grundlage für spätere Statistik. | V8 |

### Aufgabenlogik

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D15 | Jede Wochenaufgabe ist eine dauerhafte Karte mit `statusWoche`. Die Anzeige berechnet den effektiven Status selbst (`js/woche.js`); das physische Zurücksetzen schreibt das nächste Gerät beim Laden, je Karte per Transaktion. | Der Fernseher springt pünktlich um, ohne neu zu laden. | V9, V23 |
| D16 | Wochenwechsel standardmäßig **Sonntag 20:00**, einstellbar. Eine Putzwoche bekommt die ISO-KW ihrer Mitte (bei So 20:00 die folgende Mo–So-Woche). | Familienabend als natürlicher Abschluss; eindeutige KW. | V9, C |
| D17 | Einmalige Aufgaben bleiben bis erledigt (auch übernommen über den Wechsel hinweg); erledigte verschwinden beim nächsten Wechsel – das nächste Personen-Gerät löscht sie, der Verlauf behält sie. Anlegen über den Plus-Knopf, nur mit Titel. | | V10, C |
| D18 | Jeder Wechsel nach „Erledigt“ (Handy-Knopf oder Board) schreibt im selben Batch einen `log`-Eintrag (Aufgabe, Titel, erledigt von, Zeitpunkt, KW). | | V9, V23 |
| D19 | Eine Karte hat nur **Titel und Person** (Feld `typ` intern für Woche/einmalig) – keine Räume, keine Marken. Sortiert wird nach Titel. Die Regeln lehnen andere Felder ab. | | V25 |
| D19a | Wochenaufgaben verwalten Personen in den Einstellungen: **anlegen, umbenennen, löschen** – nicht mehr. Keine Startliste, keine Demo-Daten. | | V28 |

### Gestaltung

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D20 | Board immer **dunkel**, große Schrift, drei Spalten (Offen grau, Übernommen orange, Erledigt grün), Karte mit Titel und Initiale im Farbkreis, Kopfzeile mit KW, Datum, Wechselzeitpunkt, Fortschritt und Uhr, unten Legende der Personen. Skaliert mit dem Bildschirm (1920×1080 → 20 px Grundschrift); passt eine Spalte nicht, werden ihre Karten einzeilig, dann zweispaltig. Mauszeiger sichtbar. | Aus Sofa-Entfernung lesbar, ohne Scrollen. | V4, V11, V27, C |
| D20b | **Join-Knopf** in der Kopfzeile des Boards (Beschriftung „Join“ wie gewünscht): öffnet einen Dialog mit dem QR-Code des Einladungslinks; das Handy scannt ihn und wählt „Ich bin …“. Der Knopf erscheint, sobald der Code geladen ist (Geräte mit Person und Anzeigen). | Handy schnell vom Laptop/Board aus koppeln. | V31 |
| D20a | **Drag & Drop am Board** für die **Maus** (Pointer Events, ab 6 px Bewegung); Touch geht nebenbei mit (nach 250 ms Gedrückthalten, vorher bewegt = Seite scrollt). Ablegen: Übernommen ↔ Erledigt behält die Person; nach Offen wird sie entfernt; sonst bekommt die Karte die Person des Geräts, und ein Gerät ohne Person (gemeinsamer Laptop) fragt per Avatar-Auswahl. Für die Fire-TV-Fernbedienung gibt es keine Bedienung. | Bedient wird am Laptop mit der Maus; der Fernseher zeigt nur an. | V27, V30, C |
| D21 | Handy-Ansichten folgen dem System (hell/dunkel), Navigation unten, „Bei mir“ oben, Plus-Knopf unten rechts. | Gewohnte Bedienung am Android-Handy. | V11, C |
| D22 | Personenfarben: Christoph Blau `#3b82f6`, Sandra Lila `#a855f7`, Moira Türkis `#14b8a6`, Paula Orange `#f59e0b`, Laura Pink `#ec4899`. Die Initiale wird automatisch hell oder dunkel geschrieben. | Gut unterscheidbar auf dunklem Grund. | C |
| D23 | Akzentfarbe Teufelsrot `#ff5a4e`, dunkler Grund `#16141f` (auch Theme-Farbe), Grün `#2fbf71` für Erledigt. | Passt zu Name und Icon (Rot/Schwarz/Creme). | C |
| D24 | **App-Icon = Christophs Waschbär-Icon.** `tools/make_icons.py` erzeugt daraus: „any“-Icons mit transparenten Ecken, „maskable“-Icons (Inhalt auf 66 % verkleinert auf Creme, damit Android beim Zuschneiden nichts abschneidet) und das Apple-Icon. | Eigenes Design der Familie; Android-taugliche Varianten. | V18, C |
| D25 | Oberfläche, Doku und Bezeichner im Code auf Deutsch. | | V2 |
| D26 | Texte werden immer als Textknoten eingefügt (Helfer `el()`/`fuelle()` in `js/ui.js`, kein `innerHTML`). | Eingaben der Familie können nie als HTML ausgeführt werden. | C |

### Entwicklung und Tests

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D27 | Getestet wird im **Firebase-Emulator** (Auth + Firestore, braucht Java 21). Die App unter `localhost`/`127.0.0.1` spricht automatisch mit dem Emulator, die Live-Seite immer mit der echten Datenbank. Am echten Haushalt wird nur nach Absprache mit Christoph getestet, mit markierten Testkarten, die danach wieder entfernt werden. | Keine Testdaten in der Familien-Datenbank. | V29, C |
| D28 | Regeln liegen in `firestore.rules` und werden mit `npx firebase-tools@15.34.0 deploy --only firestore:rules` eingespielt (Christoph meldet die CLI selbst an). Geprüft wird vorher im Emulator: `npx firebase-tools@15.34.0 emulators:exec --only auth,firestore "node tools/regeln-pruefen.mjs"`. | Nachvollziehbar und wiederholbar. | V29, C |
