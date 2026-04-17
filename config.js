/**
 * @fileoverview Discophery — Zentrale Konfiguration
 *
 * Diese Datei ist die EINZIGE Datei die du als Nicht-Programmierer bearbeiten musst.
 * Feeds hinzufügen, OAuth einrichten, Verhalten anpassen — alles hier.
 *
 * WICHTIG: Nach Änderungen die Seite im Browser neu laden (F5).
 *
 * Projektregeln:
 *  - Keine Magic Numbers außerhalb dieser Datei
 *  - Kommentare auf Deutsch für alles User-relevante
 *  - Technische Keys und Werte bleiben auf Englisch
 */

/**
 * @typedef {Object} FeedConfig
 * @property {string}  id       - Eindeutige ID (Kleinbuchstaben, Bindestriche erlaubt)
 * @property {string}  name     - Anzeigename wie er in der UI erscheint
 * @property {string}  url      - Vollständige RSS/Atom-Feed URL
 * @property {string}  category - Muss ein Schlüssel aus CONFIG.CATEGORIES sein
 * @property {string}  language - Sprache des Inhalts: 'de' oder 'en'
 * @property {boolean} enabled  - false = Feed wird übersprungen ohne ihn zu löschen
 */

/**
 * @typedef {Object} CategoryStyle
 * @property {string} bg   - Hintergrundfarbe des Kategorie-Chips (CSS-Farbwert)
 * @property {string} text - Textfarbe des Kategorie-Chips (CSS-Farbwert)
 */

/**
 * Zentrale Konfiguration der Discophery App.
 *
 * Alle Einstellungen, URLs, Timeouts und Feature-Flags leben hier.
 * Andere Dateien (feed.js, auth.js, ui.js) lesen nur aus diesem Objekt —
 * sie schreiben nie hinein. Das macht Anpassungen vorhersehbar und sicher.
 *
 * @type {Object}
 * @namespace CONFIG
 */
