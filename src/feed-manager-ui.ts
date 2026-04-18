/**
 * @fileoverview Discophery — Feed-Manager UI
 *
 * Verantwortlichkeiten:
 *  - Feed-Manager Modal öffnen/schließen und befüllen
 *  - Kategorie-Gruppen mit Toggle-Switches rendern
 *  - Live-Suche in der Feed-Liste
 *  - RSS-URL überprüfen (Titel aus Feed lesen, Formular vorausfüllen)
 *  - Custom-Feed-Formular verarbeiten
 *
 * Daten-Layer → feed-manager.js (getActiveFeeds, setFeedActive, addCustomFeed …)
 * Setzt voraus: config.js, feeds.js, feed-manager.js
 */

// ═══════════════════════════════════════════════════════════════════════════
// MODAL ÖFFNEN / SCHLIESSEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Öffnet das Feed-Manager Modal und baut den Inhalt auf.
 *
 * @returns {void}
 */
function openFeedManager() {
  // Einstellungs-Modal schließen falls geöffnet
  const settingsBackdrop = document.getElementById('settings-modal-backdrop');
  if (settingsBackdrop?.classList.contains('modal-backdrop--open')) {
    settingsBackdrop.classList.remove('modal-backdrop--open');
    settingsBackdrop.ariaHidden = 'true';
  }
  _renderFeedManager();
  const backdrop = document.getElementById('feed-manager-backdrop');
  if (!backdrop) return;
  backdrop.classList.add('modal-backdrop--open');
  backdrop.ariaHidden = 'false';
  document.getElementById('feed-search')?.focus();
}

/**
 * Schließt das Feed-Manager Modal.
 *
 * @returns {void}
 */
function closeFeedManager() {
  const backdrop = document.getElementById('feed-manager-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('modal-backdrop--open');
  backdrop.ariaHidden = 'true';
}

// ═══════════════════════════════════════════════════════════════════════════
// FEED-LISTE RENDERN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rendert alle Feed-Gruppen in den Modal-Container.
 * Gruppiert FEED_CATALOGUE nach Kategorie, eigene Feeds ganz unten.
 *
 * @returns {void}
 */
function _renderFeedManager() {
  const list = document.getElementById('feed-list');
  if (!list) return;
  while (list.firstChild) list.removeChild(list.firstChild);

  // Katalog nach Kategorie gruppieren
  const groups = {};
  for (const feed of FEED_CATALOGUE) {
    if (!groups[feed.category]) groups[feed.category] = [];
    groups[feed.category].push(feed);
  }

  for (const cat of Object.keys(groups).sort()) {
    const feeds       = groups[cat];
    const activeCount = feeds.filter(f => isFeedActive(f.id)).length;
    list.appendChild(_createCategoryGroup(cat, feeds, activeCount));
  }

  const custom = getCustomFeeds();
  if (custom.length > 0) list.appendChild(_createCustomFeedsGroup(custom));

  _populateCategorySelect();
}

/**
 * Erstellt eine aufklappbare Kategorie-Gruppe (<details>/<summary>).
 *
 * @param {string} cat         - Kategorie-Key
 * @param {Array}  feeds       - Feeds dieser Kategorie
 * @param {number} activeCount - Anzahl aktiver Feeds
 * @returns {HTMLDetailsElement}
 */
function _createCategoryGroup(cat, feeds, activeCount) {
  const details     = document.createElement('details');
  details.className = 'feed-group';
  if (activeCount > 0) details.open = true;

  const summary = document.createElement('summary');
  summary.className = 'feed-group__summary';

  const titleEl = document.createElement('span');
  titleEl.className   = 'feed-group__title';
  titleEl.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);

  const badge = document.createElement('span');
  badge.className   = 'feed-group__count' + (activeCount > 0 ? ' feed-group__count--active' : '');
  badge.textContent = `${activeCount}/${feeds.length}`;
  badge.dataset.cat = cat;

  const arrow = document.createElement('span');
  arrow.className   = 'feed-group__arrow';
  arrow.textContent = '▾';
  arrow.ariaHidden  = 'true';

  summary.appendChild(titleEl);
  summary.appendChild(badge);
  summary.appendChild(arrow);
  details.appendChild(summary);

  for (const feed of feeds) details.appendChild(_createFeedRow(feed, false));
  return details;
}

/**
 * Erstellt die Gruppe für eigene Feeds.
 *
 * @param {Array} customFeeds
 * @returns {HTMLDetailsElement}
 */
function _createCustomFeedsGroup(customFeeds) {
  const details     = document.createElement('details');
  details.className = 'feed-group';
  details.open      = true;

  const summary = document.createElement('summary');
  summary.className = 'feed-group__summary';

  const title = document.createElement('span');
  title.className   = 'feed-group__title';
  title.textContent = 'Eigene Feeds';

  const arrow = document.createElement('span');
  arrow.className   = 'feed-group__arrow';
  arrow.textContent = '▾';
  arrow.ariaHidden  = 'true';

  summary.appendChild(title);
  summary.appendChild(arrow);
  details.appendChild(summary);

  for (const feed of customFeeds) details.appendChild(_createFeedRow(feed, true));
  return details;
}

