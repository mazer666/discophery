/**
 * @fileoverview Discophery — Card-Rendering & Swipe-Gesten
 *
 * Verantwortlichkeiten:
 *  - Artikel-Cards als DOM-Elemente erstellen (nur createElement/textContent)
 *  - Cards in den Card-Grid rendern
 *  - Swipe-to-Dismiss (Touch) + Dismiss-Button (Desktop)
 *  - "Weniger davon"-Button → feuert CustomEvent für ui.js
 *  - Relatives Datum formatieren
 *
 * Setzt voraus: config.js, filter.js
 * Kommuniziert mit ui.js via 'discophery:context-menu-request' CustomEvent.
 *
 * Sam: Kein innerHTML mit externen Daten — alle Artikel-Inhalte gehen
 * ausschließlich über textContent oder als Attributwert (href, src).
 */

import { CONFIG } from './config';
import { dismissArticle, undismissArticle } from './filter';

/** Mindest-Swipe-Distanz in px bis Dismiss ausgelöst wird */
const SWIPE_THRESHOLD = 80;

/** Ab dieser Distanz (px) gilt ein Touch als Swipe — darunter als Tap */
const SWIPE_TAP_LIMIT = 5;

/** Undo-Toast: aktives Element und Timer */
let _undoToastEl = null;
let _undoTimer   = null;

// ═══════════════════════════════════════════════════════════════════════════
// ÖFFENTLICHE API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rendert alle Artikel-Cards in den Grid-Container.
 * Löscht vorherigen Inhalt und baut alles neu auf.
 *
 * @param {import('./feed.js').DiscopheryArticle[]} articles - Gefilterte Artikel
 * @param {HTMLElement}                             container - #card-grid Element
 * @returns {void}
 */
export function renderCardGrid(articles, container) {
  // Vorherigen Inhalt leeren ohne innerHTML (Sam)
  while (container.firstChild) container.removeChild(container.firstChild);

  for (const article of articles) {
    const card = _createCard(article);
    container.appendChild(card);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD ERSTELLEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt eine vollständige Card als DOM-Element.
 * Gibt einen <article>-Node zurück der direkt ins Grid eingefügt werden kann.
 *
 * @param {import('./feed.js').DiscopheryArticle} article
 * @returns {HTMLElement}
 */
function _createCard(article) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.articleId  = article.id;
  card.dataset.sourceId   = article.sourceId;
  card.dataset.category   = article.category;

  // Kategorie-Farben als CSS Custom Properties direkt auf dem Element —
  // Maya: so kommen die Farben aus config.js ohne CSS-Klassen-Explosion
  const catStyle = CONFIG.CATEGORIES[article.category];
  if (catStyle) {
    card.style.setProperty('--cat-bg',   catStyle.bg);
    card.style.setProperty('--cat-text', catStyle.text);
  }

  // Vorschaubild
  if (article.image) {
    card.appendChild(_createImageWrap(article));
  }

  // Card-Body
  card.appendChild(_createCardBody(article));

  // Action-Buttons (Dismiss + Weniger davon)
  card.appendChild(_createActionButtons(article));

  // Swipe-Geste initialisieren
  _setupSwipe(card, article);

  return card;
}

/**
 * Erstellt den Bild-Bereich der Card.
 *
 * @param {import('./feed.js').DiscopheryArticle} article
 * @returns {HTMLElement}
 */
function _createImageWrap(article) {
  const wrap = document.createElement('div');
  wrap.className = 'card__image-wrap';

  const link = document.createElement('a');
  link.href   = article.url;
  link.target = '_blank';
  link.rel    = 'noopener noreferrer';
  link.setAttribute('aria-label', article.title);
  link.tabIndex = -1;  // Bild-Link nicht im Tab-Flow — Titel-Link reicht

  const img = document.createElement('img');
  img.className = 'card__image';
  img.src       = article.image;
  img.alt       = '';  // Dekorativ — Titel ist der zugängliche Text
  img.loading   = 'lazy';
  // Fehlerfall: Bild nicht ladbar → Wrap ausblenden statt kaputtes Icon zeigen
  img.addEventListener('error', () => { wrap.style.display = 'none'; });

  link.appendChild(img);
  wrap.appendChild(link);
  return wrap;
}

/**
 * Erstellt den Textteil der Card (Meta, Titel, Beschreibung, Kategorie-Chip).
 *
 * @param {import('./feed.js').DiscopheryArticle} article
 * @returns {HTMLElement}
 */
function _createCardBody(article) {
  const body = document.createElement('div');
  body.className = 'card__body';

  // Meta-Zeile: Quelle · Datum
  const meta   = document.createElement('div');
  meta.className = 'card__meta';

  const source = document.createElement('button');
  source.className   = 'card__source';
  source.textContent = article.source;
  source.addEventListener('click', (e) => {
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('discophery:source-filter-request', {
      detail: { sourceId: article.sourceId, sourceName: article.source },
    }));
  });

  const sep  = document.createElement('span');
  sep.textContent    = '·';
  sep.ariaHidden     = 'true';
  sep.style.color    = 'var(--color-text-tertiary)';

  const date = document.createElement('time');
  date.className       = 'card__date';
  date.dateTime        = article.date.toISOString();
  date.textContent     = _formatRelativeDate(article.date);
  date.title           = article.date.toLocaleString('de-AT');

  meta.appendChild(source);
  meta.appendChild(sep);
  meta.appendChild(date);

  if (article.isPaywall) {
    const paywall = document.createElement('span');
    paywall.className = 'card__paywall-badge';
    paywall.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px; vertical-align:middle"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Paywall';
    meta.appendChild(sep.cloneNode(true));
    meta.appendChild(paywall);
  }

  body.appendChild(meta);

  // Titel als Link
  const titleLink = document.createElement('a');
  titleLink.href   = article.url;
  titleLink.target = '_blank';
  titleLink.rel    = 'noopener noreferrer';

  const title = document.createElement('h2');
  title.className   = 'card__title';
  title.textContent = article.title;

  titleLink.appendChild(title);
  body.appendChild(titleLink);

  // Beschreibung
  if (article.description) {
    const desc = document.createElement('p');
    desc.className   = 'card__description';
    desc.textContent = article.description;
    body.appendChild(desc);
  }

  // Kategorie-Chip
  const cat = document.createElement('span');
  cat.className   = 'card__category';
  cat.textContent = article.category.charAt(0).toUpperCase() + article.category.slice(1);
  body.appendChild(cat);

  return body;
}

