# Discophery

Ein werbefreier, persönlicher News-Feed als Ersatz für Google Discover.  
Läuft komplett im Browser, gehostet auf GitHub Pages, Login via Google OAuth.

---

## Was ist das?

Diese App sammelt RSS-Feeds deiner Lieblingsseiten und zeigt sie als  
übersichtlichen Card-Feed — ähnlich wie Google Discover, aber:

- **Keine Werbung** — nur Titel, Bild und Quelle
- **Kein Tracking** — deine Filter bleiben lokal in deinem Browser
- **Volle Kontrolle** — du entscheidest welche Quellen reinkommen
- **Light & Dark Mode** — automatisch je nach System-Einstellung
- **Swipe to dismiss** — Artikel wegwischen die dich nicht interessieren

---

## Projektstruktur

```
discophery/
│
├── index.html          ← Einstiegspunkt, Grundgerüst der Seite
├── config.js           ← ALLE einstellbaren Parameter (Feeds, Filter, etc.)
├── auth.js             ← Google OAuth Login/Logout
├── feed.js             ← RSS-Feeds laden und parsen
├── ui.js               ← Cards rendern, Swipe, Dark Mode
├── filter.js           ← Filterregeln anwenden und speichern
│
├── style.css           ← Globales Styling, Light/Dark Mode Variablen
│
├── docs/
│   ├── requirements.md     ← Was die App können soll (Spec)
│   ├── privacy-policy.md   ← Datenschutzerklärung (für Google OAuth nötig)
│   └── terms-of-use.md     ← Nutzungsbedingungen
│
├── llms.md             ← Kontext für KI-Tools (Claude, Copilot etc.)
└── README.md           ← Diese Datei
```

---

## Schnellstart (Erstes Setup)

### 1. Repository forken oder klonen

Auf github.com: "Fork" klicken (oben rechts auf dieser Seite).

Oder lokal klonen:
```bash
git clone https://github.com/mazer666/discophery.git
```

### 2. Google OAuth einrichten

Du brauchst eine **Google Client ID** — das ist kostenlos:

1. Gehe zu [console.cloud.google.com](https://console.cloud.google.com)
2. Neues Projekt erstellen → Name z.B. "Personal Discover"
3. Linkes Menü → **APIs & Dienste** → **Anmeldedaten**
4. **Anmeldedaten erstellen** → **OAuth-Client-ID**
5. Anwendungstyp: **Webanwendung**
6. Autorisierte JavaScript-Quellen hinzufügen:
   - `https://mazer666.github.io`
   - `http://localhost` (zum lokalen Testen)
7. Die angezeigte **Client-ID** kopieren  
   (sieht aus wie `123456789-abc.apps.googleusercontent.com`)

### 3. Client ID eintragen

Öffne `config.js` und trage deine Client ID ein:

```js
GOOGLE_CLIENT_ID: 'DEINE-CLIENT-ID-HIER',
```

### 4. GitHub Pages aktivieren

1. Auf github.com → dein Repository → **Settings**
2. Linkes Menü → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / Ordner: **/ (root)**
5. Speichern — nach ca. 1 Minute ist die Seite live unter:  
   `https://mazer666.github.io/discophery`

### 5. OAuth Redirect URI nachtragen

Zurück in der Google Cloud Console:
1. Deine OAuth-Client-ID öffnen
2. Autorisierte Weiterleitungs-URIs hinzufügen:
   - `https://mazer666.github.io/discophery`
3. Speichern

---

## Eigene Feeds hinzufügen

Alle Feeds sind in `config.js` definiert. Einfach ein Objekt zur Liste hinzufügen:

```js
{
  id: 'mein-blog',           // Eindeutige ID (nur Kleinbuchstaben, keine Leerzeichen)
  name: 'Mein Blog',         // Anzeigename in der UI
  url: 'https://mein-blog.de/feed.xml',  // RSS-Feed URL
  category: 'tech',          // Kategorie für den Filter-Chip oben
  language: 'de',            // 'de' oder 'en'
}
```

**Tipp:** Die meisten Seiten haben einen RSS-Feed unter `/feed`, `/rss` oder `/feed.xml`.

---

## Lokal testen

Da die App RSS-Feeds von anderen Domains lädt, brauchst du einen lokalen Server.  
Direktes Öffnen der HTML-Datei funktioniert wegen Browser-Sicherheit (CORS) nicht.

**Option A — VS Code (empfohlen):**
1. Extension "Live Server" installieren
2. Rechtsklick auf `index.html` → "Open with Live Server"

**Option B — Python (falls installiert):**
```bash
cd discophery
python3 -m http.server 8000
# Dann im Browser: http://localhost:8000
```

---

## Häufige Fragen

**Werden meine Filter irgendwo hochgeladen?**  
Nein. Alle Filter und Einstellungen bleiben lokal in deinem Browser (localStorage).

**Wie oft aktualisiert sich der Feed?**  
Beim Laden der Seite und alle 30 Minuten automatisch (einstellbar in `config.js`).

**Kann ich die App ohne Google-Login nutzen?**  
Ja — in `config.js` kannst du `AUTH_REQUIRED: false` setzen.

---

## Technischer Stack

| Was | Womit | Warum |
|-----|-------|-------|
| Sprache | Vanilla JavaScript (ES6+) | Kein Build-Tool nötig, direkt lesbar |
| Styling | CSS Custom Properties | Light/Dark Mode ohne JavaScript |
| RSS parsen | Browser-nativer DOMParser | Keine externe Bibliothek nötig |
| CORS-Proxy | allorigins.win | RSS-Feeds können nicht direkt geladen werden |
| Auth | Google Identity Services | Kostenlos, sicher, weit verbreitet |
| Hosting | GitHub Pages | Kostenlos, direkt aus dem Repo |
| Datenspeicher | localStorage | Kein Backend, kein Server nötig |

---

## Lizenz

MIT — mach damit was du willst.
