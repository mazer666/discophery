# Requirements Specification — Discophery

Version: 1.0  
Stand: April 2026  
Status: In Planung

---

## 1. Projektziel

Eine persönliche, werbefreie News-App die im Browser läuft und RSS-Feeds  
als Card-Feed ähnlich Google Discover anzeigt. Keine Algorithmen von Dritten,  
keine Werbung, volle Kontrolle über Inhalte.

---

## 2. Nutzer

**Primärnutzer:** Eine Person (Betreiber der Seite).  
**Sekundärnutzer:** Weitere Personen die sich per Google-Account einloggen  
(optional, konfigurierbar).

Technisches Level: Nicht-Programmierer. Die App muss ohne Kommandozeile  
bedienbar sein. Einrichtung erfordert einmalige technische Schritte (OAuth-Setup),  
die durch die README vollständig erklärt werden.

---

## 3. Funktionale Anforderungen

### 3.1 Authentifizierung

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| A1 | Login mit Google-Account via OAuth 2.0 | Hoch |
| A2 | Automatischer Login wenn Session noch gültig | Hoch |
| A3 | Logout-Button sichtbar nach dem Login | Mittel |
| A4 | AUTH_REQUIRED in config.js deaktivierbar | Niedrig |
| A5 | Filter und Einstellungen sind pro Browser gespeichert | Hoch |

### 3.2 Feed laden

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F1 | RSS-Feeds der konfigurierten Quellen laden | Hoch |
| F2 | Google News RSS laden (Themen konfigurierbar) | Hoch |
| F3 | Feeds beim Start der Seite automatisch laden | Hoch |
| F4 | Automatisches Nachladen alle X Minuten (konfigurierbar) | Mittel |
| F5 | Manueller "Aktualisieren"-Button | Mittel |
| F6 | Fehlerhafte Feeds überspringen ohne Absturz | Hoch |
| F7 | Ladeindikator während Feeds geladen werden | Mittel |
| F8 | Bereits gelesene/weggewischte Artikel nicht nochmal zeigen | Hoch |

### 3.3 Artikel anzeigen

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| D1 | Artikel als Cards im Grid-Layout anzeigen | Hoch |
| D2 | Jede Card zeigt: Titel, Quelle, Datum, Vorschaubild | Hoch |
| D3 | Klick auf Card öffnet Original-Artikel in neuem Tab | Hoch |
| D4 | Fallback-Bild wenn kein Vorschaubild vorhanden | Mittel |
| D5 | Datum als relatives Format: "vor 2 Stunden", "gestern" | Niedrig |
| D6 | Quell-Kategorie als farbiger Chip auf der Card | Niedrig |

### 3.4 Filtern und Steuern

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F1 | Card wegwischen (Swipe links/rechts auf Mobile) | Hoch |
| F2 | Dismiss-Button auf Card für Desktop | Hoch |
| F3 | "Weniger davon"-Button auf jeder Card | Hoch |
| F4 | "Weniger davon" öffnet Mini-Menü mit Optionen: | Hoch |
|    | → "Quelle blockieren" (nie mehr Artikel von dieser Seite) | Hoch |
|    | → "Keyword blockieren" (Wort aus Titel blockieren) | Hoch |
|    | → "Kategorie ausblenden" | Mittel |
| F5 | Filter-Chips oben zum schnellen Filtern nach Kategorie | Mittel |
| F6 | Einstellungsseite zum Verwalten aller aktiven Filter | Mittel |
| F7 | Filter einzeln deaktivieren oder löschen | Mittel |
| F8 | Alle weggewischten Artikel zurücksetzen | Niedrig |

### 3.5 Einstellungen

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| E1 | Alle Einstellungen in config.js konfigurierbar | Hoch |
| E2 | Feeds hinzufügen/entfernen ohne Code-Kenntnisse | Hoch |
| E3 | Refresh-Intervall einstellbar | Mittel |
| E4 | Maximale Anzahl Artikel pro Feed einstellbar | Mittel |
| E5 | CORS-Proxy URL einstellbar (Fallback) | Mittel |

---

## 4. Nicht-Funktionale Anforderungen

### 4.1 Performance

- Initiales Laden: Erste Cards sichtbar innerhalb 3 Sekunden
- Feeds werden parallel geladen (Promise.allSettled)
- Bilder lazy-loaded (nur wenn im Viewport)
- Keine externen Bibliotheken die die Ladezeit erhöhen

