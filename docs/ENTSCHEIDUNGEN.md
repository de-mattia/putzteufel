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

## 2. Designentscheidungen

Quelle: **V…** = Vorgabe von Christoph, **C** = von Claude vorgeschlagen bzw. umgesetzt.

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
| D8 | **Genau ein Haushalt.** Christoph richtet ihn einmalig über `#/start?einrichten=1` ein. Dabei entsteht `einrichtung/abgeschlossen`; danach verbieten die Regeln **jede** weitere Neuanlage. Die Startseite zeigt sonst nur „Ich wurde eingeladen“. | Mehr wird nicht gebraucht; Fremde können so gar nichts mehr anlegen. | V19, C |
| D9 | Einladung = Link/QR mit Haushalts-ID und Code (`#/beitreten?h=…&c=…`). Am Fernseher stattdessen den **Einladungscode** abtippen (12 Zeichen in Dreiergruppen, z. B. `C48-9XW-B8Q-FNF`, ohne verwechselbare Zeichen 0/1/i/l/o, Groß-/Kleinschreibung egal). | QR für Handys, kurzer Code für die Fernbedienung; der Teil nach `#` geht nicht an den Server. | V7, C |
| D10 | Beitritt in zwei Schritten: Gerät meldet sich mit Code an (Rolle „neu“, darf nur lesen), dann „**Ich bin …**“ (Rolle „person“) oder „**Anzeige**“. Eine Anzeige kann sich nicht selbst zur Person machen. | Vor dem Beitritt darf niemand die Mitgliederliste lesen; die Anzeige bleibt sicher schreibgeschützt. | V7, C |
| D11 | Der Beitrittscode (`households/{id}/geheim/beitritt`) ist für Außenstehende, neue Geräte und Anzeigen nicht lesbar, für Personen-Geräte schon (für den QR-Code). „**Code erneuern**“ macht alte Einladungen ungültig; gekoppelte Geräte bleiben gekoppelt. | Einladungen müssen in den Einstellungen anzeigbar sein. | V7, C |
| D12 | Geräteliste in den Einstellungen: Personen-Geräte können jedes Gerät entfernen, jedes Gerät kann sich selbst entkoppeln. Entfernte Geräte verlieren sofort den Zugriff und landen auf der Startseite. „Dieses Gerät gehört …“ lässt eine Person ihr Gerät umstellen. | Verlorene Handys oder ein neuer Fernseher lassen sich selbst verwalten. | V11, C |
| D13 | Der Fernseher ist eine Anzeige: Er sieht immer das Board, ohne Navigation. Start- und Beitrittsseite werden auf großen Bildschirmen größer dargestellt. | Keine Bedienung am TV nötig, Code-Eingabe aus Sofa-Entfernung lesbar. | V4, C |
| D14 | Der Verlauf (`log`) darf nur ergänzt, nie geändert oder gelöscht werden. | Grundlage für spätere Statistik. | V8 |

### Aufgabenlogik

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D15 | Jede Wochenaufgabe ist eine dauerhafte Karte mit `statusWoche`. Die Anzeige berechnet den effektiven Status selbst (`js/woche.js`); das physische Zurücksetzen schreibt das nächste Handy per Transaktion. | Der Fernseher springt pünktlich um, ohne neu zu laden. | V9 |
| D16 | Wochenwechsel standardmäßig **Sonntag 20:00**, einstellbar. Eine Putzwoche bekommt die ISO-KW ihrer Mitte (bei So 20:00 die folgende Mo–So-Woche). | Familienabend als natürlicher Abschluss; eindeutige KW. | V9, C |
| D17 | Einmalige Aufgaben bleiben bis erledigt (auch übernommen über den Wechsel hinweg); erledigte verschwinden beim nächsten Wechsel. | | V10 |
| D18 | Jeder Klick auf „Erledigt“ schreibt zusätzlich einen `log`-Eintrag (ab Phase 3). | | V9 |
| D19 | Bis Phase 3 sind die Aufgaben noch **Beispiele im Speicher** und deutlich als solche markiert; Mitglieder und Geräte sind schon echt. | Layout beurteilbar, ohne halbfertige Daten zu speichern. | C |

### Gestaltung

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D20 | Board immer **dunkel**, große Schrift, drei Spalten (Offen grau, Übernommen orange, Erledigt grün), Karte mit Initiale im Farbkreis, Kopfzeile mit KW, Datum, Wechselzeitpunkt, Fortschritt und Uhr, unten Legende der Personen. Skaliert mit dem Bildschirm (1920×1080 → 20 px Grundschrift); passt eine Spalte nicht, werden ihre Karten einzeilig, dann zweispaltig. | Aus Sofa-Entfernung lesbar, ohne Scrollen. | V4, V11, C |
| D21 | Handy-Ansichten folgen dem System (hell/dunkel), Navigation unten, „Bei mir“ oben, Plus-Knopf unten rechts. | Gewohnte Bedienung am Android-Handy. | V11, C |
| D22 | Personenfarben: Christoph Blau `#3b82f6`, Sandra Lila `#a855f7`, Moira Türkis `#14b8a6`, Paula Orange `#f59e0b`, Laura Pink `#ec4899`. Die Initiale wird automatisch hell oder dunkel geschrieben. | Gut unterscheidbar auf dunklem Grund. | C |
| D23 | Akzentfarbe Teufelsrot `#ff5a4e`, dunkler Grund `#16141f` (auch Theme-Farbe), Grün `#2fbf71` für Erledigt. | Passt zu Name und Icon (Rot/Schwarz/Creme). | C |
| D24 | **App-Icon = Christophs Waschbär-Icon.** `tools/make_icons.py` erzeugt daraus: „any“-Icons mit transparenten Ecken, „maskable“-Icons (Inhalt auf 66 % verkleinert auf Creme, damit Android beim Zuschneiden nichts abschneidet) und das Apple-Icon. | Eigenes Design der Familie; Android-taugliche Varianten. | V18, C |
| D25 | Oberfläche, Doku und Bezeichner im Code auf Deutsch. | | V2 |
| D26 | Texte werden immer als Textknoten eingefügt (Helfer `el()`/`fuelle()` in `js/ui.js`, kein `innerHTML`). | Eingaben der Familie können nie als HTML ausgeführt werden. | C |

### Entwicklung und Tests

| # | Entscheidung | Warum | Quelle |
| --- | --- | --- | --- |
| D27 | Testdaten aus der Entwicklung heißen „TEST – …“ und tragen `test: true`. Nach der Einrichtung des echten Haushalts sind keine neuen Test-Haushalte mehr möglich. | Klar unterscheidbar und leicht zu löschen. | C |
| D28 | Regeln liegen in `firestore.rules` und werden mit `npx firebase-tools@15.34.0 deploy --only firestore:rules` eingespielt (Christoph meldet die CLI selbst an). Geprüft wird mit `node tools/regeln-pruefen.mjs` gegen die echte Datenbank. | Nachvollziehbar und wiederholbar. | C |
