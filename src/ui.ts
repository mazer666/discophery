/**
 * @fileoverview Discophery — UI-Koordinator
 * Lauscht auf CustomEvents, schaltet Zustände, rendert Chips und Modals.
 * Setzt voraus: config.js, filter.js, feed.js, ui-cards.js
 */

// ── State ────────────────────────────────────────────────────────────────────

export let _allArticles    = [];
let _activeCategory = 'all';
let _activeSource   = null;
let _searchQuery    = '';
let _refreshTimer   = null;
let _contextArticle = null;

// ── Events — App-Lebenszyklus ─────────────────────────────────────────────────

document.addEventListener('discophery:articles', (e) => {
  _allArticles = e.detail.articles ?? [];
  try { localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_REFRESH, Date.now().toString()); } catch {}
  _renderUI();
  _startAutoRefresh();
});

document.addEventListener('discophery:filter-changed', () => {
  _renderUI();
  _renderSettingsContent();
});

document.addEventListener('discophery:context-menu-request', (e) => {
  _openContextMenu(e.detail.article);
});

document.addEventListener('discophery:source-filter-request', (e) => {
  _activeSource   = { id: e.detail.sourceId, name: e.detail.sourceName };
  _activeCategory = 'all';
  _renderUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Haupt-Render ──────────────────────────────────────────────────────────────

function _renderUI() {
  let pool = _activeCategory === 'all'
    ? _allArticles
    : _allArticles.filter(a => a.category === _activeCategory);
  if (_activeSource) pool = pool.filter(a => a.sourceId === _activeSource.id);

  if (_searchQuery) {
    pool = pool.filter(a => 
      a.title.toLowerCase().includes(_searchQuery) || 
      a.source.toLowerCase().includes(_searchQuery)
    );
  }

  const filtered = applyFilters(pool);
  _renderChips();

  if (_allArticles.length === 0) return;

  const grid = document.getElementById('card-grid');
  if (!grid) return;

  if (filtered.length === 0) { _showState('empty'); return; }

  _showState('content');
  renderCardGrid(_sortArticles(filtered), grid);
}

function _sortArticles(articles) {
  const order = localStorage.getItem(CONFIG.STORAGE_KEYS.SORT_ORDER) ?? 'date-desc';
  const copy  = [...articles];
  copy.sort(order === 'date-asc'
    ? (a, b) => a.date - b.date
    : (a, b) => b.date - a.date);
  return copy;
}

// ── Filter-Chips ──────────────────────────────────────────────────────────────

function _renderChips() {
  const nav = document.getElementById('filter-chips');
  if (!nav) return;

  const visibleArticles = _allArticles.filter(a => !a.dismissed);
  const categories = [...new Set(visibleArticles.map(a => a.category))].sort();

  while (nav.firstChild) nav.removeChild(nav.firstChild);
  if (_activeSource) nav.appendChild(_createSourceChip(_activeSource));
  nav.appendChild(_createChip('all', 'Alle'));
  for (const cat of categories) {
    nav.appendChild(_createChip(cat, cat.charAt(0).toUpperCase() + cat.slice(1)));
  }

  const bar   = document.getElementById('filter-active-bar');
  const label = document.getElementById('filter-active-label');
  if (bar) {
    const hasFilter = _activeCategory !== 'all' || _activeSource !== null;
    bar.style.display = hasFilter ? 'flex' : 'none';
    if (label && hasFilter) {
      const parts = [];
      if (_activeSource)             parts.push(_activeSource.name);
      if (_activeCategory !== 'all') parts.push(_activeCategory.charAt(0).toUpperCase() + _activeCategory.slice(1));
      label.textContent = 'Gefiltert: ' + parts.join(' · ');
    }
  }
}

function _createChip(category, label) {
  const btn = document.createElement('button');
  btn.className = 'chip' + (category === _activeCategory ? ' chip--active' : '');
  btn.textContent = label;
  btn.setAttribute('aria-pressed', category === _activeCategory ? 'true' : 'false');
  btn.addEventListener('click', () => {
    _activeCategory = category;
    _activeSource   = null;
    _renderUI();
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });
  return btn;
}

function _createSourceChip(source) {
  const btn = document.createElement('button');
  btn.className = 'chip chip--active chip--source';
  btn.setAttribute('aria-label', `Quellfilter "${source.name}" aufheben`);
  btn.textContent = source.name + ' ×';
  btn.addEventListener('click', () => { _activeSource = null; _renderUI(); });
  return btn;
}

function _clearFilters() {
  _activeCategory = 'all';
  _activeSource   = null;
  _renderUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Zustands-Management ───────────────────────────────────────────────────────

function _showState(state) {
  const ids = ['loading-indicator', 'error-message', 'empty-message', 'card-grid'];
  const map = { loading: 0, error: 1, empty: 2, content: 3 };
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.display = i === map[state] ? '' : 'none';
  });

  const filterBtn = document.getElementById('btn-clear-filter-from-empty');
  if (filterBtn) {
    const hasFilter = state === 'empty' && (_activeCategory !== 'all' || _activeSource !== null);
    filterBtn.style.display = hasFilter ? '' : 'none';
  }
}

// ── Context-Menü ──────────────────────────────────────────────────────────────

function _openContextMenu(article) {
  _contextArticle = article;
  const menu     = document.getElementById('context-menu');
  const backdrop = document.getElementById('context-menu-backdrop');
  const srcLabel = document.getElementById('ctx-block-source-label');
  const keyLabel = document.getElementById('ctx-block-keyword-label');
  const catLabel = document.getElementById('ctx-hide-category-label');

  if (srcLabel) srcLabel.textContent = `"${article.source}" blockieren`;
  if (keyLabel) {
    const kw = extractKeywordFromTitle(article.title);
    keyLabel.textContent  = `Keyword "${kw}" blockieren`;
    keyLabel.dataset.keyword = kw;
  }
  if (catLabel) catLabel.textContent = `Kategorie "${article.category}" ausblenden`;
  if (menu)     { menu.classList.add('context-menu--open'); menu.ariaHidden = 'false'; }
  if (backdrop) backdrop.style.display = '';
}

function _closeContextMenu() {
  const menu     = document.getElementById('context-menu');
  const backdrop = document.getElementById('context-menu-backdrop');
  if (menu)     { menu.classList.remove('context-menu--open'); menu.ariaHidden = 'true'; }
  if (backdrop) backdrop.style.display = 'none';
  _contextArticle = null;
}

// ── Einstellungs-Modal ────────────────────────────────────────────────────────

function _openSettingsModal() {
  const backdrop = document.getElementById('settings-modal-backdrop');
  if (!backdrop) return;
  _renderSettingsContent();
  _loadRefreshIntervalSetting();
  _loadSortSetting();
  _loadIconSizeSetting();
  backdrop.classList.add('modal-backdrop--open');
  backdrop.ariaHidden = 'false';
  document.getElementById('btn-close-settings')?.focus();
}

function _closeSettingsModal() {
  const backdrop = document.getElementById('settings-modal-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('modal-backdrop--open');
  backdrop.ariaHidden = 'true';
  document.getElementById('btn-settings')?.focus();
}

function _renderSettingsContent() {
  const container = document.getElementById('settings-content'); // Wir brauchen einen Wrapper im HTML
  if (!container) return;
  container.innerHTML = '';

  // 1. Karte: ANZEIGE
  container.appendChild(_createSettingsCard('Anzeige', [
    _createSettingsRow('Theme', _createSelect('select-theme', [
      { v: 'auto', t: 'Automatisch' },
      { v: 'light', t: 'Hell' },
      { v: 'dark', t: 'Dunkel' }
    ], localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) ?? 'auto', (e) => _applyTheme(e.target.value))),
    _createSettingsRow('Sortierung', _createSelect('select-sort-order', [
      { v: 'date-desc', t: 'Neueste zuerst' },
      { v: 'date-asc', t: 'Älteste zuerst' }
    ], localStorage.getItem(CONFIG.STORAGE_KEYS.SORT_ORDER) ?? 'date-desc', (e) => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SORT_ORDER, e.target.value);
      _renderUI();
    })),
    _createSettingsRow('Icon-Größe (px)', _createNumberInput('input-icon-size',
      parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.FAVICON_SIZE) ?? '', 10) || CONFIG.ICON_SIZE_DEFAULT,
      16, 48, (e) => {
        localStorage.setItem(CONFIG.STORAGE_KEYS.FAVICON_SIZE, e.target.value);
        // Live Update falls der Manager offen ist? (Optional)
      }))
  ]));

  // 2. Karte: INHALT
  const blockedSourcesContainer = document.createElement('div');
  blockedSourcesContainer.className = 'filter-tags-container';
  _renderFilterTags(blockedSourcesContainer, getBlockedSources(), 'Keine blockierten Quellen.', (id) => unblockSource(id));

  const blockedKeywordsContainer = document.createElement('div');
  blockedKeywordsContainer.className = 'filter-tags-container';
  _renderFilterTags(blockedKeywordsContainer, getBlockedKeywords(), 'Keine blockierten Keywords.', (kw) => unblockKeyword(kw));

  container.appendChild(_createSettingsCard('Filter & Quellen', [
    _createSettingsRow('', _createButton('btn-open-feed-manager-from-settings', 'Feeds verwalten →', 'btn--ghost', () => {
      _closeSettingsModal();
      openFeedManager();
    })),
    _createSettingsRow('Blockierte Quellen', blockedSourcesContainer),
    _createSettingsRow('Blockierte Keywords', blockedKeywordsContainer)
  ]));

  // 3. Karte: SYSTEM
  container.appendChild(_createSettingsCard('System', [
    _createSettingsRow('Sync-Intervall', _createSelect('select-refresh-interval', [
      { v: '0', t: 'Manuell' },
      { v: '5', t: '5 Min' },
      { v: '10', t: '10 Min' },
      { v: '30', t: '30 Min' },
      { v: '60', t: '60 Min' }
    ], localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL) ?? '30', (e) => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL, e.target.value);
      _startAutoRefresh();
    })),
    _createSettingsRow('', _createButton('btn-reset-all', 'Alle Daten zurücksetzen', 'btn--destructive', () => {
      if (resetAllData()) {
        _allArticles = []; _closeSettingsModal(); _showState('loading'); loadAllFeeds();
      }
    }))
  ]));
}

