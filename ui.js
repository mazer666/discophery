/**
 * @fileoverview Discophery — UI-Koordinator
 *
 * Verantwortlichkeiten:
 *  - Auf CustomEvents lauschen und die UI-Zustände schalten
 *  - Filter-Chips rendern und Kategorie-Filter anwenden
 *  - Lade-, Fehler- und Leerzustand verwalten
 *  - Context-Menü ("Weniger davon") steuern
 *  - Einstellungs-Modal befüllen und steuern
 *  - Auto-Refresh-Timer starten
 *
 * Setzt voraus: config.js, filter.js, feed.js, ui-cards.js
 *
 * Alex: Dieser Koordinator schreibt kein HTML direkt —
 * Card-Erstellung liegt in ui-cards.js, Daten-Logik in filter.js.
 */

// ═══════════════════════════════════════════════════════════════════════════
// APP-STATE
// ═══════════════════════════════════════════════════════════════════════════

/** Alle zuletzt geladenen Artikel (ungefiltert nach Kategorie) */
let _allArticles = [];

/** Aktuell gewählte Kategorie ('all' oder ein Kategorie-Key aus config.js) */
let _activeCategory = 'all';

/** Timer-ID für Auto-Refresh (clearInterval beim manuellen Refresh) */
let _refreshTimer = null;

/** Artikel für das aktuell offene Context-Menü */
let _contextArticle = null;

// ═══════════════════════════════════════════════════════════════════════════
// EVENT-LISTENER — App-Lebenszyklus
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Neue Artikel von feed.js empfangen und rendern.
 * Speichert den Zeitpunkt in localStorage für den "Zuletzt aktualisiert"-Hinweis.
 */
document.addEventListener('discophery:articles', (e) => {
  _allArticles = e.detail.articles ?? [];

  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_REFRESH, Date.now().toString());
  } catch { /* localStorage voll — unkritisch */ }

  _renderUI();
  _startAutoRefresh();
});

/**
 * Filter geändert (blockSource, blockKeyword etc.) → neu rendern.
 * _allArticles bleibt unverändert — nur die Ansicht filtert neu.
 */
document.addEventListener('discophery:filter-changed', () => {
  _renderUI();
  _renderSettingsContent();
});

/**
 * Card-Button hat "Weniger davon" angefordert → Context-Menü öffnen.
 */
document.addEventListener('discophery:context-menu-request', (e) => {
  _openContextMenu(e.detail.article);
});

// ═══════════════════════════════════════════════════════════════════════════
// HAUPT-RENDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rendert die gesamte UI neu basierend auf aktuellem State und Filtern.
 * Einziger Einstiegspunkt für alle Render-Operationen.
 *
 * @returns {void}
 */
