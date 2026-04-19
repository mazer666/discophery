# Projekt-Anforderungen (Requirements) — Discophery

Diese Liste definiert den aktuellen Funktionsumfang und die technischen Vorgaben für das Projekt "Discophery".

## 1. Kernfunktionalität

### 1.1 Nachrichten-Aggregation
- Die App muss RSS- und Atom-Feeds einlesen können.
- Die Feeds müssen in einer einheitlichen Card-Ansicht dargestellt werden.
- Jeder Artikel muss mindestens Titel, Quelle, Datum und (wenn vorhanden) ein Vorschaubild enthalten.

### 1.2 Feed-Management
- Nutzer können Feeds aus einem vordefinierten Katalog auswählen (An-/Ausschalten).
- Nutzer können eigene RSS-URLs hinzufügen (Custom Feeds).
- Alle Feed-Einstellungen müssen persistent im Browser gespeichert werden.

### 1.3 Filter & Sortierung
- Artikel müssen nach Titeln oder Quellen durchsucht werden können.
- Es muss eine Möglichkeit geben, Artikel dauerhaft auszublenden (Swipe-to-dismiss).
- Die Sortierung (Neueste zuerst / Älteste zuerst) muss einstellbar sein.
- Ein Keyword-Filter muss Artikel mit unerwünschten Begriffen (z.B. "Werbung", "Angebot") automatisch ausblenden.

### 1.4 Paywall-Erkennung
- Die App muss gängige Paywall-Indikatoren in Titeln (z.B. "G+", "Plus", "Abo") erkennen.
- Paywall-Artikel müssen visuell markiert werden.
- Nutzer können entscheiden, Paywall-Artikel komplett auszublenden.

---

## 2. Benutzererfahrung (UX)

### 2.1 Design
- Modernes, aufgeräumtes Layout (Glassmorphism-Elemente).
- Volle Unterstützung für Dark Mode und Light Mode (automatisch oder manuell).
- Responsive Design für Mobile, Tablet und Desktop.

### 2.2 Performance
- Schnelle Ladezeiten durch Hybrid-Loading (Pre-fetched JSON + Proxy-Fallback).
- Progressives Rendering: Artikel werden angezeigt, sobald sie geladen sind.
- Minimale Bundle-Größe durch Verzicht auf schwere Frameworks.

### 2.3 Offline-Fähigkeit
- Die App muss als Progressive Web App (PWA) installierbar sein.
- Bereits geladene Artikel müssen offline verfügbar bleiben.

---

## 3. Technische Anforderungen

### 3.1 Build & Deployment
- Verwendung von **Vite** als Build-System.
- **TypeScript** für den gesamten Quellcode.
- Automatisches Deployment auf **GitHub Pages**.

### 3.2 Datenschutz
- 100% Client-seitige Verarbeitung.
- Kein Tracking, keine Cookies (außer Google Auth).
- Alle Benutzerdaten verbleiben im `localStorage`.

### 3.3 Sicherheit
- Schutz vor XSS durch strikte Vermeidung von `innerHTML`.
- Sicheres Handling von Google OAuth Tokens.
- Verwendung von `DOMParser` für isoliertes XML-Parsing.

---

## 4. Infrastruktur
- **GitHub Actions**: Stündlicher Pre-Fetcher-Lauf zur Aktualisierung von `data/feeds.json`.
- **CORS-Proxy**: Nutzung von `allorigins.win` oder `corsproxy.io` für direkte Browser-Anfragen an Feed-Provider.