// ── Hilfsfunktionen für Card-UI ────────────────────────────────────────────────

function _createSettingsCard(title, rows) {
  const card = document.createElement('div');
  card.className = 'settings-card';
  const h3 = document.createElement('h3');
  h3.className = 'settings-card__title';
  h3.textContent = title;
  card.appendChild(h3);
  rows.forEach(r => card.appendChild(r));
  return card;
}

function _createSettingsRow(label, content) {
  const row = document.createElement('div');
  row.className = 'settings-row';
  if (label) {
    const lbl = document.createElement('label');
    lbl.textContent = label;
    row.appendChild(lbl);
  }
  row.appendChild(content);
  return row;
}

function _createSelect(id, options, current, onChange) {
  const sel = document.createElement('select');
  sel.id = id;
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.v; opt.textContent = o.t;
    if (o.v === current) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', onChange);
  return sel;
}

function _createNumberInput(id, val, min, max, onChange) {
  const inp = document.createElement('input');
  inp.type = 'number'; inp.id = id; inp.value = val; inp.min = min; inp.max = max;
  inp.addEventListener('change', onChange);
  return inp;
}

function _createButton(id, text, cls, onClick) {
  const btn = document.createElement('button');
  btn.id = id; btn.className = 'btn ' + cls + ' btn--full';
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function _renderFilterTags(container, items, emptyText, onRemove) {
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  if (items.length === 0) {
    const span = document.createElement('span');
    span.style.cssText = 'color:var(--color-text-tertiary);font-size:var(--font-size-sm)';
    span.textContent = emptyText;
    container.appendChild(span);
    return;
  }
  for (const item of items) {
    const tag    = document.createElement('span');
    tag.className = 'filter-tag';
    const lbl    = document.createElement('span');
    lbl.textContent = item;
    const btn    = document.createElement('button');
    btn.className = 'filter-tag__remove';
    btn.textContent = '×';
    btn.setAttribute('aria-label', `${item} entfernen`);
    btn.addEventListener('click', () => onRemove(item));
    tag.appendChild(lbl);
    tag.appendChild(btn);
    container.appendChild(tag);
  }
}

// ── Settings-Laden ────────────────────────────────────────────────────────────

function _startAutoRefresh() {
  if (_refreshTimer) clearInterval(_refreshTimer);
  const mins = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL) ?? '', 10)
    || CONFIG.REFRESH_INTERVAL_MINUTES;
  if (!mins) return;
  _refreshTimer = setInterval(() => loadAllFeeds(), mins * 60_000);
}

