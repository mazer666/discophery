/**
 * @fileoverview Discophery — UI-Koordinator
 * Lauscht auf CustomEvents, schaltet Zustände, rendert Chips und Modals.
 * Setzt voraus: config.js, filter.js, feed.js, ui-cards.js
 */

import { CONFIG } from './config';
import { applyFilters, extractKeywordFromTitle, blockSource, blockKeyword, unblockSource, unblockKeyword, getBlockedSources, getBlockedKeywords, resetAllData } from './filter';
import { FEED_CATALOGUE } from './feeds';
import { loadAllFeeds } from './feed';
import { renderCardGrid } from './ui-cards';
import { openFeedManager } from './feed-manager-ui';
import { getActiveFeeds } from './feed-manager';

// ── State ────────────────────────────────────────────────────────────────────

export let _allArticles    = [];
let _activeCategory = 'all';
let _activeSource   = null;
let _previewArticles = [];
let _searchQuery    = '';
let _refreshTimer   = null;
let _contextArticle = null;
let _shuffledArticles = null;
let _lastShuffledId = null; // Um zu erkennen ob wir neu mischen müssen

export function _ensureShellVisible() {
  const shell = document.getElementById('app-shell');
  if (shell) {
    shell.style.display = 'block';
    shell.ariaHidden = 'false';
  }
  _startAutoRefresh();
}

document.addEventListener('discophery:articles', ((e: CustomEvent) => {
  _allArticles = e.detail.articles ?? [];
  try { localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_REFRESH, Date.now().toString()); } catch {}
  _renderUI();
}) as EventListener);

document.addEventListener('discophery:filter-changed', () => {
  _renderUI();
  _renderSettingsContent();
});

document.addEventListener('discophery:context-menu-request', ((e: CustomEvent) => {
  _openContextMenu(e.detail.article);
}) as EventListener);

document.addEventListener('discophery:source-filter-request', ((e: CustomEvent) => {
  _activeSource   = { id: e.detail.sourceId, name: e.detail.sourceName };
  _activeCategory = 'all';
  _renderUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}) as EventListener);

document.addEventListener('discophery:preview-articles', ((e: CustomEvent) => {
  _previewArticles = e.detail.articles ?? [];
  _activeSource    = { id: e.detail.sourceId, name: e.detail.sourceName };
  _activeCategory  = 'all';
  _renderUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}) as EventListener);

// ── Haupt-Render ──────────────────────────────────────────────────────────────

function _renderUI() {
  let pool = _activeCategory === 'all'
    ? _allArticles
    : _allArticles.filter(a => a.category === _activeCategory);
  if (_activeSource) {
    const fromSubscribed = pool.filter(a => a.sourceId === _activeSource.id);
    pool = fromSubscribed.length > 0 ? fromSubscribed : _previewArticles.filter(a => a.sourceId === _activeSource.id);
  }

  if (_searchQuery) {
    pool = pool.filter(a => 
      a.title.toLowerCase().includes(_searchQuery) || 
      a.source.toLowerCase().includes(_searchQuery)
    );
  }

  const filtered = applyFilters(pool);
  _renderChips();

  // Erlaubt das Rendern auch wenn _allArticles leer ist (z.B. Preview-Modus)
  if (_allArticles.length === 0 && _previewArticles.length === 0) return;

  const grid = document.getElementById('card-grid');
  if (!grid) return;

  if (filtered.length === 0) { _showState('empty'); return; }

  _showState('content');
  renderCardGrid(_sortArticles(filtered), grid);
}