### 4.2 Wartbarkeit

- Jede JS-Datei max. 500 Zeilen
- Jede Funktion hat einen JSDoc-Kommentar
- Kommentare erklären das "Warum", nicht nur das "Was"
- config.js ist die einzige Datei die ein Nicht-Programmierer anfassen muss

### 4.3 Datenschutz & Sicherheit

- Keine Analytics, kein Tracking
- Keine User-Daten werden an externe Server gesendet (außer für OAuth)
- Filter und Einstellungen bleiben lokal im Browser (localStorage)
- Kein innerHTML mit externen Daten (XSS-Schutz)
- Content Security Policy Header wo möglich

### 4.4 Kompatibilität

- Funktioniert in: Chrome, Firefox, Safari (aktuelle Versionen)
- Mobile-first: Optimiert für Android-Browser (DuckDuckGo Browser)
- Swipe-Gesten funktionieren auf Touch-Geräten
- Auch auf Desktop (Maus) vollständig bedienbar

---

## 5. UI / UX Anforderungen

### 5.1 Visuelles Design

- Card-Feed Layout (2 Spalten auf Mobile, 3-4 auf Desktop)
- Sauberes, minimalistisches Design ohne Ablenkung
- Keine Werbebanner, keine Cookie-Banner, keine Popups
- Konsistente Typografie und Abstände

### 5.2 Dark / Light Mode

- Automatische Erkennung der System-Einstellung (`prefers-color-scheme`)
- Kein manueller Toggle nötig (folgt dem System)
- Alle Farben als CSS Custom Properties definiert

### 5.3 Sprache

- UI-Texte auf Deutsch (Buttons, Labels, Meldungen)
- Code, Kommentare, Variablennamen auf Englisch

### 5.4 Interaktion Mobile

- Cards haben ausreichend große Tap-Targets (min. 44x44px)
- Swipe-Geste zum Dismissen fühlt sich nativ an
- "Weniger davon"-Button leicht erreichbar (Bottom-Sheet oder Context-Menu)

---

## 6. Technische Constraints

- Kein Build-Tool (kein Webpack, Vite, etc.)
- Kein npm / node_modules
- Kein Backend / kein Server (außer GitHub Pages Static Hosting)
- Vanilla JavaScript ES6+ mit JSDoc
- Einzige erlaubte externe Scripts:
  - Google Identity Services (`accounts.google.com/gsi/client`)
  - CORS-Proxy (allorigins.win) — nur für API-Calls, nicht als Script

---

## 7. Vorkonfigurierte Feeds (Startkonfiguration)

| Name | URL | Kategorie | Sprache |
|------|-----|-----------|---------|
| Golem.de | https://rss.golem.de/rss.php?feed=RSS2.0 | Tech | DE |
| Android Central | https://www.androidcentral.com/rss.xml | Android | EN |
| mobi-blog.org | https://www.mobi-blog.org/feed | Mobile | DE |
| amazona.de | https://www.amazona.de/feed | Musik | DE |
| Geeky Gadgets | https://www.geeky-gadgets.com/feed | Gadgets | EN |
| musikreviews.de | https://www.musikreviews.de/rss.xml | Musik | DE |
| Geeks Are Sexy | https://www.geeksaresexy.net/feed | Tech | EN |
| likecool.com | https://www.likecool.com/rss.xml | Design | EN |
| Google News Tech | https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlBQVAB | Tech | DE |

---

## 8. Out of Scope (bewusst nicht gebaut)

- Artikel-Volltext in der App lesen (öffnet immer Original)
- Soziale Features (Kommentare, Teilen innerhalb der App)
- Push-Notifications
- Mehrere Nutzerprofile
- Native Mobile App
- Server-seitiges Rendering
- Eigener CORS-Proxy Server

---

## 9. Offene Fragen

| # | Frage | Status |
|---|-------|--------|
| 1 | Sollen weggewischte Artikel nach X Tagen wieder erscheinen? | Offen |
| 2 | Maximale Anzahl gespeicherter dismissed IDs in localStorage? | Vorschlag: 500 |
| 3 | Sollen Feeds priorisierbar sein (Reihenfolge manuell)? | Offen |
| 4 | Google News RSS: welche Themenbereiche vorkonfigurieren? | Offen |
