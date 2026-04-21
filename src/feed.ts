/**
 * @fileoverview Discophery — RSS-Feed Loader & Parser
 *
 * Verantwortlichkeiten:
 *  - RSS/Atom-Feeds über CORS-Proxy laden (primär + Fallback)
 *  - XML parsen mit dem nativen DOMParser des Browsers
 *  - Artikel in das normalisierte DiscopheryArticle-Format konvertieren
 *  - Google-News-Redirect-URLs auflösen
 *  - Alle Feeds parallel laden (Promise.allSettled — ein Fehler bricht nichts ab)
 *  - Ergebnis via CustomEvent an ui.js weitergeben
 *
 * Setzt voraus: config.js, filter.js
 *
 * Jordan: Parallel laden mit Promise.allSettled statt Promise.all —
 * ein fehlgeschlagener Feed wirft keinen globalen Fehler.
 * Sam: Kein innerHTML — XML wird über DOMParser geparst, Texte nur via
 * textContent oder getAttribute gelesen.
 */

import { CONFIG } from './config';
import { getActiveFeeds } from './feed-manager';

/**
 * @typedef {Object} DiscopheryArticle
 * @property {string}      id          - Hash aus der Artikel-URL (eindeutig)
 * @property {string}      title       - Artikeltitel (kein HTML)
 * @property {string}      url         - Original-URL des Artikels
 * @property {string|null} image       - Vorschaubild-URL oder null
 * @property {string}      description - Kurztext, max. 200 Zeichen, kein HTML
 * @property {string}      source      - Anzeigename (z.B. "Golem.de")
 * @property {string}      sourceId    - ID aus config.js (z.B. "golem")
 * @property {string}      category    - Kategorie aus config.js (z.B. "tech")
 * @property {Date}        date        - Veröffentlichungsdatum
 * @property {boolean}     dismissed   - true = vom User weggewischt
 * @property {boolean}     isPaywall   - true = Artikel hinter Bezahlschranke (G+, Plus, etc.)
 */

// ═══════════════════════════════════════════════════════════════════════════
// ÖFFENTLICHE API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt alle aktivierten Feeds aus CONFIG.FEEDS parallel und gibt die
 * kombinierten, gefilterten und sortierten Artikel zurück.
 *
 * Feuert danach das CustomEvent 'discophery:articles' mit den Artikeln.
 *
 * @returns {Promise<DiscopheryArticle[]>} - Alle Artikel, neueste zuerst
 */
export async function previewFeedSource(feed: any) {
  try {
    const articles = await _loadFeed(feed);
    const withDismissed = articles.map((a: any) => ({ ...a, dismissed: (window as any).isDismissed(a.id) }));
    document.dispatchEvent(new CustomEvent('discophery:preview-articles', {
      detail: { articles: withDismissed, sourceId: feed.id, sourceName: feed.name }
    }));
  } catch (err: any) {
    console.warn(`Preview fehlgeschlagen für "${feed.name}":`, err?.message ?? err);
    document.dispatchEvent(new CustomEvent('discophery:preview-articles', {
      detail: { articles: [], sourceId: feed.id, sourceName: feed.name }
    }));
  }
}

