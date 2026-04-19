# LLM Context — Discophery

Diese Datei gibt KI-Assistenten (Claude, GitHub Copilot, etc.) den nötigen Kontext  
um sinnvolle Hilfe bei diesem Projekt leisten zu können.

---

## Was ist dieses Projekt?

Eine Single-Page-App (SPA) die RSS-Feeds aggregiert und als Card-Feed darstellt.  
Kein Framework, kein Build-Tool — reines HTML, CSS und JavaScript (ES6+).  
Gehostet auf GitHub Pages. Auth via Google OAuth (Google Identity Services).

**Zielgruppe des Entwicklers:** Technik-interessierter Nicht-Programmierer.  
Code muss deshalb ausführlich kommentiert sein — jede Funktion erklärt was und warum.

---

## Architektur-Entscheidungen

### Warum kein Framework (React, Vue, etc.)?
- Kein Build-Schritt nötig → direktes Deployment auf GitHub Pages
- Jede Zeile Code ist ohne Toolchain lesbar und verstehbar
- Für diesen Use-Case ausreichend

### Warum kein TypeScript?
- Würde einen Compile-Schritt erfordern
- JSDoc-Kommentare liefern ausreichend Typsicherheit für diesen Umfang

### Warum localStorage statt Datenbank?
- Kein Backend nötig → kein Server, keine Kosten, keine Wartung
- Filter/Präferenzen sind gerätespezifisch, das ist gewünscht

### Warum allorigins.win als CORS-Proxy (nur Fallback!)?
- Früher war dies die primäre Datenquelle. Jetzt läuft eine GitHub Action alle 5 Minuten (`scripts/fetch_feeds.py`) und generiert `data/feeds.json`.
- `allorigins.win` wird nur noch als Client-Fallback für unbekannte Custom-Feeds verwendet, die nicht zur Compile-Zeit im `feeds.js` hinterlegt waren.

### Warum Google Identity Services statt Firebase Auth?
- Kein Firebase-Setup nötig
- Läuft komplett client-seitig
- Eine einzige Script-Zeile reicht für den Login

---

## Dateistruktur und Verantwortlichkeiten

```
index.html    — HTML-Skeleton, lädt alle Scripts und Styles
config.js     — Einzige Datei die der User anfassen muss (Feeds, Einstellungen)
auth.js       — Google OAuth: Login, Logout, User-State prüfen
feed.js       — RSS-Feeds via CORS-Proxy laden, XML parsen, normalisieren
filter.js     — Filterregeln lesen/schreiben (localStorage), auf Artikel anwenden
ui.js         — DOM manipulieren: Cards rendern, Swipe-Gesten, Chips, Modal
style.css     — CSS Custom Properties für Light/Dark Mode, Card-Layout, Animationen
```

**Wichtige Regel:** Jede Datei bleibt unter 500 Zeilen.  
Wenn eine Datei zu groß wird, eine neue mit klarer Verantwortlichkeit aufteilen.

---

## Datenfluss

```
1. Seite lädt
   └─> auth.js prüft ob User eingeloggt ist
       ├─> Nicht eingeloggt: Login-Screen zeigen
       └─> Eingeloggt: feed.js starten

2. feed.js läuft
   └─> Für jeden Feed in config.js:
       ├─> URL durch CORS-Proxy schicken
       ├─> XML-Antwort parsen
       └─> Artikel normalisieren zu einheitlichem Objekt:
           { id, title, url, image, source, date, category }

3. filter.js läuft
   └─> Für jeden Artikel:
       ├─> Geblockte Keywords prüfen (→ Artikel ausblenden)
       ├─> Geblockte Quellen prüfen (→ Artikel ausblenden)
       └─> Artikel-Score berechnen (für spätere Sortierung)

4. ui.js rendert
   └─> Artikel als Cards in den DOM schreiben
       ├─> Swipe-Listener auf jede Card
       └─> Filter-Button auf jeder Card
```

---

## Datenformat — Normalisierter Artikel

Alle RSS-Feeds werden in dieses einheitliche Format konvertiert:

```js
{
  id: String,          // Hash aus URL (eindeutige ID)
  title: String,       // Artikeltitel
  url: String,         // Original-URL des Artikels
  image: String|null,  // URL des Vorschaubilds (oder null)
  description: String, // Kurzbeschreibung (max. 200 Zeichen, kein HTML)
  source: String,      // Anzeigename der Quelle (aus config.js)
  sourceId: String,    // ID der Quelle (aus config.js)
  category: String,    // Kategorie (aus config.js)
  date: Date,          // Veröffentlichungsdatum
  dismissed: Boolean,  // Wurde weggewischt? (localStorage)
}
```

---

## localStorage Struktur

```js
// Geblockte Quellen (Array von Source-IDs)
'discophery_blocked_sources': '["golem","android-central"]'

// Geblockte Keywords (Array von Strings)
'discophery_blocked_keywords': '["werbung","angebot","sponsored"]'

// Weggewischte Artikel (Array von Artikel-IDs, max. 500 Einträge)
'discophery_dismissed': '["abc123","def456"]'

// User-Einstellungen
'discophery_settings': '{"autoRefresh": true, "refreshInterval": 30}'

// Letzter Refresh-Zeitpunkt (Unix Timestamp)
'discophery_last_refresh': '1712345678'
```

---

## Coding-Regeln für dieses Projekt

1. **Kommentare auf Deutsch** für UI-nahe Erklärungen, auf Englisch für technische Details
2. **JSDoc für alle Funktionen** — Parameter und Rückgabewert immer dokumentieren
3. **Keine globalen Variablen** — alles in Modulen oder klar benannten Objekten
4. **Fehlerbehandlung** — jeder fetch()-Aufruf hat einen try/catch
5. **Kein innerHTML mit User-Daten** — immer textContent oder DOM-Methoden nutzen (XSS-Schutz)
6. **Max. 500 Zeilen pro Datei** — lieber eine neue Datei aufmachen
7. **Keine externen Bibliotheken** außer Google Identity Services

---

## Bekannte Limitierungen

- **CORS-Proxy (nur Custom Feeds):** Fallback greift nur bei selbst hinzugefügten Feeds. Alle Standard-Feeds kommen blitzschnell via GitHub Action aus `data/feeds.json`.
- **Bilder:** Nicht alle RSS-Feeds liefern Vorschaubilder. Fallback: Quell-Logo.
- **Rate Limiting:** Zu viele Feeds gleichzeitig können den CORS-Proxy überlasten.  
  Feeds werden deshalb sequenziell mit 200ms Pause geladen.
- **Google RSS:** Google News RSS-Feeds haben manchmal Google-Redirect-URLs.  
  feed.js enthält eine Funktion zum Auflösen dieser URLs.

---

## Erweiterungsideen (noch nicht implementiert)

- Service Worker für Offline-Unterstützung
- Web Share API für "Teilen"-Button auf Mobile
- Keyboard-Shortcuts für Desktop
- Export/Import der Filter-Einstellungen als JSON
- Mehrere Profile (z.B. "Arbeit" und "Freizeit")
