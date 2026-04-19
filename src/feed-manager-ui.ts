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
export function openFeedManager() {
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
  if (!('ontouchstart' in window)) document.getElementById('feed-search')?.focus();
}

/**
 * Schließt das Feed-Manager Modal.
 *
 * @returns {void}
 */
export function closeFeedManager() {
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
  const list   = document.getElementById('feed-list');
  const modal  = document.getElementById('feed-manager');
  if (!list) return;
  const savedScroll = modal?.scrollTop ?? 0;
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
  if (modal && savedScroll > 0) requestAnimationFrame(() => { modal.scrollTop = savedScroll; });
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

  // Kategorie-Icons (SVG, inline)
  const S = (p: string) => `<svg class="feed-group__cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const categoryIcons: Record<string, string> = {
    'news':         S('<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/>'),
    'politik':      S('<line x1="12" y1="22" x2="12" y2="11"/><path d="M17 22V11l-5-9-5 9v11"/><line x1="7" y1="16" x2="17" y2="16"/>'),
    'lokal':        S('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
    'tech':         S('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3 8 3"/><path d="M12 3v4"/>'),
    'web':          S('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
    'android':      S('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><line x1="9.5" y1="15" x2="9.5" y2="17"/><line x1="14.5" y1="15" x2="14.5" y2="17"/><line x1="7" y1="7" x2="5.5" y2="5"/><line x1="17" y1="7" x2="18.5" y2="5"/>'),
    'mobile':       S('<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>'),
    'gadgets':      S('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/>'),
    'gaming':       S('<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="11" r="1"/><circle cx="17" cy="13" r="1"/><path d="M20 8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"/>'),
    'film':         S('<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>'),
    'musik':        S('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    'design':       S('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>'),
    'wissenschaft': S('<path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0-4 7h14l-4-7M9 14h6"/>'),
    'weltraum':     S('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m3.5 5.5 3 3 2-2L5 3a5 5 0 0 0-1.5 2.5z"/><path d="m12.5 14.5-3-3-2 2 3.5 3.5a5 5 0 0 0 1.5-2.5z"/><path d="M5 3a16.38 16.38 0 0 1 16 16 5 5 0 0 1-5 5c-4-1-6-4-6-4s-3-2-4-6a5 5 0 0 1 5-5z"/>'),
    'wirtschaft':   S('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>'),
    'fotografie':   S('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
    'maker':        S('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
    'auto':         S('<path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2m-3 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0m7 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/><polyline points="9 3 9 8 19 8"/>'),
    'umwelt':       S('<path d="M2 22c1.25-1.25 2.5-2.5 3.75-3.75C9 15 10 12 10 9a7 7 0 0 1 14 0c0 5-4 9-8 13"/><path d="M18 9v.01"/><path d="M12 12c-1.5 1.5-3 3-4 5"/>'),
    'sport':        S('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/><path d="m8 8 4 4 4-4"/>'),
    'fashion':      S('<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>'),
    'lifestyle':    S('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>'),
    'magazine':     S('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  };
  const catIcon = categoryIcons[cat.toLowerCase()] ?? S('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>');

  const titleEl = document.createElement('span');
  titleEl.className   = 'feed-group__title';
  titleEl.innerHTML = `${catIcon} <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>`;

  const badge = document.createElement('span');
  badge.className   = 'feed-group__count' + (activeCount > 0 ? ' feed-group__count--active' : '');
  badge.textContent = `${activeCount}/${feeds.length}`;
  badge.dataset.cat = cat;

  const bulkBtn = document.createElement('button');
  bulkBtn.className = 'feed-group__bulk-btn';
  bulkBtn.title = (activeCount === feeds.length) ? 'Alle deaktivieren' : 'Alle aktivieren';
  
  // Icons für Bulk-Aktionen
  const iconCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const iconPlus  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></svg>`;
  
  bulkBtn.innerHTML = (activeCount === feeds.length) ? iconCheck : iconPlus;
  if (activeCount === feeds.length) bulkBtn.style.color = 'var(--color-success)';

  bulkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const shouldActivate = activeCount < feeds.length;
    setCategoryActive(cat, shouldActivate);
    _renderFeedManager();
    document.dispatchEvent(new CustomEvent('discophery:feeds-changed'));
  });

  const arrow = document.createElement('span');
  arrow.className   = 'feed-group__arrow';
  arrow.innerHTML   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  const leftSide = document.createElement('div');
  leftSide.className = 'feed-group__summary-left';
  leftSide.appendChild(titleEl);
  leftSide.appendChild(badge);

  summary.appendChild(leftSide);
  summary.appendChild(bulkBtn);
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
  title.innerHTML = `<span>⭐</span> <span>Eigene Feeds</span>`;

  const arrow = document.createElement('span');
  arrow.className   = 'feed-group__arrow';
  arrow.innerHTML   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

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

  // --- Favicon hinzufügen ---
  const iconSize = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.FAVICON_SIZE) ?? '', 10) || CONFIG.ICON_SIZE_DEFAULT;
  const icon = document.createElement('img');
  icon.className = 'feed-row__icon';
  // Fallback zu einem generischen Icon falls Domain nicht extractbar
  let domain = '';
  try { domain = new URL(feed.url).hostname; } catch {}
  icon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=${iconSize * 2}`; // Höhere Auflösung für Retina
  icon.style.width = iconSize + 'px';
  icon.style.height = iconSize + 'px';
  icon.alt = '';
  row.appendChild(icon);

  const info = document.createElement('div');
  info.className = 'feed-row__info';
  info.style.cursor = 'pointer';
  info.title = 'Nur Artikel dieses Feeds anzeigen';

  // Klick auf Medienname → Manager schließen + Quellen-Filter setzen (kein Auto-Abonnieren)
  info.addEventListener('click', () => {
    closeFeedManager();
    if (!isCustom && !isFeedActive(feed.id)) {
      // Vorschau laden ohne Abo-Status zu ändern
      (window as any).previewFeedSource(feed);
    }
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
(window as any).setFeedActive = setFeedActive;
(window as any).setCategoryActive = setCategoryActive;
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
