# Discophery

Ein werbefreier, persönlicher News-Feed als Ersatz für Google Discover.  
Modernisiertes Setup mit **Vite**, **TypeScript** und **PWA**-Unterstützung.

---

## 🚀 Was ist Discophery?

Diese App aggregiert RSS-Feeds deiner Lieblingsseiten und präsentiert sie in einem übersichtlichen Card-Design. Inspiriert von Google Discover, aber mit Fokus auf Datenschutz und Kontrolle.

- **Keine Werbung** — Rein redaktionelle Inhalte ohne Tracking.
- **Privacy First** — Alle Einstellungen, Filter und Interaktionen bleiben lokal im Browser (`localStorage`).
- **Paywall-Erkennung** — Automatische Markierung von Inhalten hinter Bezahlschranken.
- **Offline-Ready** — Dank Service-Worker auch ohne aktive Internetverbindung nutzbar.
- **Voll anpassbar** — Integrierter Feed-Manager für Katalog- und benutzerdefinierte Feeds.
- **Streaming-Neu-Feeds** — Neue Inhalte bei Amazon Prime, Netflix, Disney+, Apple TV+, Filmfriend, MagentaTV und Netzkino (via werstreamt.es, 2× täglich aktualisiert).

---

## 🛠 Technischer Stack

- **Framework**: Kein Framework (Vanilla UI-Logik) für maximale Performance.
- **Build-Tool**: [Vite](https://vitejs.dev/) für schnelles Development und optimierte Bundles.
- **Sprache**: [TypeScript](https://www.typescriptlang.org/) für Typsicherheit und Wartbarkeit.
- **Styling**: CSS Custom Properties (Variables) mit Support für Dark/Light Mode.
- **Datenquelle**: Rein clientseitig. Alle Feeds (RSS/Atom-Feeds sowie Streaming-Inhalte) werden direkt und parallel über einen CORS-Proxy (`allorigins.win` oder Fallback) geladen und im Browser geparst. Keine serverseitigen Updates erforderlich.

---

## 🏃 Schnellstart

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/mazer666/discophery.git
cd discophery
npm install
```

### 2. Entwicklungsserver starten
```bash
npm run dev
```
Die App ist nun unter `http://localhost:5173` erreichbar.

### 3. Build für Produktion
```bash
npm run build
```
Das fertige Projekt liegt im Ordner `docs/` (optimiert für GitHub Pages).

---

## 📂 Projektstruktur

```
discophery/
├── src/                ← TypeScript Quellcode
│   ├── main.ts         ← Einstiegspunkt
│   ├── config.ts       ← Zentrale Konfiguration (Feeds, Timeouts)
│   ├── feed.ts         ← Feed-Loader & Parser
│   ├── ui.ts           ← UI-Logik & Event-Handling
│   └── ...
├── public/             ← Statische Assets (Icons, Manifest, leere feeds.json)
├── scripts/            ← Hilfs- und Migrationsskripte
├── archive/            ← Veraltete Dokumentation und Code-Relikte
├── index.html          ← HTML-Grundgerüst
└── vite.config.ts      ← Vite Konfiguration
```

---

## 📜 Lizenz

MIT — Frei für private und kommerzielle Nutzung.
