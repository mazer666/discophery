/**
 * @fileoverview Discophery — Filterregeln & Dismiss-Logik
 *
 * Verantwortlichkeiten:
 *  - Blockierte Quellen lesen/schreiben (localStorage)
 *  - Blockierte Keywords lesen/schreiben (localStorage)
 *  - Weggewischte Artikel-IDs verwalten (localStorage, max. 500)
 *  - Filterfunktion: Artikel gegen alle aktiven Regeln prüfen
 *  - "Alle Daten zurücksetzen" mit Bestätigungsdialog
 *
 * Setzt voraus: config.js (CONFIG.STORAGE_KEYS, CONFIG.MAX_DISMISSED_STORED)
 *
 * Wird von feed.js (isDismissed) und ui.js (blockSource etc.) aufgerufen.
 * Schreibt nie direkt in den DOM — das ist Aufgabe von ui.js.
 */

// ═══════════════════════════════════════════════════════════════════════════
// INTERNER STATE — gespiegelt aus localStorage für schnellen Zugriff
// ═══════════════════════════════════════════════════════════════════════════

/**
 * In-Memory-Cache der Filter-Daten.
 * Wird beim ersten Aufruf von _ensureLoaded() aus localStorage gelesen.
 * Schreiboperationen updaten sowohl den Cache als auch localStorage.
 *
 * @type {{ blockedSources: Set<string>, blockedKeywords: Set<string>, dismissed: string[] }}
 */
const _state = {
  blockedSources:  null,  // Set<sourceId>
  blockedKeywords: null,  // Set<keyword (lowercase)>
  dismissed:       null,  // Array<articleId> — Array statt Set wegen FIFO-Limit
};

/**
 * Stellt sicher dass der State aus localStorage geladen ist.
 * Lazy-Loading: wird nur beim ersten Zugriff ausgeführt.
 *
 * @returns {void}
 */