function _sortArticles(articles) {
  const order = localStorage.getItem(CONFIG.STORAGE_KEYS.SORT_ORDER) ?? 'date-desc';
  const copy  = [...articles];

  if (order === 'random') {
    // Wenn sich die Artikel geändert haben oder noch nie gemischt wurde: neu mischen
    // Wir nutzen eine einfache Heuristik: Summe der IDs oder einfach Länge + ID des ersten
    const currentId = articles.length > 0 ? (articles.length + articles[0].id) : 0;
    if (_shuffledArticles === null || _lastShuffledId !== currentId) {
      _shuffledArticles = _shuffleArray([...articles]);
      _lastShuffledId = currentId;
    }
    return _shuffledArticles;
  }

  // Für andere Sortierungen löschen wir den Cache
  _shuffledArticles = null;

  copy.sort((a, b) => {
    switch (order) {
      case 'date-asc':
        return a.date - b.date;
      case 'category-asc':
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        return b.date - a.date; // Sekundär: Neueste zuerst
      case 'category-desc':
        if (a.category < b.category) return 1;
        if (a.category > b.category) return -1;
        return b.date - a.date; // Sekundär: Neueste zuerst
      case 'date-desc':
      default:
        return b.date - a.date;
    }
  });

  return copy;
}

/**
 * Fisher-Yates Shuffle Algorithmus
 */
function _shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Filter-Chips ──────────────────────────────────────────────────────────────

function _renderChips() {
  const nav = document.getElementById('filter-chips');
  if (!nav) return;

  const visibleArticles = _allArticles.filter(a => !a.dismissed);
  const categories = [...new Set(visibleArticles.map(a => a.category))].sort();

  while (nav.firstChild) nav.removeChild(nav.firstChild);
  
  if (_activeSource) {
    // Falls eine Quelle aktiv ist, zeigen wir NUR den Quell-Chip (Wunsch: "nur Name der Quelle")
    nav.appendChild(_createSourceChip(_activeSource));
  } else {
    // Sonst Normalansicht mit Kategorien
    nav.appendChild(_createChip('all', 'Alle'));
    for (const cat of categories) {
      nav.appendChild(_createChip(cat, cat.charAt(0).toUpperCase() + cat.slice(1)));
    }
  }

  const bar   = document.getElementById('filter-active-bar');
  const label = document.getElementById('filter-active-label');
  if (bar) {
    const hasFilter = _activeCategory !== 'all' || _activeSource !== null;
    bar.style.display = hasFilter ? 'flex' : 'none';
      if (_activeSource) {
        label.textContent = _activeSource.name;
      } else if (_activeCategory !== 'all') {
        label.textContent = _activeCategory.charAt(0).toUpperCase() + _activeCategory.slice(1);
      }
  }
}