function _loadRefreshIntervalSetting() {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL);
  const sel = document.getElementById('select-refresh-interval');
  if (sel && saved !== null) sel.value = saved;
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
  const sel = document.getElementById('select-theme');
  if (sel) sel.value = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) ?? 'auto';
}

function _loadSortSetting() {
  const sel = document.getElementById('select-sort-order');
  if (sel) sel.value = localStorage.getItem(CONFIG.STORAGE_KEYS.SORT_ORDER) ?? 'date-desc';
}

function _loadIconSizeSetting() {
  const inp = document.getElementById('input-icon-size');
  if (inp) inp.value = localStorage.getItem(CONFIG.STORAGE_KEYS.FAVICON_SIZE) || CONFIG.ICON_SIZE_DEFAULT;
}

// ── Button-Verdrahtung ────────────────────────────────────────────────────────

function _wireStaticButtons() {
  document.getElementById('btn-refresh')
    ?.addEventListener('click', () => { _showState('loading'); loadAllFeeds(); });

  document.getElementById('input-app-search')
    ?.addEventListener('input', (e) => {
      _searchQuery = e.target.value.toLowerCase();
      _renderUI();
    });

  document.getElementById('btn-settings')    ?.addEventListener('click', _openSettingsModal);
  document.getElementById('btn-close-settings')?.addEventListener('click', _closeSettingsModal);
  document.getElementById('settings-modal-backdrop')
    ?.addEventListener('click', (e) => { if (e.target === e.currentTarget) _closeSettingsModal(); });


  document.getElementById('ctx-block-source')
    ?.addEventListener('click', () => {
      if (_contextArticle) blockSource(_contextArticle.sourceId);
      _closeContextMenu();
    });

  document.getElementById('ctx-block-keyword')
    ?.addEventListener('click', () => {
      const kw = document.getElementById('ctx-block-keyword-label')?.dataset.keyword;
      if (kw) blockKeyword(kw);
      _closeContextMenu();
    });

  document.getElementById('ctx-hide-category')
    ?.addEventListener('click', () => {
      if (!_contextArticle) { _closeContextMenu(); return; }
      // Alle Feeds dieser Kategorie blockieren — nur Quelle blockieren reicht nicht
      FEED_CATALOGUE.filter(f => f.category === _contextArticle.category)
        .forEach(f => blockSource(f.id));
      _closeContextMenu();
    });

  document.getElementById('context-menu-backdrop')?.addEventListener('click', _closeContextMenu);
  document.getElementById('btn-reset-filter')?.addEventListener('click', _clearFilters);
  document.getElementById('btn-clear-filter-from-empty')?.addEventListener('click', _clearFilters);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    _closeContextMenu();
    _closeSettingsModal();
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _wireStaticButtons();
  _showState('loading');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
});