function _ensureLoaded() {
  if (_state.blockedSources !== null) return;

  _state.blockedSources  = new Set(_readArray(CONFIG.STORAGE_KEYS.BLOCKED_SOURCES));
  _state.blockedKeywords = new Set(
    _readArray(CONFIG.STORAGE_KEYS.BLOCKED_KEYWORDS).map(k => k.toLowerCase())
  );
  _state.dismissed = _readArray(CONFIG.STORAGE_KEYS.DISMISSED);
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKIERTE QUELLEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Blockiert eine Quelle — Artikel von dieser Quelle werden nicht mehr angezeigt.
 *
 * @param {string} sourceId - ID der Quelle aus config.js (z.B. "golem")
 * @returns {void}
 */
function blockSource(sourceId) {
  _ensureLoaded();
  _state.blockedSources.add(sourceId);
  _writeArray(CONFIG.STORAGE_KEYS.BLOCKED_SOURCES, [..._state.blockedSources]);
  _dispatchFilterChange();
}

/**
 * Hebt die Blockierung einer Quelle auf.
 *
 * @param {string} sourceId
 * @returns {void}
 */
function unblockSource(sourceId) {
  _ensureLoaded();
  _state.blockedSources.delete(sourceId);
  _writeArray(CONFIG.STORAGE_KEYS.BLOCKED_SOURCES, [..._state.blockedSources]);
  _dispatchFilterChange();
}

/**
 * Gibt alle aktuell blockierten Quell-IDs zurück.
 *
 * @returns {string[]}
 */
function getBlockedSources() {
  _ensureLoaded();
  return [..._state.blockedSources];
}

/**
 * Prüft ob eine Quelle blockiert ist.
 *
 * @param {string} sourceId
 * @returns {boolean}
 */
function isSourceBlocked(sourceId) {
  _ensureLoaded();
  return _state.blockedSources.has(sourceId);
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKIERTE KEYWORDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Blockiert ein Keyword — Artikel deren Titel dieses Wort enthalten werden ausgeblendet.
 * Keywords werden case-insensitiv gespeichert und geprüft.
 *
 * @param {string} keyword - Zu blockierendes Wort oder Phrase
 * @returns {void}
 */
function blockKeyword(keyword) {
  _ensureLoaded();
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return;

  _state.blockedKeywords.add(normalized);
  _writeArray(CONFIG.STORAGE_KEYS.BLOCKED_KEYWORDS, [..._state.blockedKeywords]);
  _dispatchFilterChange();
}

/**
 * Entfernt ein blockiertes Keyword.
 *
 * @param {string} keyword
 * @returns {void}
 */
function unblockKeyword(keyword) {
  _ensureLoaded();
  _state.blockedKeywords.delete(keyword.toLowerCase());
  _writeArray(CONFIG.STORAGE_KEYS.BLOCKED_KEYWORDS, [..._state.blockedKeywords]);
  _dispatchFilterChange();
}

/**
 * Gibt alle aktuell blockierten Keywords zurück (in Originalschreibweise).
 *
 * @returns {string[]}
 */
function getBlockedKeywords() {
  _ensureLoaded();
  return [..._state.blockedKeywords];
}

// ═══════════════════════════════════════════════════════════════════════════
// DISMISS (WEGGEWISCHTE ARTIKEL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Markiert einen Artikel als weggewischt.
 *
 * Warum Array statt Set?
 * Wir brauchen FIFO-Verhalten: wenn das Limit von MAX_DISMISSED_STORED
 * erreicht ist, sollen die ältesten Einträge entfernt werden.
 * Mit einem Array ist das einfach über shift() realisierbar.
 *
 * @param {string} articleId - Hash-ID des Artikels (aus feed.js)
 * @returns {void}
 */
function dismissArticle(articleId) {
  _ensureLoaded();

  if (_state.dismissed.includes(articleId)) return;

  _state.dismissed.push(articleId);

  // FIFO-Limit: älteste Einträge entfernen wenn Limit überschritten
  if (_state.dismissed.length > CONFIG.MAX_DISMISSED_STORED) {
    _state.dismissed = _state.dismissed.slice(-CONFIG.MAX_DISMISSED_STORED);
  }

  _writeArray(CONFIG.STORAGE_KEYS.DISMISSED, _state.dismissed);
}

/**
 * Prüft ob ein Artikel weggewischt wurde.
 * Wird von feed.js aufgerufen — muss daher ohne vorherigen _ensureLoaded-Aufruf
 * funktionieren (wird intern beim ersten Aufruf nachgeladen).
 *
 * @param {string} articleId
 * @returns {boolean}
 */
function isDismissed(articleId) {
  _ensureLoaded();
  return _state.dismissed.includes(articleId);
}

/**
 * Setzt alle weggewischten Artikel zurück (Dismissed-Liste leeren).
 * Wird aus dem Einstellungs-Modal aufgerufen.
 *
 * @returns {void}
 */
function clearDismissed() {
  _ensureLoaded();
  _state.dismissed = [];
  _writeArray(CONFIG.STORAGE_KEYS.DISMISSED, []);
  _dispatchFilterChange();
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER-FUNKTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft ob ein Artikel angezeigt werden soll.
 *
 * Filtert aus wenn:
 *  - Artikel wurde weggewischt (dismissed)
 *  - Quelle ist blockiert
 *  - Titel enthält ein blockiertes Keyword
 *
 * @param {import('./feed.js').DiscopheryArticle} article
 * @returns {boolean} - true = anzeigen, false = ausblenden
 */
function shouldShowArticle(article) {
  _ensureLoaded();

  if (article.dismissed)                     return false;
  if (_state.blockedSources.has(article.sourceId)) return false;

  // Keyword-Check: Titel in Kleinbuchstaben gegen alle blockierten Keywords
  if (_state.blockedKeywords.size > 0) {
    const titleLower = article.title.toLowerCase();
    for (const keyword of _state.blockedKeywords) {
      if (titleLower.includes(keyword)) return false;
    }
  }

  return true;
}

/**
 * Wendet shouldShowArticle() auf ein Array von Artikeln an.
 *
 * @param {import('./feed.js').DiscopheryArticle[]} articles
 * @returns {import('./feed.js').DiscopheryArticle[]}
 */
function applyFilters(articles) {
  return articles.filter(shouldShowArticle);
}

/**
 * Extrahiert das erste bedeutungsvolle Wort aus einem Titel für
 * den "Keyword blockieren"-Vorschlag im Context-Menü.
 *
 * Überspringt kurze Stoppwörter (Artikel, Präpositionen etc.)
 * um sinnvolle Vorschläge zu machen.
 *
 * @param {string} title
 * @returns {string} - Erstes bedeutungsvolles Wort, lowercase
 */
function extractKeywordFromTitle(title) {
  const stopWords = new Set([
    'der', 'die', 'das', 'ein', 'eine', 'einer', 'einem', 'einen',
    'und', 'oder', 'aber', 'doch', 'wie', 'was', 'wer', 'von', 'bei',
    'mit', 'für', 'auf', 'an', 'in', 'zu', 'im', 'am', 'ist', 'sind',
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to',
    'for', 'with', 'is', 'are', 'by', 'from', 'as', 'how', 'why', 'what',
  ]);

  const words = title
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

  return words[0]?.toLowerCase() ?? title.split(' ')[0].toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════════
// ALLES ZURÜCKSETZEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Setzt ALLE Filter-Daten zurück (blockierte Quellen, Keywords, Dismissed).
 * Zeigt vorher einen nativen Bestätigungsdialog.
 *
 * Warum window.confirm?
 * Kein Build-Tool, kein Modal-Framework — window.confirm ist die
 * einfachste sichere Option für einen einmaligen Bestätigungsschritt.
 * Der Dialog ist vom Browser geblockt gegen Manipulation (Sam).
 *
 * @returns {boolean} - true wenn zurückgesetzt, false wenn abgebrochen
 */
function resetAllData() {
  const confirmed = window.confirm(
    'Alle Filter, blockierten Quellen und weggewischten Artikel werden gelöscht.\n\nFortfahren?'
  );
  if (!confirmed) return false;

  const keys = CONFIG.STORAGE_KEYS;
  try {
    localStorage.removeItem(keys.BLOCKED_SOURCES);
    localStorage.removeItem(keys.BLOCKED_KEYWORDS);
    localStorage.removeItem(keys.DISMISSED);
    localStorage.removeItem(keys.SETTINGS);
    localStorage.removeItem(keys.LAST_REFRESH);
  } catch (err) {
    console.warn('Fehler beim Zurücksetzen der Daten:', err.message);
  }

  // In-Memory-State zurücksetzen — erzwingt Neuladen aus localStorage
  _state.blockedSources  = new Set();
  _state.blockedKeywords = new Set();
  _state.dismissed       = [];

  _dispatchFilterChange();
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCALSTORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Liest ein JSON-Array aus localStorage.
 * Gibt [] zurück wenn der Schlüssel nicht existiert oder das JSON kaputt ist.
 *
 * @param {string} key - localStorage-Schlüssel
 * @returns {any[]}
 */
function _readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Kaputtes JSON → ignorieren, leer zurückgeben
    return [];
  }
}

/**
 * Schreibt ein Array als JSON in localStorage.
 * Fehler (z.B. Storage Full) werden geloggt aber nicht weitergeworfen —
 * die App funktioniert weiter, Filter gehen beim Reload verloren.
 *
 * @param {string} key   - localStorage-Schlüssel
 * @param {any[]}  array - Zu speicherndes Array
 * @returns {void}
 */
function _writeArray(key, array) {
  try {
    localStorage.setItem(key, JSON.stringify(array));
  } catch (err) {
    // QuotaExceededError: localStorage voll (passiert selten bei ~25KB Daten)
    console.warn(`localStorage voll (${key}):`, err.message);
  }
}

/**
 * Feuert ein CustomEvent damit ui.js die Darstellung aktualisieren kann.
 * Löst kein direktes Re-Render aus — ui.js entscheidet selbst was zu tun ist.
 *
 * @returns {void}
 */
function _dispatchFilterChange() {
  document.dispatchEvent(new CustomEvent('discophery:filter-changed', {
    detail: {
      blockedSources:  getBlockedSources(),
      blockedKeywords: getBlockedKeywords(),
    },
  }));
}