function _createChip(category, label) {
  const btn = document.createElement('button');
  btn.className = 'chip' + (category === _activeCategory ? ' chip--active' : '');
  btn.textContent = label;
  btn.setAttribute('aria-pressed', category === _activeCategory ? 'true' : 'false');
  btn.addEventListener('click', () => {
    _activeCategory  = category;
    _activeSource    = null;
    _previewArticles = [];
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
  btn.addEventListener('click', () => { _activeSource = null; _previewArticles = []; _renderUI(); });
  return btn;
}

function _clearFilters() {
  _activeCategory = 'all';
  _activeSource   = null;
  _renderUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Zustands-Management ───────────────────────────────────────────────────────

export function _showState(state: 'loading' | 'error' | 'empty' | 'content') {
  const loading = document.getElementById('loading-indicator');
  const error   = document.getElementById('error-message');
  const empty   = document.getElementById('empty-message');
  const grid    = document.getElementById('card-grid');

  if (loading) loading.style.display = (state === 'loading' ? 'flex' : 'none');
  if (error)   error.style.display   = (state === 'error'   ? 'flex' : 'none');
  if (empty)   empty.style.display   = (state === 'empty'   ? 'flex' : 'none');
  if (grid)    grid.style.display    = (state === 'content' ? 'grid' : 'none');

  if (state === 'empty') {
    const btn = document.getElementById('btn-clear-filter-from-empty');
    if (btn) {
      const hasFilter = _activeCategory !== 'all' || _activeSource !== null;
      btn.style.display = hasFilter ? 'block' : 'none';
    }
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
  backdrop.classList.add('modal-backdrop--open');
  backdrop.ariaHidden = 'false';
  const modal = document.getElementById('settings-modal');
  if (modal) modal.scrollTop = 0;
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
  const container = document.getElementById('settings-content');
  if (!container) return;
  container.innerHTML = '';

  // Icons
  const iconDisplay = `<svg class="settings-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
  const iconFilters = `<svg class="settings-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`;
  const iconSystem  = `<svg class="settings-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;

  // 1. Karte: ANZEIGE
  container.appendChild(_createSettingsCard('Anzeige', iconDisplay, [
    _createSettingsRow('Theme', _createSelect('select-theme', [
      { v: 'auto', t: 'Automatisch' },
      { v: 'light', t: 'Hell' },
      { v: 'dark', t: 'Dunkel' }
    ], localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) ?? 'auto', (e) => _applyTheme((e.target as HTMLSelectElement).value))),
    _createSettingsRow('Sortierung', _createSelect('select-sort-order', [
      { v: 'date-desc', t: 'Datum (Neueste zuerst)' },
      { v: 'date-asc', t: 'Datum (Älteste zuerst)' },
      { v: 'category-asc', t: 'Themengebiet (A-Z)' },
      { v: 'category-desc', t: 'Themengebiet (Z-A)' },
      { v: 'random', t: 'Zufällig (Mix)' }
    ], localStorage.getItem(CONFIG.STORAGE_KEYS.SORT_ORDER) ?? 'date-desc', (e) => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SORT_ORDER, (e.target as HTMLSelectElement).value);
      _renderUI();
    })),
    _createSettingsRow('Icon-Größe', _createIconSizePicker())
  ]));

  // 2. Karte: INHALT
  const blockedSourcesContainer = document.createElement('div');
  blockedSourcesContainer.className = 'filter-tags-container';
  _renderFilterTags(blockedSourcesContainer, getBlockedSources(), 'Keine blockierten Quellen.', (id) => unblockSource(id));

  const blockedKeywordsContainer = document.createElement('div');
  blockedKeywordsContainer.className = 'filter-tags-container';
  _renderFilterTags(blockedKeywordsContainer, getBlockedKeywords(), 'Keine blockierten Keywords.', (kw) => unblockKeyword(kw));

  container.appendChild(_createSettingsCard('Inhalt & Filter', iconFilters, [
    _createFeedsNavRow(),
    _createSettingsRow('Sync-Intervall', _createSyncIntervalPicker()),
    _createSettingsRow('Paywall-Filter', _createToggle('toggle-hide-paywall', 'Paywall-Artikel ausblenden', 
      localStorage.getItem(CONFIG.STORAGE_KEYS.HIDE_PAYWALL) === 'true', 
      (e) => {
        const val = (e.target as HTMLInputElement).checked;
        localStorage.setItem(CONFIG.STORAGE_KEYS.HIDE_PAYWALL, String(val));
        _renderUI();
      })),
    _createSettingsRow('Blockierte Quellen', blockedSourcesContainer),
    _createSettingsRow('Blockierte Keywords', blockedKeywordsContainer)
  ]));

  // 3. Karte: SYSTEM
  container.appendChild(_createSettingsCard('System', iconSystem, [
    _createSettingsRow('', _createButton('btn-reset-all', 'Alle Daten zurücksetzen', 'btn--destructive', () => {
      if (confirm('Möchtest du wirklich alle lokalen Daten (Feeds, Filter, Einstellungen) zurücksetzen?')) {
        if (resetAllData()) {
          _allArticles = []; _closeSettingsModal(); _showState('loading'); loadAllFeeds();
        }
      }
    }))
  ]));
}

// ── Hilfsfunktionen für Card-UI ────────────────────────────────────────────────

function _createFeedsNavRow() {
  const btn = document.createElement('button');
  btn.id = 'btn-open-feed-manager-from-settings';
  btn.className = 'settings-feeds-btn';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
    <span>Feeds verwalten</span>
    <svg class="settings-feeds-btn__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
  `;
  btn.addEventListener('click', () => {
    _closeSettingsModal();
    setTimeout(openFeedManager, 300);
  });
  return btn;
}

function _createSettingsCard(title, iconSvg, rows) {
  const card = document.createElement('div');
  card.className = 'settings-card';

  const h3 = document.createElement('h3');
  h3.className = 'settings-card__title';
  h3.innerHTML = `${iconSvg} <span>${title}</span>`;
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

function _createIconSizePicker() {
  const sizes = [12, 24];
  const current = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.FAVICON_SIZE) ?? '', 10) || CONFIG.ICON_SIZE_DEFAULT;
  const wrap = document.createElement('div');
  wrap.className = 'icon-size-picker';
  for (const size of sizes) {
    const btn = document.createElement('button');
    btn.className = 'btn btn--ghost icon-size-picker__btn' + (current === size ? ' icon-size-picker__btn--active' : '');
    btn.textContent = size + ' px';
    btn.addEventListener('click', () => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.FAVICON_SIZE, String(size));
      wrap.querySelectorAll('.icon-size-picker__btn').forEach(b => b.classList.remove('icon-size-picker__btn--active'));
      btn.classList.add('icon-size-picker__btn--active');
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

function _createSyncIntervalPicker() {
  const intervals = [
    { v: 0,   t: 'Manuell' },
    { v: 5,   t: '5m' },
    { v: 10,  t: '10m' },
    { v: 15,  t: '15m' },
    { v: 20,  t: '20m' },
    { v: 30,  t: '30m' },
    { v: 45,  t: '45m' },
    { v: 60,  t: '60m' },
    { v: 120, t: '2h' },
  ];
  const current = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL) ?? '', 10) 
    ?? CONFIG.REFRESH_INTERVAL_MINUTES;
    
  const wrap = document.createElement('div');
  wrap.className = 'icon-size-picker'; // Wir nutzen das gleiche Styling
  for (const interval of intervals) {
    const btn = document.createElement('button');
    btn.className = 'btn btn--ghost icon-size-picker__btn' + (current === interval.v ? ' icon-size-picker__btn--active' : '');
    btn.textContent = interval.t;
    btn.addEventListener('click', () => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_INTERVAL, String(interval.v));
      wrap.querySelectorAll('.icon-size-picker__btn').forEach(b => b.classList.remove('icon-size-picker__btn--active'));
      btn.classList.add('icon-size-picker__btn--active');
      _startAutoRefresh();
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

function _createButton(id, text, cls, onClick) {
  const btn = document.createElement('button');
  btn.id = id; btn.className = 'btn ' + cls;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function _createToggle(id, label, isChecked, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'toggle-switch';
  
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = isChecked;
  input.addEventListener('change', onChange);
  
  const slider = document.createElement('span');
  slider.className = 'toggle-switch__slider';
  
  const text = document.createElement('span');
  text.className = 'toggle-switch__text';
  text.textContent = label;
  
  wrap.appendChild(input);
  wrap.appendChild(slider);
  wrap.appendChild(text);
  
  return wrap;
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

function _applyTheme(value) {
  if (value === 'light' || value === 'dark') {
    document.documentElement.dataset.theme = value;
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, value);
  } else {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.THEME);
  }
}

// ── Button-Verdrahtung ────────────────────────────────────────────────────────

function _wireStaticButtons() {
  document.getElementById('btn-refresh')
    ?.addEventListener('click', () => { _showState('loading'); loadAllFeeds(); });

  document.getElementById('input-app-search')
    ?.addEventListener('input', (e) => {
      _searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
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
(window as any)._ensureShellVisible = _ensureShellVisible;
(window as any)._startAutoRefresh = _startAutoRefresh;
(window as any)._applyTheme = _applyTheme;
(window as any)._wireStaticButtons = _wireStaticButtons;