/**
 * Erstellt die Action-Buttons (Dismiss ✕ und Weniger davon ⊘).
 *
 * @param {import('./feed.js').DiscopheryArticle} article
 * @returns {HTMLElement}
 */
function _createActionButtons(article) {
  const wrap = document.createElement('div');
  wrap.className = 'card__actions';

  // "Weniger davon"-Button
  const lessBtn = document.createElement('button');
  lessBtn.className  = 'card__action-btn';
  lessBtn.title      = 'Weniger davon';
  lessBtn.setAttribute('aria-label', 'Weniger davon');
  lessBtn.textContent = '⊘';
  lessBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // ui.js übernimmt das Menü — loser Bezug via CustomEvent
    document.dispatchEvent(new CustomEvent('discophery:context-menu-request', {
      detail: { article, triggerEl: lessBtn },
    }));
  });

  // Dismiss-Button (Desktop)
  const dismissBtn = document.createElement('button');
  dismissBtn.className  = 'card__action-btn';
  dismissBtn.title      = 'Artikel entfernen';
  dismissBtn.setAttribute('aria-label', 'Artikel entfernen');
  dismissBtn.textContent = '✕';
  dismissBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const cardEl = dismissBtn.closest('.card');
    _animateDismiss(cardEl, 'left', article.id);
  });

  wrap.appendChild(lessBtn);
  wrap.appendChild(dismissBtn);
  return wrap;
}

// ═══════════════════════════════════════════════════════════════════════════
// SWIPE-GESTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registriert Touch-Events für Swipe-to-Dismiss auf einer Card.
 *
 * Warum { passive: true } für touchstart/touchmove?
 * Der Browser kann dann Scroll-Optimierungen anwenden. Da wir nur
 * horizontale Swipes abfangen und vertikales Scrollen nicht blockieren,
 * ist passive korrekt und performant.
 *
 * @param {HTMLElement}                          cardEl  - Card-Element
 * @param {import('./feed.js').DiscopheryArticle} article
 * @returns {void}
 */