function _renderUI() {
  const filtered = applyFilters(
    _activeCategory === 'all'
      ? _allArticles
      : _allArticles.filter(a => a.category === _activeCategory)
  );

  _renderChips();

  if (_allArticles.length === 0) {
    // Noch kein Ladevorgang abgeschlossen
    return;
  }

  const grid = document.getElementById('card-grid');
  if (!grid) return;

  if (filtered.length === 0) {
    _showState('empty');
    return;
  }

  _showState('content');
  renderCardGrid(filtered, grid);  // ui-cards.js
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER-CHIPS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rendert die Kategorie-Chips basierend auf den aktuell vorhandenen Artikeln.
 * Nur Kategorien die mindestens einen nicht-dismissed Artikel haben erscheinen.
 *
 * @returns {void}
 */
function _renderChips() {
  const nav = document.getElementById('filter-chips');
  if (!nav) return;

  // Kategorien ermitteln die sichtbare Artikel haben
  const visibleArticles = _allArticles.filter(a => !a.dismissed);
  const categories = [...new Set(visibleArticles.map(a => a.category))].sort();

  while (nav.firstChild) nav.removeChild(nav.firstChild);

  // "Alle"-Chip immer zuerst
  nav.appendChild(_createChip('all', 'Alle'));

  for (const cat of categories) {
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    nav.appendChild(_createChip(cat, label));
  }
}

/**
 * Erstellt einen einzelnen Chip-Button.
 *
 * @param {string} category - Kategorie-Key oder 'all'
 * @param {string} label    - Anzeigename
 * @returns {HTMLButtonElement}
 */
function _createChip(category, label) {
  const btn = document.createElement('button');
  btn.className   = 'chip' + (category === _activeCategory ? ' chip--active' : '');
  btn.textContent = label;
  btn.setAttribute('aria-pressed', category === _activeCategory ? 'true' : 'false');

  btn.addEventListener('click', () => {
    _activeCategory = category;
    _renderUI();

    // Chip in den sichtbaren Bereich scrollen
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });

  return btn;
}

// ═══════════════════════════════════════════════════════════════════════════
// ZUSTANDS-MANAGEMENT (Laden / Fehler / Leer / Inhalt)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schaltet zwischen den UI-Zuständen um.
 *
 * @param {'loading'|'error'|'empty'|'content'} state
 * @returns {void}
 */
function _showState(state) {
  const loading = document.getElementById('loading-indicator');
  const error   = document.getElementById('error-message');
  const empty   = document.getElementById('empty-message');
  const grid    = document.getElementById('card-grid');

  if (loading) loading.style.display = state === 'loading' ? ''      : 'none';
  if (error)   error.style.display   = state === 'error'   ? ''      : 'none';
  if (empty)   empty.style.display   = state === 'empty'   ? ''      : 'none';
  if (grid)    grid.style.display    = state === 'content'  ? ''      : 'none';
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-MENÜ ("WENIGER DAVON")
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Öffnet das Context-Menü für einen Artikel.
 * Befüllt die Labels mit Quelle, Keyword und Kategorie des Artikels.
 *
 * @param {import('./feed.js').DiscopheryArticle} article
 * @returns {void}
 */
function _openContextMenu(article) {
  _contextArticle = article;

  const menu        = document.getElementById('context-menu');
  const backdrop    = document.getElementById('context-menu-backdrop');
  const sourceLabel = document.getElementById('ctx-block-source-label');
  const keyLabel    = document.getElementById('ctx-block-keyword-label');
  const catLabel    = document.getElementById('ctx-hide-category-label');

  // Labels per textContent setzen — kein innerHTML (Sam)
  if (sourceLabel) sourceLabel.textContent = `"${article.source}" blockieren`;
  if (keyLabel) {
    const keyword = extractKeywordFromTitle(article.title);  // filter.js
    keyLabel.textContent = `Keyword "${keyword}" blockieren`;
    keyLabel.dataset.keyword = keyword;
  }
  if (catLabel) catLabel.textContent = `Kategorie "${article.category}" ausblenden`;

  if (menu)     menu.classList.add('context-menu--open');
  if (menu)     menu.ariaHidden = 'false';
  if (backdrop) backdrop.style.display = '';
}

/**
 * Schließt das Context-Menü.
 *
 * @returns {void}
 */
function _closeContextMenu() {
  const menu     = document.getElementById('context-menu');
  const backdrop = document.getElementById('context-menu-backdrop');

  if (menu)     menu.classList.remove('context-menu--open');
  if (menu)     menu.ariaHidden = 'true';
  if (backdrop) backdrop.style.display = 'none';

  _contextArticle = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EINSTELLUNGS-MODAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Öffnet das Einstellungs-Modal und befüllt es mit aktuellen Filter-Daten.
 *
 * @returns {void}
 */
function _openSettingsModal() {
  const backdrop = document.getElementById('settings-modal-backdrop');
  if (!backdrop) return;

  _renderSettingsContent();
  _loadRefreshIntervalSetting();
  _loadThemeSetting();
  backdrop.classList.add('modal-backdrop--open');
  backdrop.ariaHidden = 'false';
  // Fokus auf Schließen-Button für Tastaturnutzer
  document.getElementById('btn-close-settings')?.focus();
}

/**
 * Schließt das Einstellungs-Modal.
 *
 * @returns {void}
 */
function _closeSettingsModal() {
  const backdrop = document.getElementById('settings-modal-backdrop');
  if (!backdrop) return;

  backdrop.classList.remove('modal-backdrop--open');
  backdrop.ariaHidden = 'true';
  document.getElementById('btn-settings')?.focus();
}

/**
 * Rendert den Inhalt des Einstellungs-Modals neu.
 * Wird bei jedem Öffnen und nach jeder Filter-Änderung aufgerufen.
 *
 * @returns {void}
 */
function _renderSettingsContent() {
  _renderFilterTags(
    document.getElementById('settings-blocked-sources'),
    getBlockedSources(),   // filter.js
    'Keine blockierten Quellen.',
    (id) => unblockSource(id)  // filter.js
  );

  _renderFilterTags(
    document.getElementById('settings-blocked-keywords'),
    getBlockedKeywords(),  // filter.js
    'Keine blockierten Keywords.',
    (kw) => unblockKeyword(kw)  // filter.js
  );
}

/**
 * Rendert eine Liste von Filter-Tags (Chips mit Entfernen-Button) in einen Container.
 *
 * @param {HTMLElement|null} container   - Ziel-Element
 * @param {string[]}         items       - Anzuzeigende Einträge
 * @param {string}           emptyText   - Text wenn Liste leer
 * @param {Function}         onRemove    - Callback(item) beim Entfernen
 * @returns {void}
 */
function _renderFilterTags(container, items, emptyText, onRemove) {
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  if (items.length === 0) {
    const span = document.createElement('span');
    span.style.cssText = 'color:var(--color-text-tertiary);font-size:var(--font-size-sm)';
    span.textContent   = emptyText;
    container.appendChild(span);
    return;
  }

  for (const item of items) {
    const tag    = document.createElement('span');
    tag.className = 'filter-tag';

    const label  = document.createElement('span');
    label.textContent = item;

    const remove = document.createElement('button');
    remove.className   = 'filter-tag__remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `${item} entfernen`);
    remove.addEventListener('click', () => onRemove(item));

    tag.appendChild(label);
    tag.appendChild(remove);
    container.appendChild(tag);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-REFRESH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Startet den Auto-Refresh-Timer wenn REFRESH_INTERVAL_MINUTES > 0.
 * Setzt einen laufenden Timer zurück bevor ein neuer gestartet wird.
 *
 * @returns {void}
 */
function _startAutoRefresh() {
  if (_refreshTimer) clearInterval(_refreshTimer);
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL);
  const mins  = saved !== null ? parseInt(saved, 10) : CONFIG.REFRESH_INTERVAL_MINUTES;
  if (!mins) return;
  _refreshTimer = setInterval(() => loadAllFeeds(), mins * 60_000);  // feed.js
}

function _loadRefreshIntervalSetting() {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL);
  if (saved === null) return;
  const sel = document.getElementById('select-refresh-interval');
  if (sel) sel.value = saved;
}

function _applyTheme(value) {
  if (value === 'light' || value === 'dark') {
    document.documentElement.dataset.theme = value;
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, value);
  } else {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.THEME);
  }
}

function _loadThemeSetting() {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
  const sel   = document.getElementById('select-theme');
  if (sel) sel.value = saved ?? 'auto';
}

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON-VERDRAHTUNG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verdrahtet alle statischen Buttons die im HTML bereits vorhanden sind.
 * Wird einmalig beim DOMContentLoaded aufgerufen.
 *
 * @returns {void}
 */
function _wireStaticButtons() {
  // Refresh
  document.getElementById('btn-refresh')
    ?.addEventListener('click', () => {
      _showState('loading');
      loadAllFeeds();  // feed.js
    });

  // Einstellungen öffnen / schließen
  document.getElementById('btn-settings')
    ?.addEventListener('click', _openSettingsModal);
  document.getElementById('btn-close-settings')
    ?.addEventListener('click', _closeSettingsModal);

  // Klick auf Modal-Backdrop schließt das Modal
  document.getElementById('settings-modal-backdrop')
    ?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) _closeSettingsModal();
    });

  // Erscheinungsbild (Theme)
  document.getElementById('select-theme')
    ?.addEventListener('change', (e) => _applyTheme(e.target.value));

  // Auto-Sync-Intervall
  document.getElementById('select-refresh-interval')
    ?.addEventListener('change', (e) => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL, e.target.value);
      _startAutoRefresh();
    });

  // Alle Daten zurücksetzen
  document.getElementById('btn-reset-all')
    ?.addEventListener('click', () => {
      if (resetAllData()) {  // filter.js — zeigt confirm()-Dialog
        _allArticles    = [];
        _activeCategory = 'all';
        _closeSettingsModal();
        _showState('loading');
        loadAllFeeds();  // feed.js
      }
    });

  // Context-Menü: Quelle blockieren
  document.getElementById('ctx-block-source')
    ?.addEventListener('click', () => {
      if (_contextArticle) blockSource(_contextArticle.sourceId);  // filter.js
      _closeContextMenu();
    });

  // Context-Menü: Keyword blockieren
  document.getElementById('ctx-block-keyword')
    ?.addEventListener('click', () => {
      const label = document.getElementById('ctx-block-keyword-label');
      const kw    = label?.dataset.keyword;
      if (kw) blockKeyword(kw);  // filter.js
      _closeContextMenu();
    });

  // Context-Menü: Kategorie ausblenden (als Quelle blockieren reicht nicht —
  // deshalb blockieren wir alle sourceIds dieser Kategorie)
  document.getElementById('ctx-hide-category')
    ?.addEventListener('click', () => {
      if (!_contextArticle) { _closeContextMenu(); return; }
      const cat = _contextArticle.category;
      // Alle Feeds dieser Kategorie blockieren
      FEED_CATALOGUE
        .filter(f => f.category === cat)
        .forEach(f => blockSource(f.id));  // filter.js
      _closeContextMenu();
    });

  // Context-Menü-Backdrop schließt Menü
  document.getElementById('context-menu-backdrop')
    ?.addEventListener('click', _closeContextMenu);

  // Escape-Taste schließt offene Overlays
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    _closeContextMenu();
    _closeSettingsModal();
  });
}

// ─── Start ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _wireStaticButtons();
  _showState('loading');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