export async function loadAllFeeds() {
  const activeFeeds = getActiveFeeds();  // feed-manager.js
  const accumulated = [];
  let failCount     = 0;
  let firstFired    = false;

  // 1. Static pre-fetched JSON laden (extrem schnell, kein CORS)
  let preFetchedData = [];
  try {
    const res = await fetch('./data/feeds.json?r=' + Date.now());
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      try {
        preFetchedData = await res.json();
        // Date-Strings zurück in echte Dates parsen + Paywall-Erkennung nachziehen
        preFetchedData.forEach(a => { 
          if(a.date) a.date = new Date(a.date);
          a.isPaywall = _checkPaywall(a.title || '', a.description || '');
        });
      } catch (e) {
        console.warn('feeds.json parse error:', e);
      }
    }
  } catch (err) {
    console.info('Pre-fetch feeds.json nicht ladbar, falle zurück auf Proxy-Modus.', err);
  }

  // 2. Herausfinden welche Feeds wir nicht im JSON haben (z.B. Custom Feeds)
  const activeFeedIds = new Set(activeFeeds.map(f => f.id));
  const availableIdsInJSON = new Set(preFetchedData.map(a => a.sourceId));
  
  // Alle Artikel die im JSON waren übernehmen
  const preFetchedArticles = preFetchedData.filter(a => activeFeedIds.has(a.sourceId));
  if (preFetchedArticles.length > 0) {
    accumulated.push(...preFetchedArticles);
    firstFired = true;
    _dispatchArticles(accumulated);
  }

  // 3. Fehlende Feeds via Proxy laden
  const missingFeeds = activeFeeds.filter(f => !availableIdsInJSON.has(f.id));

  if (missingFeeds.length > 0) {
    const promises = missingFeeds.map(feed =>
      _loadFeed(feed)
        .then(articles => {
          accumulated.push(...articles);
          if (!firstFired && accumulated.length > 0) {
            firstFired = true;
            _dispatchArticles(accumulated);
          }
        })
        .catch(err => {
          failCount++;
          console.warn('Feed fehlgeschlagen:', err?.message ?? err);
        })
    );

    await Promise.allSettled(promises);
    if (failCount > 0) {
      console.info(`${failCount} von ${missingFeeds.length} Fallback-Feeds konnten nicht geladen werden.`);
    }
  }

  // Finales Update
  _dispatchArticles(accumulated);
}

