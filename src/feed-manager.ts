/**
 * @fileoverview Discophery — Feed-Manager (Daten-Layer)
 *
 * Verantwortlichkeiten:
 *  - Aktive Feed-IDs aus localStorage lesen/schreiben
 *  - Eigene Feeds (Custom Feeds) verwalten
 *  - getActiveFeeds() für feed.js bereitstellen
 *
 * UI-Logik (Modal, Toggle, Suche) → feed-manager-ui.js
 * Setzt voraus: config.js, feeds.js (FEED_CATALOGUE)
 */

// ═══════════════════════════════════════════════════════════════════════════
// ÖFFENTLICHE API — wird von feed.js und feed-manager-ui.js verwendet
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt alle Feeds zurück die der User aktuell aktiviert hat.
 *
 * Beim ersten Start (noch kein localStorage-Eintrag): Leeres Array,
 * damit der Feed-Manager automatisch öffnet (siehe main.ts).
 *
 * @returns {import('./config.js').FeedConfig[]}
 */
function getActiveFeeds() {
  const savedIds = _loadActiveIds();
  const custom   = getCustomFeeds();

  if (savedIds === null) {
    return []; // Frischer Start ohne Feeds
  }

  const fromCatalogue = FEED_CATALOGUE.filter(f => savedIds.includes(f.id));
  return [...fromCatalogue, ...custom];
}

/**
 * Gibt alle selbst hinzugefügten Feeds zurück.
 *
 * @returns {import('./config.js').FeedConfig[]}
 */
function getCustomFeeds() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.CUSTOM_FEEDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/**
 * Aktiviert oder deaktiviert einen Feed aus dem Katalog.
 *
 * @param {string}  feedId - ID des Feeds aus FEED_CATALOGUE
 * @param {boolean} active - true = aktivieren, false = deaktivieren
 * @returns {void}
 */
function setFeedActive(feedId, active) {
  let ids = _loadActiveIds();
  if (ids === null) ids = FEED_CATALOGUE.filter(f => f.enabled).map(f => f.id);

  ids = active
    ? [...new Set([...ids, feedId])]
    : ids.filter(id => id !== feedId);

  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_FEEDS, JSON.stringify(ids));
  } catch (err) {
    console.warn('Feed-Auswahl konnte nicht gespeichert werden:', err.message);
  }
}

/**
 * Aktiviert oder deaktiviert alle Feeds einer bestimmten Kategorie.
 *
 * @param {string}  category - Kategorie-Name
 * @param {boolean} active   - true = aktivieren, false = deaktivieren
 * @returns {void}
 */
function setCategoryActive(category, active) {
  let ids = _loadActiveIds();
  if (ids === null) ids = [];

  const categoryFeedIds = FEED_CATALOGUE
    .filter(f => f.category === category)
    .map(f => f.id);

  if (active) {
    // Alle hinzufügen (Set sorgt für Eindeutigkeit)
    ids = [...new Set([...ids, ...categoryFeedIds])];
  } else {
    // Alle IDs dieser Kategorie aus dem aktiven Array entfernen
    const catSet = new Set(categoryFeedIds);
    ids = ids.filter(id => !catSet.has(id));
  }

  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_FEEDS, JSON.stringify(ids));
  } catch (err) {
    console.warn('Kategorie-Auswahl konnte nicht gespeichert werden:', err.message);
  }
}

/**
 * Prüft ob ein Feed aus dem Katalog aktuell aktiv ist.
 *
 * @param {string} feedId
 * @returns {boolean}
 */
function isFeedActive(feedId) {
  const ids = _loadActiveIds();
  if (ids === null) return FEED_CATALOGUE.find(f => f.id === feedId)?.enabled ?? false;
  return ids.includes(feedId);
}

/**
 * Fügt einen neuen eigenen Feed hinzu und speichert ihn in localStorage.
 *
 * @param {{ name:string, url:string, category:string, language:string }} data
 * @returns {{ success: boolean, error?: string }}
 */
function addCustomFeed(data) {
  const name     = data.name?.trim();
  const url      = data.url?.trim();
  const category = data.category || 'news';
  const language = data.language || 'de';

  if (!name || !url)     return { success: false, error: 'Name und URL sind Pflichtfelder.' };
  if (!isValidFeedUrl(url)) return { success: false, error: 'Ungültige URL. Bitte https://... verwenden.' };

  const feeds = getCustomFeeds();
  if (feeds.some(f => f.url === url) || FEED_CATALOGUE.some(f => f.url === url)) {
    return { success: false, error: 'Dieser Feed ist bereits in der Liste.' };
  }

  feeds.push({
    id:       'custom-' + slugifyFeedName(name) + '-' + Date.now().toString(36),
    name, url, category, language, enabled: true,
  });

  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOM_FEEDS, JSON.stringify(feeds));
  } catch (err) {
    return { success: false, error: 'Speichern fehlgeschlagen: ' + err.message };
  }
  return { success: true };
}

/**
 * Entfernt einen eigenen Feed anhand seiner ID.
 *
 * @param {string} feedId
 * @returns {void}
 */
function removeCustomFeed(feedId) {
  const feeds = getCustomFeeds().filter(f => f.id !== feedId);
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CUSTOM_FEEDS, JSON.stringify(feeds));
  } catch (err) {
    console.warn('Custom-Feed konnte nicht entfernt werden:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN (auch von feed-manager-ui.js genutzt)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft ob ein String eine gültige HTTP(S)-URL ist.
 *
 * @param {string} url
 * @returns {boolean}
 */
function isValidFeedUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

/**
 * Konvertiert einen Feed-Namen in einen URL-freundlichen Slug.
 *
 * @param {string} str
 * @returns {string}
 */
function slugifyFeedName(str) {
  return str.toLowerCase()
    .replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

/**
 * Liest die gespeicherte Liste aktiver Feed-IDs aus localStorage.
 *
 * @returns {string[]|null} - null wenn noch nie gesetzt (erster Start)
 */
function _loadActiveIds() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_FEEDS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

// --- Auto-generated global exports for Vite migration ---
(window as any).getActiveFeeds = getActiveFeeds;
(window as any).getCustomFeeds = getCustomFeeds;
(window as any).setFeedActive = setFeedActive;
(window as any).setCategoryActive = setCategoryActive;
(window as any).isFeedActive = isFeedActive;
(window as any).addCustomFeed = addCustomFeed;
(window as any).removeCustomFeed = removeCustomFeed;
(window as any).isValidFeedUrl = isValidFeedUrl;
(window as any).slugifyFeedName = slugifyFeedName;
(window as any)._loadActiveIds = _loadActiveIds;