/**
 * Erstellt eine einzelne Feed-Zeile mit Toggle (Katalog) oder Löschen-Button (Custom).
 *
 * @param {import('./config.js').FeedConfig} feed
 * @param {boolean} isCustom
 * @returns {HTMLDivElement}
 */
function _createFeedRow(feed, isCustom) {
  const row = document.createElement('div');
  row.className        = 'feed-row';
  row.dataset.feedId   = feed.id;
  row.dataset.feedName = feed.name.toLowerCase();

  const info = document.createElement('div');
  info.className = 'feed-row__info';
  info.style.cursor = 'pointer';
  info.title = 'Nur Artikel dieses Feeds anzeigen';

  // Klick auf Medienname → Manager schließen + Quellen-Filter setzen
  info.addEventListener('click', () => {
    if (!isCustom && !isFeedActive(feed.id)) {
      setFeedActive(feed.id, true);
      document.dispatchEvent(new CustomEvent('discophery:feeds-changed'));
    }
    closeFeedManager();
    document.dispatchEvent(new CustomEvent('discophery:source-filter-request', {
      detail: { sourceId: feed.id, sourceName: feed.name },
    }));
  });

  const nameEl = document.createElement('div');
  nameEl.className   = 'feed-row__name';
  nameEl.textContent = feed.name;

  const metaEl = document.createElement('div');
  metaEl.className = 'feed-row__meta';
  try {
    metaEl.textContent = feed.language.toUpperCase() + ' · ' + new URL(feed.url).hostname;
  } catch {
    metaEl.textContent = feed.language.toUpperCase();
  }

  info.appendChild(nameEl);
  info.appendChild(metaEl);
  row.appendChild(info);

  if (isCustom) {
    const delBtn = document.createElement('button');
    delBtn.className   = 'feed-row__delete';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', `${feed.name} entfernen`);
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();  // info-click nicht auslösen
      removeCustomFeed(feed.id);
      row.remove();
      document.dispatchEvent(new CustomEvent('discophery:feeds-changed'));
    });
    row.appendChild(delBtn);
  } else {
    const toggle = _createToggle(feed.id);
    // Toggle-Klick soll nicht den Quellen-Filter öffnen
    toggle.addEventListener('click', (e) => e.stopPropagation());
    row.appendChild(toggle);
  }

  return row;
}

/**
 * Erstellt einen Toggle-Switch (verstecktes Checkbox + gestyltes Label).
 *
 * @param {string} feedId
 * @returns {HTMLLabelElement}
 */
function _createToggle(feedId) {
  const label     = document.createElement('label');
  label.className = 'toggle';
  label.title     = 'Feed aktivieren / deaktivieren';

  const input     = document.createElement('input');
  input.type      = 'checkbox';
  input.className = 'toggle__input';
  input.checked   = isFeedActive(feedId);
  input.setAttribute('aria-label', 'Feed aktivieren');

  input.addEventListener('change', () => {
    setFeedActive(feedId, input.checked);
    _updateGroupCounter(feedId, input.checked);
    document.dispatchEvent(new CustomEvent('discophery:feeds-changed'));
  });

  const track = document.createElement('span');
  track.className = 'toggle__track';

  const thumb = document.createElement('span');
  thumb.className = 'toggle__thumb';

  label.appendChild(input);
  label.appendChild(track);
  label.appendChild(thumb);
  return label;
}

/**
 * Aktualisiert den Zähler-Badge einer Kategorie-Gruppe.
 *
 * @param {string}  feedId
 * @param {boolean} nowActive
 * @returns {void}
 */