function _dispatchArticles(articles) {
  const unique       = _deduplicateById(articles);
  const withDismissed = unique.map(a => ({ ...a, dismissed: (window as any).isDismissed(a.id) }));
  withDismissed.sort((a, b) => b.date - a.date);
  document.dispatchEvent(
    new CustomEvent('discophery:articles', { detail: { articles: withDismissed } })
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EINZELNER FEED LADEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt einen einzelnen Feed und konvertiert ihn in DiscopheryArticle[].
 * Versucht zuerst den primären Proxy, dann den Fallback.
 *
 * @param {import('./config.js').FeedConfig} feed
 * @returns {Promise<DiscopheryArticle[]>}
 */
async function _loadFeed(feed) {
  try {
    const items = await _fetchAndParse(feed.url, feed);
    if (items.length > 0 || !feed.fallbackUrl) return items;
    console.info(`"${feed.name}" lieferte 0 Artikel, versuche fallbackUrl …`);
  } catch (err) {
    if (!feed.fallbackUrl) throw err;
    console.info(`"${feed.name}" fehlgeschlagen, versuche fallbackUrl …`);
  }
  return _fetchAndParse(feed.fallbackUrl, feed);
}

async function _fetchAndParse(url, feed) {
  let xmlText;
  try {
    xmlText = await _fetchWithPrimaryProxy(url);
  } catch (primaryErr) {
    console.info(`Primärer Proxy fehlgeschlagen für "${feed.name}", versuche Fallback …`);
    try {
      xmlText = await _fetchWithFallbackProxy(url);
    } catch (fallbackErr) {
      throw new Error(`Beide Proxys fehlgeschlagen für "${feed.name}": ${fallbackErr.message}`);
    }
  }
  return _parseXml(xmlText, feed);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROXY-REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

/** Lädt URL via primären Proxy (allorigins /raw); erkennt Encoding aus XML-Deklaration. */
async function _fetchWithPrimaryProxy(url) {
  const resp = await _fetchWithTimeout(CONFIG.PROXY_PRIMARY + encodeURIComponent(url), CONFIG.FETCH_TIMEOUT_MS);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} vom primären Proxy`);
  const buf     = await resp.arrayBuffer();
  const preview = new TextDecoder('ascii', { fatal: false }).decode(new Uint8Array(buf, 0, 200));
  const charset = preview.match(/encoding=["']([^"']+)["']/i)?.[1] ?? 'utf-8';
  return new TextDecoder(charset, { fatal: false }).decode(buf);
}

/** Lädt URL via Fallback-Proxy; erkennt Encoding aus XML-Deklaration. */
async function _fetchWithFallbackProxy(url) {
  const resp = await _fetchWithTimeout(CONFIG.PROXY_FALLBACK + encodeURIComponent(url), CONFIG.FETCH_TIMEOUT_MS);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} vom Fallback-Proxy`);
  const buf     = await resp.arrayBuffer();
  const preview = new TextDecoder('ascii', { fatal: false }).decode(new Uint8Array(buf, 0, 200));
  const charset = preview.match(/encoding=["']([^"']+)["']/i)?.[1] ?? 'utf-8';
  return new TextDecoder(charset, { fatal: false }).decode(buf);
}

/**
 * fetch() mit Timeout-Unterstützung via AbortController.
 * Bricht den Request nach FETCH_TIMEOUT_MS ab um nicht ewig zu hängen.
 *
 * @param {string} url       - Request-URL
 * @param {number} timeoutMs - Maximale Wartezeit in Millisekunden
 * @returns {Promise<Response>}
 */
async function _fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout nach ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// XML PARSEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parst einen XML-String (RSS 2.0 oder Atom) und gibt normalisierte Artikel zurück.
 * Erkennt das Format automatisch anhand des Root-Elements.
 *
 * Sam: DOMParser ist sicher — er erzeugt ein isoliertes XML-Dokument,
 * kein Skript im geparsten XML kann ausgeführt werden.
 *
 * @param {string}                          xmlText - Roher XML-String
 * @param {import('./config.js').FeedConfig} feed    - Feed-Konfiguration
 * @returns {DiscopheryArticle[]}
 */
function _parseXml(xmlText, feed) {
  // Encoding-Deklaration entfernen — JS-Strings sind Unicode; non-UTF-8-Deklarationen verwirren DOMParser
  const xml = xmlText.replace(/(<\?xml\b[^>]*?)\s*encoding=["'][^"']*["']/i, '$1');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  // Parsing-Fehler erkennen (DOMParser wirft keine Exception — er setzt ein Error-Element)
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.warn(`XML-Parsing-Fehler bei "${feed.name}"`);
    return [];
  }

  const root = doc.documentElement.tagName.toLowerCase();

  if (root === 'rss' || root === 'rdf:rdf') {
    return _parseRss(doc, feed);
  }
  if (root === 'feed') {
    return _parseAtom(doc, feed);
  }
  if (root === 'urlset') {
    return _parseGoogleNewsSitemap(doc, feed);
  }

  console.warn(`Unbekanntes Feed-Format für "${feed.name}": <${root}>`);
  return [];
}

/**
 * Parst RSS 2.0 / RSS 1.0 (RDF) Feeds.
 *
 * @param {Document}                         doc  - Geparste XML-Dokument
 * @param {import('./config.js').FeedConfig}  feed
 * @returns {DiscopheryArticle[]}
 */
function _parseRss(doc, feed) {
  const items = Array.from(doc.querySelectorAll('item'));
  return items
    .slice(0, CONFIG.MAX_ARTICLES_PER_FEED)
    .map(item => _normalizeRssItem(item, feed))
    .filter(Boolean);
}

/**
 * Parst Atom-Feeds.
 *
 * @param {Document}                         doc  - Geparste XML-Dokument
 * @param {import('./config.js').FeedConfig}  feed
 * @returns {DiscopheryArticle[]}
 */
function _parseAtom(doc, feed) {
  const entries = Array.from(doc.querySelectorAll('entry'));
  return entries
    .slice(0, CONFIG.MAX_ARTICLES_PER_FEED)
    .map(entry => _normalizeAtomEntry(entry, feed))
    .filter(Boolean);
}

/**
 * Parst Google News Sitemap Feeds (root: <urlset>).
 * Krone.at und andere Verlage liefern für Google News dieses Format statt RSS.
 */
