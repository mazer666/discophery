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

/** Mindest-Swipe-Distanz in px bis Dismiss ausgelöst wird */
const SWIPE_THRESHOLD = 80;

/** Ab dieser Distanz (px) gilt ein Touch als Swipe — darunter als Tap */
const SWIPE_TAP_LIMIT = 5;

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
function renderCardGrid(articles, container) {
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

  const source = document.createElement('span');
  source.className   = 'card__source';
  source.textContent = article.source;

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
  let startX   = 0;
  let currentX = 0;
  let moved    = false;

  cardEl.addEventListener('touchstart', (e) => {
    startX   = e.touches[0].clientX;
    currentX = startX;
    moved    = false;
    cardEl.style.transition = 'none';
  }, { passive: true });

  cardEl.addEventListener('touchmove', (e) => {
    currentX    = e.touches[0].clientX;
    const delta = currentX - startX;
    if (Math.abs(delta) < SWIPE_TAP_LIMIT) return;
    moved = true;
    cardEl.style.transform = `translateX(${delta}px) rotate(${delta * 0.04}deg)`;
    cardEl.classList.toggle('card--swiping-left',  delta < -20);
    cardEl.classList.toggle('card--swiping-right', delta >  20);
  }, { passive: true });

  cardEl.addEventListener('touchend', () => {
    const delta = currentX - startX;

    if (!moved || Math.abs(delta) < SWIPE_THRESHOLD) {
      // Nicht weit genug → sanft zurückschnappen
      cardEl.style.transition = 'transform 200ms ease-out';
      cardEl.style.transform  = '';
      cardEl.classList.remove('card--swiping-left', 'card--swiping-right');
      return;
    }

    // Transition bleibt 'none' — _animateDismiss startet von der aktuellen Position
    _animateDismiss(cardEl, delta < 0 ? 'left' : 'right', article.id);
  });
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

  // JS-Transition startet von der aktuellen Swipe-Position — kein Snap-Back
  cardEl.style.transition = 'transform var(--transition-slow) ease-in, opacity var(--transition-slow) ease-in';
  cardEl.style.transform  = direction === 'left'
    ? 'translateX(-115%) rotate(-8deg)'
    : 'translateX(115%) rotate(8deg)';
  cardEl.style.opacity = '0';

  const collapse = () => {
    const h = cardEl.offsetHeight;
    cardEl.style.transition = 'height 200ms ease, margin 200ms ease, padding 200ms ease';
    cardEl.style.overflow   = 'hidden';
    cardEl.style.height     = h + 'px';
    void cardEl.offsetWidth;  // Reflow
    cardEl.style.height  = '0';
    cardEl.style.margin  = '0';
    cardEl.style.padding = '0';
    setTimeout(() => cardEl.remove(), 220);
  };

  cardEl.addEventListener('transitionend', collapse, { once: true });
  setTimeout(collapse, 500);  // Fallback
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