function _updateGroupCounter(feedId, nowActive) {
  const feed = FEED_CATALOGUE.find(f => f.id === feedId);
  if (!feed) return;
  const badge = document.querySelector(`.feed-group__count[data-cat="${feed.category}"]`);
  if (!badge) return;
  const total  = FEED_CATALOGUE.filter(f => f.category === feed.category).length;
  const active = FEED_CATALOGUE.filter(f => f.category === feed.category && isFeedActive(f.id)).length;
  badge.textContent = `${active}/${total}`;
  badge.classList.toggle('feed-group__count--active', active > 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// LIVE-SUCHE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filtert die sichtbaren Feed-Zeilen nach dem Suchbegriff.
 *
 * @param {string} query
 * @returns {void}
 */
function _filterFeeds(query) {
  const q = query.toLowerCase().trim();
  for (const row of document.querySelectorAll('#feed-list .feed-row')) {
    row.classList.toggle('feed-row--hidden', !!q && !row.dataset.feedName?.includes(q));
  }
  for (const group of document.querySelectorAll('#feed-list .feed-group')) {
    const visible = group.querySelectorAll('.feed-row:not(.feed-row--hidden)').length;
    group.style.display = visible === 0 ? 'none' : '';
    if (q) group.open = true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RSS-URL ÜBERPRÜFEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lädt eine Feed-URL via CORS-Proxy und liest den Kanal-Titel aus.
 * Füllt das Name-Feld automatisch vor wenn es noch leer ist.
 *
 * @returns {Promise<void>}
 */
async function _checkFeedUrl() {
  const urlInput  = document.getElementById('cf-url');
  const nameInput = document.getElementById('cf-name');
  const preview   = document.getElementById('feed-preview');
  const checkBtn  = document.getElementById('btn-check-feed');
  const url       = urlInput?.value?.trim();

  if (!url || !isValidFeedUrl(url)) {
    _showPreview(preview, null, 'Bitte eine gültige URL eingeben (https://…).');
    return;
  }

  if (checkBtn) checkBtn.textContent = '…';

  try {
    const resp = await fetch(CONFIG.PROXY_PRIMARY + encodeURIComponent(url), {
      signal: AbortSignal.timeout(CONFIG.FETCH_TIMEOUT_MS),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const text  = await resp.text();
    const doc   = new DOMParser().parseFromString(text, 'text/xml');
    const title = doc.querySelector('channel > title, feed > title')?.textContent?.trim();

    if (title && nameInput && !nameInput.value) nameInput.value = title;
    _showPreview(preview, title || 'Feed gefunden', null);
  } catch (err) {
    _showPreview(preview, null, 'Fehler: ' + err.message);
  } finally {
    if (checkBtn) checkBtn.textContent = 'Überprüfen';
  }
}

/**
 * Zeigt Vorschau oder Fehlermeldung — nur textContent (Sam: kein innerHTML).
 *
 * @param {HTMLElement|null} el
 * @param {string|null}      title
 * @param {string|null}      error
 * @returns {void}
 */
function _showPreview(el, title, error) {
  if (!el) return;
  el.style.display = '';
  el.textContent   = '';
  el.className     = 'feed-preview' + (error ? ' feed-preview--error' : '');

  if (error) {
    el.textContent = error;
  } else {
    const t = document.createElement('div');
    t.className   = 'feed-preview__title';
    t.textContent = title ?? 'Feed erkannt';
    const s = document.createElement('div');
    s.textContent = 'Name wurde automatisch eingetragen.';
    el.appendChild(t);
    el.appendChild(s);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Befüllt das Kategorie-Dropdown mit allen Kategorien aus CONFIG.CATEGORIES.
 *
 * @returns {void}
 */
function _populateCategorySelect() {
  const sel = document.getElementById('cf-category');
  if (!sel || sel.options.length > 1) return;
  sel.textContent = '';
  for (const cat of Object.keys(CONFIG.CATEGORIES).sort()) {
    const opt = document.createElement('option');
    opt.value       = cat;
    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    sel.appendChild(opt);
  }
}

/**
 * Verarbeitet das Absenden des Custom-Feed-Formulars.
 *
 * @param {SubmitEvent} e
 * @returns {void}
 */
function _handleCustomFeedSubmit(e) {
  e.preventDefault();
  const form   = e.target;
  const result = addCustomFeed({
    name:     form.elements['cf-name']?.value,
    url:      form.elements['cf-url']?.value,
    category: form.elements['cf-category']?.value,
    language: form.elements['cf-language']?.value,
  });

  if (!result.success) {
    _showPreview(document.getElementById('feed-preview'), null, result.error);
    return;
  }

  form.reset();
  const preview = document.getElementById('feed-preview');
  if (preview) preview.style.display = 'none';
  _renderFeedManager();
  document.dispatchEvent(new CustomEvent('discophery:feeds-changed'));
}

// ─── Event-Verdrahtung ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-open-feed-manager')
    ?.addEventListener('click', openFeedManager);
  document.getElementById('btn-close-feed-manager')
    ?.addEventListener('click', closeFeedManager);
  document.getElementById('feed-manager-backdrop')
    ?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeFeedManager(); });
  document.getElementById('feed-search')
    ?.addEventListener('input', (e) => _filterFeeds(e.target.value));
  document.getElementById('btn-check-feed')
    ?.addEventListener('click', _checkFeedUrl);
  document.getElementById('custom-feed-form')
    ?.addEventListener('submit', _handleCustomFeedSubmit);

  // Nach Feed-Änderung neu laden
  document.addEventListener('discophery:feeds-changed', () => loadAllFeeds());
});

// --- Auto-generated global exports for Vite migration ---
(window as any).openFeedManager = openFeedManager;
(window as any).closeFeedManager = closeFeedManager;
(window as any)._renderFeedManager = _renderFeedManager;
(window as any)._createCategoryGroup = _createCategoryGroup;
(window as any)._createCustomFeedsGroup = _createCustomFeedsGroup;
(window as any)._createFeedRow = _createFeedRow;
(window as any)._createToggle = _createToggle;
(window as any)._updateGroupCounter = _updateGroupCounter;
(window as any)._filterFeeds = _filterFeeds;
(window as any)._checkFeedUrl = _checkFeedUrl;
(window as any)._showPreview = _showPreview;
(window as any)._populateCategorySelect = _populateCategorySelect;
(window as any)._handleCustomFeedSubmit = _handleCustomFeedSubmit;