function _setupSwipe(cardEl, article) {
  let startX    = 0;
  let startY    = 0;
  let currentX  = 0;
  let moved     = false;
  let axis      = null;  // 'h' = horizontal, 'v' = vertikal, null = noch offen

  const reset = () => {
    cardEl.style.transition = 'transform 200ms ease-out';
    cardEl.style.transform  = '';
    cardEl.classList.remove('card--swiping-left', 'card--swiping-right');
    axis = null;
    moved = false;
  };

  cardEl.addEventListener('touchstart', (e) => {
    startX  = e.touches[0].clientX;
    startY  = e.touches[0].clientY;
    currentX = startX;
    moved   = false;
    axis    = null;
    cardEl.style.transition = 'none';
  }, { passive: true });

  cardEl.addEventListener('touchmove', (e) => {
    currentX      = e.touches[0].clientX;
    const deltaX  = currentX - startX;
    const deltaY  = e.touches[0].clientY - startY;

    // Achse erst nach 15px Gesamtbewegung festlegen;
    // horizontal nur wenn X-Anteil mindestens doppelt so groß wie Y → stabiles Scrollen
    if (axis === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX + absY < 15) return;
      axis = absX >= absY * 2 ? 'h' : 'v';
    }

    // Vertikales Scrollen → Card in Ruhe lassen
    if (axis === 'v') return;

    moved = true;
    cardEl.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.025}deg)`;
    cardEl.classList.toggle('card--swiping-left',  deltaX < -20);
    cardEl.classList.toggle('card--swiping-right', deltaX >  20);
  }, { passive: true });

  cardEl.addEventListener('touchend', () => {
    if (axis === 'v') { axis = null; return; }

    const delta = currentX - startX;
    if (!moved || Math.abs(delta) < SWIPE_THRESHOLD) {
      reset();
      return;
    }
    _animateDismiss(cardEl, delta < 0 ? 'left' : 'right', article.id);
  });

  // Abgebrochene Geste (z.B. eingehender Anruf) sauber zurücksetzen
  cardEl.addEventListener('touchcancel', reset);
}

/**
 * Spielt die Dismiss-Animation ab und entfernt die Card danach aus dem DOM.
 * Speichert den Dismiss gleichzeitig in localStorage via filter.js.
 *
 * @param {HTMLElement} cardEl    - Zu entfernende Card
 * @param {'left'|'right'} direction
 * @param {string}      articleId
 * @returns {void}
 */
function _animateDismiss(cardEl, direction, articleId) {
  dismissArticle(articleId);  // filter.js
  cardEl.classList.remove('card--swiping-left', 'card--swiping-right');
  cardEl.style.pointerEvents = 'none';

  cardEl.style.transition = 'transform 220ms ease-in, opacity 220ms ease-in';
  cardEl.style.transform  = direction === 'left'
    ? 'translateX(-115%) rotate(-8deg)'
    : 'translateX(115%) rotate(8deg)';
  cardEl.style.opacity = '0';

  const collapse = () => {
    const h = cardEl.offsetHeight;
    cardEl.style.transition = 'height 120ms ease, margin 120ms ease, padding 120ms ease';
    cardEl.style.overflow   = 'hidden';
    cardEl.style.height     = h + 'px';
    void cardEl.offsetWidth;
    cardEl.style.height  = '0';
    cardEl.style.margin  = '0';
    cardEl.style.padding = '0';
    setTimeout(() => cardEl.remove(), 140);
  };

  cardEl.addEventListener('transitionend', collapse, { once: true });
  setTimeout(collapse, 280);  // Fallback

  _showUndoToast(articleId);
}

function _showUndoToast(articleId) {
  if (_undoToastEl) { _undoToastEl.remove(); clearTimeout(_undoTimer); }

  const toast = document.createElement('div');
  toast.className = 'undo-toast';

  const msg = document.createElement('span');
  msg.textContent = 'Artikel entfernt';

  const btn = document.createElement('button');
  btn.className   = 'undo-toast__btn';
  btn.textContent = 'Rückgängig';
  btn.addEventListener('click', () => {
    undismissArticle(articleId);  // filter.js
    document.dispatchEvent(new CustomEvent('discophery:filter-changed'));
    _hideUndoToast();
  });

  toast.append(msg, btn);
  document.body.appendChild(toast);
  _undoToastEl = toast;

  // Doppeltes rAF stellt sicher dass der Browser die initiale opacity:0 rendert
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('undo-toast--visible')));
  _undoTimer = setTimeout(_hideUndoToast, 4000);
}

function _hideUndoToast() {
  if (!_undoToastEl) return;
  clearTimeout(_undoTimer);
  const el = _undoToastEl;
  _undoToastEl = null;
  el.classList.remove('undo-toast--visible');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 400);
}

// ═══════════════════════════════════════════════════════════════════════════
// DATUM FORMATIEREN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt ein relatives Datum zurück: "vor 5 Minuten", "gestern", "12. April".
 *
 * @param {Date} date
 * @returns {string}
 */
function _formatRelativeDate(date) {
  const now    = Date.now();
  const diffMs = now - date.getTime();
  const mins   = Math.floor(diffMs / 60_000);
  const hours  = Math.floor(diffMs / 3_600_000);
  const days   = Math.floor(diffMs / 86_400_000);

  if (mins  <  1)  return 'gerade eben';
  if (mins  < 60)  return `vor ${mins} Min.`;
  if (hours <  2)  return 'vor einer Stunde';
  if (hours < 24)  return `vor ${hours} Std.`;
  if (days  === 1) return 'gestern';
  if (days  <  7)  return `vor ${days} Tagen`;

  return date.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' });
}

// --- Auto-generated global exports for Vite migration ---
(window as any).SWIPE_THRESHOLD = SWIPE_THRESHOLD;
(window as any).SWIPE_TAP_LIMIT = SWIPE_TAP_LIMIT;
(window as any)._undoToastEl = _undoToastEl;
(window as any)._undoTimer = _undoTimer;
(window as any).renderCardGrid = renderCardGrid;
(window as any)._createCard = _createCard;
(window as any)._createImageWrap = _createImageWrap;
(window as any)._createCardBody = _createCardBody;
(window as any)._createActionButtons = _createActionButtons;
(window as any)._setupSwipe = _setupSwipe;
(window as any)._animateDismiss = _animateDismiss;
(window as any)._showUndoToast = _showUndoToast;
(window as any)._hideUndoToast = _hideUndoToast;
(window as any)._formatRelativeDate = _formatRelativeDate;
