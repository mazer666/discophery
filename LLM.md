# LLM Context — Discophery

Diese Datei bietet KI-Assistenten (Claude, ChatGPT, Copilot) den nötigen Kontext, um fundierte Hilfe bei der Entwicklung dieses Projekts zu leisten.

---

## 🎯 Projekt-Ziel
Ein persönlicher, werbefreier News-Feed als Single-Page-App (SPA). Fokus auf Schnelligkeit, Datenschutz und einfache Erweiterbarkeit.

---

## 🏗 Architektur & Tech-Stack

### Core
- **Vite & TypeScript**: Das Projekt nutzt Vite als Build-Tool und TypeScript für Typsicherheit.
- **Kein UI-Framework**: Es wird bewusst kein React, Vue oder Angular genutzt, um die App leichtgewichtig zu halten. Die UI-Manipulation erfolgt direkt über das DOM.
- **PWA**: Ein Service Worker verwaltet das Caching der Assets und sorgt für Offline-Fähigkeit.

### Datenfluss
1. **Initialisierung**: `main.ts` lädt, `auth.ts` prüft den Login-Status.
2. **Datenabruf**: `feed.ts` lädt primär die vorkompilierte `data/feeds.json` (wird stündlich per GitHub Action aktualisiert).
3. **Fallback**: Falls `feeds.json` nicht verfügbar ist oder ein individueller Feed geladen wird, erfolgt der Abruf über einen CORS-Proxy (`allorigins.win`).
4. **Verarbeitung**: RSS/Atom-XML wird mit dem nativen `DOMParser` geparst und normalisiert.
5. **Filterung**: `filter.ts` wendet Keyword- und Source-Filter auf die Artikel an.
6. **Rendering**: `ui-cards.ts` generiert die HTML-Cards und fügt sie in den DOM ein.

### Speicher
- **localStorage**: Alle Benutzereinstellungen (aktive Feeds, ausgeblendete Artikel, Filter) werden lokal gespeichert. Es gibt kein Datenbank-Backend.

---

## 📁 Dateistruktur (src/)
- `config.ts`: Zentrale Konfiguration und Typ-Definitionen.
- `feed.ts`: Logik zum Laden und Parsen von RSS-Feeds.
- `feeds.ts`: Der statische Katalog der verfügbaren Feeds.
- `ui.ts`: Globales UI-Handling (Modals, Toggles, Suche).
- `ui-cards.ts`: Spezialisiert auf das Rendern der Nachrichten-Karten.
- `feed-manager.ts`: Logik zur Verwaltung der abonnierten Feeds.
- `filter.ts`: Filterregeln und Paywall-Erkennung.

---

## 📜 Coding-Regeln
1. **Kommentare auf Deutsch**: Erklärungen für den Anwender (User-Stories) auf Deutsch, rein technische Implementierungsdetails in Englisch.
2. **Kein innerHTML**: Aus Sicherheitsgründen (XSS) immer `textContent` oder DOM-Element-Erzeugung nutzen.
3. **Explizite Typisierung**: Da wir TypeScript nutzen, sollten Interfaces und Types konsequent verwendet werden.
4. **Fehlertoleranz**: Feed-Ladevorgänge müssen isoliert sein (`Promise.allSettled`), damit ein defekter Feed nicht die gesamte App blockiert.
5. **Performance**: DOM-Manipulationen sollten so gering wie möglich gehalten werden (z.B. DocumentFragment nutzen).

---

## 🛠 Bekannte Besonderheiten
- **Paywall-Labeling**: Die App erkennt Paywall-Marker (z.B. (g+), [plus]) im Titel/Text und markiert diese Artikel visuell.
- **Google News URLs**: Google-News-RSS-Links werden serverseitig aufgelöst, um direkte Klicks zu ermöglichen.
- **CORS-Hürde**: Ohne Proxy können RSS-Feeds nicht direkt im Browser geladen werden.