function _parseGoogleNewsSitemap(doc, feed) {
  const urls = Array.from(doc.querySelectorAll('url'));
  return urls
    .slice(0, CONFIG.MAX_ARTICLES_PER_FEED)
    .map(urlEl => _normalizeGoogleNewsSitemapEntry(urlEl, feed))
    .filter(Boolean);
}

function _normalizeGoogleNewsSitemapEntry(urlEl, feed) {
  const articleUrl = _text(urlEl, 'loc');
  if (!articleUrl) return null;

  const title = _text(urlEl, 'news\\:title') || '(kein Titel)';
  const date  = _text(urlEl, 'news\\:publication_date');
  const image = _absImg(_text(urlEl, 'image\\:loc'));

  return {
    id:          _hashUrl(articleUrl),
    title,
    url:         articleUrl,
    image,
    description: '',
    source:      feed.name,
    sourceId:    feed.id,
    category:    feed.category,
    date:        _parseDate(date),
    dismissed:   false,
    isPaywall:   _checkPaywall(title, ''),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NORMALISIERUNG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Konvertiert ein RSS-<item>-Element in ein DiscopheryArticle-Objekt.
 *
 * @param {Element}                          item - RSS <item> Element
 * @param {import('./config.js').FeedConfig}  feed
 * @returns {DiscopheryArticle|null} - null wenn URL fehlt (Artikel nicht verwendbar)
 */
function _normalizeRssItem(item, feed) {
  const url = _resolveGoogleUrl(
    _text(item, 'link') || _attr(item, 'guid', 'isPermaLink') && _text(item, 'guid') || ''
  );
  if (!url) return null;

  const rawDescription = _text(item, 'description') || _text(item, 'content\\:encoded') || '';

  return {
    id:          _hashUrl(url),
    title:       _text(item, 'title') || '(kein Titel)',
    url,
    image:       _extractImage(item, rawDescription),
    description: _cleanText(rawDescription, CONFIG.DESCRIPTION_MAX_LENGTH),
    source:      feed.name,
    sourceId:    feed.id,
    category:    feed.category,
    date:        _parseDate(_text(item, 'pubDate') || _text(item, 'dc\\:date')),
    dismissed:   false,
    isPaywall:   _checkPaywall(_text(item, 'title') || '', rawDescription),
  };
}

/**
 * Konvertiert ein Atom-<entry>-Element in ein DiscopheryArticle-Objekt.
 *
 * @param {Element}                          entry - Atom <entry> Element
 * @param {import('./config.js').FeedConfig}  feed
 * @returns {DiscopheryArticle|null}
 */
function _normalizeAtomEntry(entry, feed) {
  // Atom-Links: <link href="..." rel="alternate"> bevorzugen
  const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
  const url    = _resolveGoogleUrl(linkEl?.getAttribute('href') || _text(entry, 'id') || '');
  if (!url) return null;

  const rawDescription = _text(entry, 'summary') || _text(entry, 'content') || '';

  return {
    id:          _hashUrl(url),
    title:       _text(entry, 'title') || '(kein Titel)',
    url,
    image:       _extractImage(entry, rawDescription),
    description: _cleanText(rawDescription, CONFIG.DESCRIPTION_MAX_LENGTH),
    source:      feed.name,
    sourceId:    feed.id,
    category:    feed.category,
    date:        _parseDate(_text(entry, 'updated') || _text(entry, 'published')),
    dismissed:   false,
    isPaywall:   _checkPaywall(_text(entry, 'title') || '', rawDescription) ||
                 _hasPaywallCategory(entry),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN — TEXT & ATTRIBUTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Liest den textContent eines Elements sicher aus.
 * Gibt null zurück wenn das Element nicht existiert oder leer ist.
 *
 * @param {Element} parent   - Elternelement
 * @param {string}  selector - CSS-Selector des Kindelements
 * @returns {string|null}
 */
function _text(parent, selector) {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || null;
}

/**
 * Liest ein Attribut eines Elements sicher aus.
 *
 * @param {Element} parent    - Elternelement
 * @param {string}  selector  - CSS-Selector des Kindelements
 * @param {string}  attribute - Name des Attributs
 * @returns {string|null}
 */
function _attr(parent, selector, attribute) {
  const el = parent.querySelector(selector);
  return el?.getAttribute(attribute) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN — BILD-EXTRAKTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sucht das Vorschaubild eines Artikels in dieser Reihenfolge:
 *  1. <media:content> oder <media:thumbnail> (Media RSS Namespace)
 *  2. <enclosure type="image/...">
 *  3. Erstes <img src="..."> im HTML der Description
 *
 * @param {Element} item           - RSS-Item oder Atom-Entry Element
 * @param {string}  rawDescription - Roher HTML-Text der Beschreibung
 * @returns {string|null}
 */
function _extractImage(item, rawDescription) {
  // 1. Media RSS Namespace
  const mediaContent   = item.querySelector('content[url]');
  const mediaThumbnail = item.querySelector('thumbnail[url]');
  if (mediaContent)   return _absImg(mediaContent.getAttribute('url'));
  if (mediaThumbnail) return _absImg(mediaThumbnail.getAttribute('url'));

  // 2. Enclosure (häufig bei Podcasts und manchen RSS-Feeds)
  const enclosure = item.querySelector('enclosure[type^="image"]');
  if (enclosure) return _absImg(enclosure.getAttribute('url'));

  // 3. Erstes Bild aus dem HTML der Description extrahieren
  // DOMParser für HTML verwenden — nicht innerHTML! (Sam)
  if (rawDescription) {
    const htmlDoc = new DOMParser().parseFromString(rawDescription, 'text/html');
    const img     = htmlDoc.querySelector('img[src]');
    if (img) return _absImg(img.getAttribute('src'));
  }

  return null;
}

function _absImg(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// ═══════════════════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN — TEXT-BEREINIGUNG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Entfernt HTML-Tags aus einem String und kürzt auf maxLength Zeichen.
 * Sicherer Ansatz: DOMParser parst das HTML, textContent liefert reinen Text.
 *
 * @param {string} html      - Potenziell HTML-haltiger Text
 * @param {number} maxLength - Maximale Zeichenanzahl im Ergebnis
 * @returns {string}
 */
function _cleanText(html, maxLength) {
  if (!html) return '';

  // DOMParser isoliert das HTML — kein Skript kann ausgeführt werden (Sam)
  const doc  = new DOMParser().parseFromString(html, 'text/html');
  const text = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();

  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Erkennt Paywall-Artikel anhand von Markern in Titel und Beschreibung.
 * Deckt G+, Plus, Premium, Paywall, Abo etc. ab.
 *
 * @param {string} title
 * @param {string} description
 * @returns {boolean}
 */
function _hasPaywallCategory(entry: Element): boolean {
  const categories = Array.from(entry.querySelectorAll('category'));
  const PAYWALL_TERMS = ['heise+', 'paid', 'premium', 'subscriber-only'];
  return categories.some(c => {
    const term = (c.getAttribute('term') || c.textContent || '').toLowerCase();
    return PAYWALL_TERMS.some(p => term.includes(p));
  });
}

function _checkPaywall(title: string, description: string) {
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  
  // Golem G+, Zeit-Plus, FAZ+, etc.
  const markers: (string | RegExp)[] = [
    '(g+)', '[g+]', 'g+',           // Golem (ohne \b da + kein WortZeichen ist)
    'heise+',                        // Heise+
    '[plus]', '(plus)', 'plus:', 'plus-artikel', // Allgemein
    '(p+)', '[p+]', 'p+',            // Varianten
    'paywall', 'bezahlschranke',
    'abonnement', 'premium-inhalt', 'premium artikel', 'premium plus',
    'nur für abonnenten', 'exklusiv für abonnenten'
  ];

  for (const m of markers) {
    if (typeof m === 'string') {
      if (t.includes(m) || d.includes(m)) return true;
    } else {
      if (m.test(t) || m.test(d)) return true;
    }
  }
  return false;
}

/**
 * Löst Google-News-Redirect-URLs auf.
 * Google News RSS liefert URLs wie: https://news.google.com/rss/articles/CBMi...
 * Der echte Artikel-Link steckt im Base64-kodierten Payload.
 *
 * Falls das Auflösen scheitert, wird die Original-URL zurückgegeben —
 * der Artikel ist dann trotzdem klickbar (leitet via Google weiter).
 *
 * @param {string} url - Möglicherweise Google-Redirect-URL
 * @returns {string}   - Aufgelöste URL oder Original-URL
 */
function _resolveGoogleUrl(url) {
  if (!url) return '';

  // Keine Google-URL → unverändert zurückgeben
  if (!url.includes('news.google.com/rss/articles/')) return url;

  try {
    // Google kodiert die Ziel-URL als Base64 nach dem letzten Slash
    const encoded = url.split('/').pop().split('?')[0];
    const decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));

    // Die Ziel-URL beginnt nach einem festen Präfix-Muster
    const match = decoded.match(/https?:\/\/[^\s"'<>]+/);
    return match ? match[0] : url;
  } catch {
    // atob kann scheitern wenn der String kein gültiges Base64 ist
    return url;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HILFSFUNKTIONEN — ID & DATUM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erzeugt einen stabilen Hash aus einer URL als Artikel-ID.
 * Kein kryptografischer Hash nötig — nur eindeutig innerhalb der App.
 * Algorithmus: djb2 (einfach, kollisionsarm für unsere Zwecke).
 *
 * @param {string} url
 * @returns {string} - Hash als Hex-String
 */
function _hashUrl(url) {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) + hash) ^ url.charCodeAt(i);
    hash = hash & hash; // In 32-bit Integer konvertieren
  }
  return Math.abs(hash).toString(16);
}

/**
 * Parst ein Datums-String in ein Date-Objekt.
 * Unterstützt RFC 2822 (RSS pubDate), ISO 8601 (Atom), und gängige Varianten.
 * Gibt bei ungültigem Datum das aktuelle Datum zurück (Artikel nicht verlieren).
 *
 * @param {string|null} dateStr - Datums-String aus dem Feed
 * @returns {Date}
 */
function _parseDate(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Entfernt Artikel-Duplikate anhand ihrer ID.
 *
 * @param {DiscopheryArticle[]} articles
 * @returns {DiscopheryArticle[]}
 */
function _deduplicateById(articles) {
  const seen = new Set();
  return articles.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

// ─── Start — hört auf das discophery:ready Event von auth.js ────────────

document.addEventListener('discophery:ready', () => {
  loadAllFeeds();
});

// --- Auto-generated global exports for Vite migration ---
(window as any).loadAllFeeds = loadAllFeeds;
(window as any).previewFeedSource = previewFeedSource;
(window as any)._dispatchArticles = _dispatchArticles;
(window as any)._loadFeed = _loadFeed;
(window as any)._fetchAndParse = _fetchAndParse;
(window as any)._fetchWithPrimaryProxy = _fetchWithPrimaryProxy;
(window as any)._fetchWithFallbackProxy = _fetchWithFallbackProxy;
(window as any)._fetchWithTimeout = _fetchWithTimeout;
(window as any)._parseXml = _parseXml;
(window as any)._parseRss = _parseRss;
(window as any)._parseAtom = _parseAtom;
(window as any)._parseGoogleNewsSitemap = _parseGoogleNewsSitemap;
(window as any)._normalizeRssItem = _normalizeRssItem;
(window as any)._normalizeAtomEntry = _normalizeAtomEntry;
(window as any)._text = _text;
(window as any)._attr = _attr;
(window as any)._extractImage = _extractImage;
(window as any)._cleanText = _cleanText;
(window as any)._resolveGoogleUrl = _resolveGoogleUrl;
(window as any)._hashUrl = _hashUrl;
(window as any)._parseDate = _parseDate;
(window as any)._deduplicateById = _deduplicateById;
