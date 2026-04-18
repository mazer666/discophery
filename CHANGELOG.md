# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [Unreleased] - April 2026

### Architektur-Update
- **GitHub Action Pre-Fetcher:** Es wurde ein serverseitiges Script (`scripts/fetch_feeds.py`) plus GitHub Action (`.github/workflows/fetch.yml`) hinzugefügt. Die Action stündlich/minütlich alle konfigurierten Feeds und legt sie unter `data/feeds.json` als Cache ab.
- **Client-Optimierung:** `feed.js` lädt nun primär das vorkompilierte `feeds.json`. Nur benutzerdefinierte oder fehlende Feeds triggern noch den langsamen allorigins / corsproxy Fallback. 

### UI & UX
- **Card-basiertes Settings-Modal:** Die Einstellungsseite wurde komplett auf ein modernes Glassmorphism-Design mit Karten umgestellt. Toggles und Auswahllisten sind nun viel prominenter.
- **Top-Bar Redesign:** Das unnötige Padding zwischen den Elementen wurde komprimiert, das Layout wirkt aufgeräumter.
- **Lokale Suchfunktion:** In der Kopfzeile gibt es nun eine Artikel-Suche, um die bereits geladenen Cards live nach Titel oder Quelle zu filtern.
- **Progressives Rendering:** Sichtbar bessere `Time-to-first-Byte`. Der erste Feed der antwortet wird sofort gerendert, unabhänig von laggenden Quellen.

### Features
- **Sortierfunktion:** Nutzer können in den Einstellungen nun auf "Älteste zuerst" umschalten.
- **Erweitertes Feed-Manager Modul:** Ein Klick auf den Quell-Namen im Feed-Manager triggert sofort einen Filter auf diese Quelle und schließt den Manager.
- **Offline & Cache-Update:** PWA Service Worker (Cache v9) ist aktiv.