// --- Auto-generated global exports for Vite migration ---
(window as any)._allArticles = _allArticles;
(window as any)._activeCategory = _activeCategory;
(window as any)._activeSource = _activeSource;
(window as any)._searchQuery = _searchQuery;
(window as any)._refreshTimer = _refreshTimer;
(window as any)._contextArticle = _contextArticle;
(window as any)._renderUI = _renderUI;
(window as any)._sortArticles = _sortArticles;
(window as any)._renderChips = _renderChips;
(window as any)._createChip = _createChip;
(window as any)._createSourceChip = _createSourceChip;
(window as any)._clearFilters = _clearFilters;
(window as any)._showState = _showState;
(window as any)._openContextMenu = _openContextMenu;
(window as any)._closeContextMenu = _closeContextMenu;
(window as any)._openSettingsModal = _openSettingsModal;
(window as any)._closeSettingsModal = _closeSettingsModal;
(window as any)._renderSettingsContent = _renderSettingsContent;
(window as any)._renderFilterTags = _renderFilterTags;
(window as any)._startAutoRefresh = _startAutoRefresh;
(window as any)._loadRefreshIntervalSetting = _loadRefreshIntervalSetting;
(window as any)._applyTheme = _applyTheme;
(window as any)._loadThemeSetting = _loadThemeSetting;
(window as any)._loadAuthSetting = _loadAuthSetting;
(window as any)._loadSortSetting = _loadSortSetting;
(window as any)._wireStaticButtons = _wireStaticButtons;