const CONFIG = {

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE OAUTH
  // Einmalig einrichten, dann nie wieder anfassen.
  // Anleitung: README.md → Abschnitt "Google OAuth einrichten"
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Deine Google OAuth 2.0 Client ID.
   *
   * So erhältst du sie (kostenlos, ca. 5 Minuten):
   *   1. console.cloud.google.com → Neues Projekt → "discophery"
   *   2. APIs & Dienste → Anmeldedaten → OAuth-Client-ID erstellen
   *   3. Anwendungstyp: Webanwendung
   *   4. Autorisierte JavaScript-Quellen: https://mazer666.github.io + http://localhost
   *   5. Die generierte ID unten eintragen (Format: 123456-abc.apps.googleusercontent.com)
   *
   * SICHERHEITSHINWEIS (Sam): Die Client ID ist kein Geheimnis — sie steht im
   * Quelltext und das ist bei OAuth für SPAs so vorgesehen. Der eigentliche
   * Schutz läuft über die autorisierten Domains in der Google Cloud Console.
   *
   * @type {string}
   */
  GOOGLE_CLIENT_ID: '528050138023-cenaoksa4vc3o67mtras7nf4t6r1b4rc.apps.googleusercontent.com',

  /**
   * Steuert ob ein Google-Login Pflicht ist.
   *
   * true  → Login-Screen wird angezeigt, App startet erst nach Anmeldung.
   * false → App startet sofort ohne Login (nützlich für lokale Entwicklung).
   *
   * Empfehlung: true für den produktiven Einsatz auf GitHub Pages.
   *
   * @type {boolean}
   */
  AUTH_REQUIRED: true,

  // ═══════════════════════════════════════════════════════════════════════════
  // CORS-PROXY
  // Browser blockieren direkte Anfragen an fremde Domains (CORS-Policy).
  // Der Proxy leitet die Anfrage serverseitig weiter — ohne ihn keine Feeds.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Primärer CORS-Proxy.
   *
   * Antwortformat von allorigins.win:
   *   { contents: "<rss>...</rss>", status: { url: "...", content_type: "..." } }
   *
   * Die URL des gewünschten Feeds wird URL-encoded ans Ende angehängt:
   *   PROXY_PRIMARY + encodeURIComponent(feedUrl)
   *
   * @type {string}
   */
  PROXY_PRIMARY: 'https://api.allorigins.win/get?url=',

  /**
   * Fallback-Proxy falls der primäre Proxy nicht antwortet.
   *
   * Antwortformat von corsproxy.io: direkt der RSS-Text (kein JSON-Wrapper).
   * feed.js erkennt den Proxy anhand der URL und parst entsprechend.
   *
   * @type {string}
   */
  PROXY_FALLBACK: 'https://corsproxy.io/?',

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMING & PERFORMANCE
  // Wann wird geladen, wie lange gewartet, wie viel auf einmal?
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Automatisches Neuladen aller Feeds alle X Minuten.
   *
   * 0 = kein automatisches Neuladen (nur beim Seitenstart und manuell).
   * 30 Minuten ist sinnvoll — die meisten RSS-Feeds aktualisieren sich nicht öfter.
   *
   * @type {number}
   */
  REFRESH_INTERVAL_MINUTES: 30,

  /**
   * Maximale Wartezeit pro einzelnem Feed-Request in Millisekunden.
   *
   * Nach dieser Zeit gilt der Request als fehlgeschlagen und wird übersprungen —
   * die anderen Feeds werden trotzdem weiter geladen (kein totaler Absturz).
   * 8 Sekunden: großzügig genug für langsame Verbindungen, kurz genug um nicht ewig zu hängen.
   *
   * @type {number}
   */
  FETCH_TIMEOUT_MS: 8000,

  /**
   * Pause zwischen zwei aufeinanderfolgenden Feed-Requests in Millisekunden.
   *
   * Verhindert dass der CORS-Proxy bei vielen Feeds gleichzeitig überlastet wird.
   * Feeds werden sequenziell mit dieser Pause dazwischen geladen.
   * 200ms Pause = bei 13 Feeds ca. 2,6 Sekunden Gesamtverzögerung — akzeptabel.
   *
   * @type {number}
   */
  FETCH_DELAY_BETWEEN_FEEDS_MS: 200,

  /**
   * Maximale Anzahl Artikel die pro Feed geladen und verarbeitet werden.
   *
   * RSS-Feeds liefern oft 20–50 Einträge. Wir begrenzen auf 15 um die
   * erste Ansicht übersichtlich zu halten und Ladezeit kurz zu halten.
   *
   * @type {number}
   */
  MAX_ARTICLES_PER_FEED: 15,

  /**
   * Maximale Anzahl gespeicherter "weggewischter" Artikel-IDs im localStorage.
   *
   * Älteste Einträge werden entfernt sobald das Limit erreicht ist (FIFO).
   * 500 IDs benötigen ca. 25 KB localStorage — weit unter dem Browser-Limit (5–10 MB).
   *
   * @type {number}
   */
  MAX_DISMISSED_STORED: 500,

  /**
   * Maximale Zeichenanzahl für den Beschreibungstext auf einer Card.
   *
   * Längere Texte werden abgeschnitten und mit "…" abgeschlossen.
   * 200 Zeichen passen gut in eine Card ohne dass sie zu groß wird.
   *
   * @type {number}
   */
  DESCRIPTION_MAX_LENGTH: 200,

  // ═══════════════════════════════════════════════════════════════════════════
  // STORAGE KEYS
  // Eindeutige Schlüsselnamen für localStorage.
  // Der "discophery_"-Präfix verhindert Konflikte mit anderen Apps im Browser.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Alle localStorage-Schlüsselnamen an einem Ort.
   *
   * Warum nicht direkt die Strings verwenden?
   * → Tippfehler in einem Key würden still zu Bugs führen.
   *   Mit diesem Objekt wirft der Browser sofort einen Fehler wenn ein Key fehlt.
   *
   * @type {Object.<string, string>}
   */
  STORAGE_KEYS: {
    /** Array von Source-IDs deren Artikel nie angezeigt werden sollen */
    BLOCKED_SOURCES:  'discophery_blocked_sources',
    /** Array von Strings — Artikel die einen dieser Begriffe im Titel haben werden ausgeblendet */
    BLOCKED_KEYWORDS: 'discophery_blocked_keywords',
    /** Array von Artikel-IDs die der User weggewischt hat */
    DISMISSED:        'discophery_dismissed',
    /** Objekt mit persistierten User-Einstellungen */
    SETTINGS:         'discophery_settings',
    /** Unix-Timestamp des letzten erfolgreichen Refresh */
    LAST_REFRESH:     'discophery_last_refresh',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KATEGORIE-FARBEN
  // Farbcodierung für Filter-Chips und Card-Labels.
  // Alle Farben sind gedämpft und funktionieren in Light UND Dark Mode.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Visuelle Stile pro Kategorie.
   *
   * bg:   Hintergrundfarbe des Kategorie-Labels
   * text: Schriftfarbe des Kategorie-Labels
   *
   * Bewusst dunkle Hintergründe gewählt — sie funktionieren auf hellen UND
   * dunklen Card-Hintergründen. ui.js setzt diese als CSS Custom Properties
   * direkt auf das Card-Element (--cat-bg, --cat-text).
   *
   * @type {Object.<string, CategoryStyle>}
   */
  CATEGORIES: {
    tech:    { bg: '#1a3a5c', text: '#7eb8f7' },  // Blau       — Technologie & IT
    android: { bg: '#1a3d2b', text: '#6fcf97' },  // Grün       — Android-spezifisch
    mobile:  { bg: '#2d2a1e', text: '#f2c94c' },  // Bernstein  — Mobile allgemein
    musik:   { bg: '#3d1a2d', text: '#eb5aae' },  // Pink       — Musik & Audio
    gadgets: { bg: '#1e2d3d', text: '#56ccf2' },  // Hellblau   — Hardware & Gadgets
    design:  { bg: '#2d1a1e', text: '#f2994a' },  // Orange     — Design & Kreatives
    news:    { bg: '#252525', text: '#bdbdbd' },  // Grau       — Allgemeine Nachrichten
    politik: { bg: '#3d1a1a', text: '#eb5757' },  // Rot        — Politik
    kultur:  { bg: '#2d1a3d', text: '#9b51e0' },  // Lila       — Kultur & Gesellschaft
    sport:   { bg: '#1a3a1a', text: '#27ae60' },  // Dunkelgrün — Sport
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RSS-FEEDS
  // Das Herzstück der App — hier definierst du welche Quellen geladen werden.
  //
  // Feed hinzufügen: Neues Objekt ans Array anhängen (Vorlage weiter unten).
  // Feed pausieren: enabled: false setzen (Feed bleibt in der Liste, wird übersprungen).
  // Feed entfernen: Das ganze Objekt löschen.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Aktive RSS/Atom-Feed Konfigurationen.
   *
   * Vorlage für einen neuen Feed:
   * {
   *   id:       'mein-blog',                         // Eindeutig, keine Leerzeichen
   *   name:     'Mein Blog',                         // Anzeigename in der UI
   *   url:      'https://mein-blog.de/feed.xml',     // RSS oder Atom URL
   *   category: 'tech',                              // Muss in CATEGORIES existieren
   *   language: 'de',                                // 'de' oder 'en'
   *   enabled:  true,
   * }
   *
   * @type {FeedConfig[]}
   */
  FEEDS: [

    // ── Technologie (Deutsch) ──────────────────────────────────────────────

    {
      id:       'golem',
      name:     'Golem.de',
      url:      'https://rss.golem.de/rss.php?feed=RSS2.0',
      category: 'tech',
      language: 'de',
      enabled:  true,
    },
    {
      id:       'heise',
      name:     'Heise Online',
      url:      'https://www.heise.de/rss/heise-atom.xml',
      category: 'tech',
      language: 'de',
      enabled:  true,
    },

    // ── Technologie (Englisch) ─────────────────────────────────────────────

    {
      id:       'geeks-are-sexy',
      name:     'Geeks Are Sexy',
      url:      'https://www.geeksaresexy.net/feed',
      category: 'tech',
      language: 'en',
      enabled:  true,
    },
    {
      // Google News liefert curated Topics als RSS.
      // Die lange ID in der URL identifiziert das Thema "Technologie, deutsche Ausgabe".
      // Diese URL kann sich ändern — bei Problemen googeln nach "Google News RSS Technologie".
      id:       'google-news-tech',
      name:     'Google News: Technologie',
      url:      'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlBQVAB',
      category: 'tech',
      language: 'de',
      enabled:  true,
    },

    // ── Android & Mobile ───────────────────────────────────────────────────

    {
      id:       'android-central',
      name:     'Android Central',
      url:      'https://www.androidcentral.com/rss.xml',
      category: 'android',
      language: 'en',
      enabled:  true,
    },
    {
      id:       'mobi-blog',
      name:     'mobi-blog.org',
      url:      'https://www.mobi-blog.org/feed',
      category: 'mobile',
      language: 'de',
      enabled:  true,
    },

    // ── Gadgets & Hardware ─────────────────────────────────────────────────

    {
      id:       'geeky-gadgets',
      name:     'Geeky Gadgets',
      url:      'https://www.geeky-gadgets.com/feed',
      category: 'gadgets',
      language: 'en',
      enabled:  true,
    },

    // ── Design & Lifestyle ─────────────────────────────────────────────────

    {
      id:       'likecool',
      name:     'likecool.com',
      url:      'https://www.likecool.com/rss.xml',
      category: 'design',
      language: 'en',
      enabled:  true,
    },

    // ── Musik & Audio ──────────────────────────────────────────────────────

    {
      id:       'amazona',
      name:     'amazona.de',
      url:      'https://www.amazona.de/feed',
      category: 'musik',
      language: 'de',
      enabled:  true,
    },
    {
      id:       'musikreviews',
      name:     'musikreviews.de',
      url:      'https://www.musikreviews.de/rss.xml',
      category: 'musik',
      language: 'de',
      enabled:  true,
    },

    // ── Nachrichten: Österreich ────────────────────────────────────────────

    {
      id:       'orf',
      name:     'ORF.at',
      url:      'https://rss.orf.at/news.xml',
      category: 'news',
      language: 'de',
      enabled:  true,
    },
    {
      id:       'derstandard',
      name:     'Der Standard',
      url:      'https://www.derstandard.at/rss',
      category: 'news',
      language: 'de',
      enabled:  true,
    },
    {
      id:       'diepresse',
      name:     'Die Presse',
      url:      'https://diepresse.com/rss/alle',
      category: 'news',
      language: 'de',
      enabled:  true,
    },

  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RECHTLICHES
  // URLs zu Datenschutzerklärung und Nutzungsbedingungen.
  // Google OAuth verlangt diese Links auf dem Login-Screen.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * URL zur Datenschutzerklärung — Pflicht für Google OAuth.
   * @type {string}
   */
  PRIVACY_POLICY_URL: 'https://mazer666.github.io/discophery/docs/privacy-policy.md',

  /**
   * URL zu den Nutzungsbedingungen.
   * @type {string}
   */
  TERMS_OF_USE_URL: 'https://mazer666.github.io/discophery/docs/terms-of-use.md',

};

// Kein ES-Module-Export — CONFIG ist ein globales Objekt das über ein
// normales <script src="config.js">-Tag in index.html geladen wird.
// Alle anderen Dateien (feed.js, auth.js etc.) setzen CONFIG voraus.
