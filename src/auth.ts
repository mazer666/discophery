/**
 * @fileoverview Discophery — Google OAuth Authentifizierung
 *
 * Verantwortlichkeiten:
 *  - Google Identity Services initialisieren
 *  - Login via Popup-Flow (kein Redirect — funktioniert auf GitHub Pages)
 *  - JWT-Token validieren und User-Daten extrahieren
 *  - Session in sessionStorage halten (läuft beim Tab-Schließen ab — gewollt)
 *  - Login-Screen / App-Shell umschalten
 *  - Logout
 *
 * Setzt voraus: config.js (CONFIG muss als globales Objekt verfügbar sein)
 *
 * Sam: Kein localStorage für Auth-Tokens — sessionStorage ist sicherer weil
 * es nicht in anderen Tabs oder nach Browser-Neustart auslesbar ist.
 * Der JWT-Token kommt von Google und wird nur clientseitig dekodiert (kein
 * Backend-Verify nötig da wir keine Server-Ressourcen schützen).
 */

/**
 * @typedef {Object} DiscopheryUser
 * @property {string} name    - Anzeigename des Users
 * @property {string} email   - E-Mail-Adresse
 * @property {string} picture - URL des Profilbilds
 * @property {string} sub     - Google User-ID (eindeutig, unveränderlich)
 */

/** Schlüssel unter dem der eingeloggte User im sessionStorage liegt */
const SESSION_KEY = 'discophery_user';

/**
 * Aktuell eingeloggter User oder null wenn nicht eingeloggt.
 * Wird von anderen Modulen über getUser() gelesen — nie direkt beschreiben.
 *
 * @type {DiscopheryUser|null}
 */
let currentUser = null;

// ═══════════════════════════════════════════════════════════════════════════
// INITIALISIERUNG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Startet den Auth-Flow: prüft ob noch eine Session existiert,
 * initialisiert Google Identity Services, zeigt den richtigen Screen.
 *
 * Wird automatisch aufgerufen wenn das DOM bereit ist (DOMContentLoaded).
 * Wenn AUTH_REQUIRED=false: überspringt den Login und startet die App direkt.
 *
 * @returns {void}
 */
function initAuth() {
  // Datenschutz- und Nutzungslinks im Login-Screen setzen
  _setLegalLinks();

  // Per localStorage überschreibbar — Wert aus Settings-Toggle hat Vorrang
  const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_ENABLED);
  const authRequired = stored !== null ? stored === 'true' : CONFIG.AUTH_REQUIRED;

  // Wenn Auth deaktiviert: direkt App starten, Google One-Tap unterdrücken
  if (!authRequired) {
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
    _showApp(null);
    return;
  }

  // Prüfen ob noch eine gültige Session aus diesem Tab existiert
  const savedUser = _loadSession();
  if (savedUser) {
    currentUser = savedUser;
    _showApp(savedUser);
    return;
  }

  // Kein User — Login-Screen zeigen und Google initialisieren
  _showLoginScreen();
  _initGoogleSignIn();
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE IDENTITY SERVICES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialisiert Google Identity Services und rendert den Sign-In-Button.
 *
 * Warum window.google?.accounts?:
 * Das GIS-Script lädt async — in seltenen Fällen ist es beim DOMContentLoaded
 * noch nicht fertig. Der globale google.accounts Namespace muss vorhanden sein.
 * Falls nicht, wird nach 500ms erneut versucht (max. 10 Versuche).
 *
 * @param {number} [attempt=0] - Interner Zähler für Retry-Logik
 * @returns {void}
 */
function _initGoogleSignIn(attempt = 0) {
  if (!window.google?.accounts?.id) {
    if (attempt >= 10) {
      _showAuthError('Google Sign-In konnte nicht geladen werden. Bitte Seite neu laden.');
      return;
    }
    // Kurz warten und erneut versuchen — GIS-Script noch nicht bereit
    setTimeout(() => _initGoogleSignIn(attempt + 1), 500);
    return;
  }

  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback:  handleGoogleSignIn,
    // auto_select: Wenn der Browser einen passenden Account kennt,
    // wird der User automatisch eingeloggt ohne Klick (One-Tap)
    auto_select: true,
    // cancel_on_tap_outside: false damit der User nicht aus Versehen abbricht
    cancel_on_tap_outside: false,
  });

  // Rendered-Button in das vorbereitete div rendern
  const buttonContainer = document.querySelector('.g_id_signin');
  if (buttonContainer) {
    google.accounts.id.renderButton(buttonContainer, {
      type:   'standard',
      size:   'large',
      theme:  'outline',
      text:   'signin_with',
      locale: 'de',
    });
  }

  // One-Tap Prompt anzeigen (erscheint oben rechts auf Desktop)
  google.accounts.id.prompt();
}

/**
 * Callback-Funktion die Google aufruft nachdem der User sich eingeloggt hat.
 *
 * Der `credential`-String ist ein JWT (JSON Web Token) von Google.
 * Er enthält Name, E-Mail und Profilbild-URL — base64-kodiert, nicht verschlüsselt.
 * Wir dekodieren ihn clientseitig (kein Backend nötig für unseren Use-Case).
 *
 * Sam: Der Token wird NICHT an externe Server gesendet — nur lokal dekodiert.
 * Das ist sicher weil wir keine Server-Ressourcen schützen müssen.
 *
 * @param {Object} response          - Antwort von Google Identity Services
 * @param {string} response.credential - JWT-Token als Base64-String
 * @returns {void}
 */
function handleGoogleSignIn(response) {
  if (!response?.credential) {
    _showAuthError('Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
    return;
  }

  const user = _parseJwt(response.credential);
  if (!user) {
    _showAuthError('Anmeldedaten konnten nicht gelesen werden.');
    return;
  }

  currentUser = user;
  _saveSession(user);
  _showApp(user);
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Speichert den User im sessionStorage.
 *
 * Warum sessionStorage statt localStorage?
 * sessionStorage läuft beim Schließen des Tabs ab — der User muss sich
 * beim nächsten Öffnen neu anmelden. Das ist gewollt: verhindert dass
 * jemand mit physischem Zugriff auf das Gerät die App ohne Login nutzt.
 *
 * @param {DiscopheryUser} user - User-Objekt das gespeichert werden soll
 * @returns {void}
 */
function _saveSession(user) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    // sessionStorage kann im privaten Modus nicht beschreibbar sein
    console.warn('Session konnte nicht gespeichert werden:', err.message);
  }
}

/**
 * Liest den gespeicherten User aus dem sessionStorage.
 *
 * @returns {DiscopheryUser|null} - User-Objekt oder null wenn keine Session
 */
function _loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Kaputtes JSON im sessionStorage → ignorieren, neu einloggen
    return null;
  }
}

function _clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Fehler beim Löschen ist unkritisch
  }
  currentUser = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Loggt den User aus: Session löschen, Google-State zurücksetzen, Login zeigen.
 *
 * Warum google.accounts.id.disableAutoSelect()?
 * Ohne diesen Aufruf würde Google nach dem Logout sofort wieder One-Tap
 * anzeigen und den User automatisch neu einloggen — das wäre verwirrend.
 *
 * @returns {void}
 */
function logout() {
  _clearSession();

  // Google anweisen den Auto-Select zu deaktivieren
  if (window.google?.accounts?.id) {
    google.accounts.id.disableAutoSelect();
  }

  _showLoginScreen();
}

// ═══════════════════════════════════════════════════════════════════════════
// UI — SCREEN-WECHSEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Blendet den Login-Screen aus und zeigt die App.
 * Benachrichtigt andere Module über den Start via Custom Event.
 *
 * @param {DiscopheryUser|null} user - Eingeloggter User (null wenn AUTH_REQUIRED=false)
 * @returns {void}
 */
function _showApp(user) {
  const loginEl = document.getElementById('login-screen');
  const appEl   = document.getElementById('app-shell');

  if (loginEl) loginEl.style.display = 'none';

  if (appEl) {
    appEl.style.display  = '';
    appEl.ariaHidden = 'false';
  }

  // User-Avatar im Header befüllen
  _renderUserAvatar(user);

  // Logout-Button verdrahten
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // User-Info im Einstellungs-Modal setzen
  _renderUserInfo(user);

  // feed.js und ui.js über den Start benachrichtigen
  // (sie hören auf dieses Event anstatt direkt aufgerufen zu werden —
  //  dadurch bleibt die Abhängigkeit lose)
  document.dispatchEvent(new CustomEvent('discophery:ready', { detail: { user } }));
}

/**
 * Zeigt den Login-Screen und versteckt die App.
 *
 * @returns {void}
 */
function _showLoginScreen() {
  const loginEl = document.getElementById('login-screen');
  const appEl   = document.getElementById('app-shell');

  if (appEl) {
    appEl.style.display = 'none';
    appEl.ariaHidden = 'true';
  }
  if (loginEl) loginEl.style.display = '';
}

/**
 * Zeigt eine Fehlermeldung im Login-Screen.
 * Verwendet textContent — kein innerHTML mit externen Daten (Sam).
 *
 * @param {string} message - Deutsche Fehlermeldung für den User
 * @returns {void}
 */
function _showAuthError(message) {
  const loginEl = document.getElementById('login-screen');
  if (!loginEl) return;

  // Prüfen ob bereits ein Fehler-Element existiert
  let errorEl = loginEl.querySelector('.auth-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'auth-error';
    errorEl.style.cssText = [
      'color: var(--color-error)',
      'font-size: var(--font-size-sm)',
      'text-align: center',
      'max-width: 30ch',
    ].join(';');
    loginEl.appendChild(errorEl);
  }

  // textContent statt innerHTML — kein XSS-Risiko
  errorEl.textContent = message;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOM-UPDATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rendert den User-Avatar im Header-Button.
 * Profilbild wenn vorhanden, sonst Initialen als Fallback.
 *
 * @param {DiscopheryUser|null} user
 * @returns {void}
 */
function _renderUserAvatar(user) {
  const btn = document.getElementById('btn-user');
  if (!btn) return;

  btn.textContent = '';
  btn.style.display = user ? '' : 'none';

  if (!user) return;

  if (user.picture) {
    const img = document.createElement('img');
    img.src    = user.picture;
    img.alt    = user.name;
    img.width  = 32;
    img.height = 32;
    img.style.cssText = 'width:32px;height:32px;border-radius:50%;object-fit:cover;';
    // Fehlerfall: Bild nicht ladbar → Initialen zeigen
    img.addEventListener('error', () => {
      btn.textContent = '';
      btn.appendChild(_createInitialsAvatar(user.name));
    });
    btn.appendChild(img);
  } else {
    btn.appendChild(_createInitialsAvatar(user.name));
  }

  // Tooltip mit echtem Namen (nicht aria-label — kommt von externem Dienst,
  // wird aber nur als textContent gesetzt, nie als HTML geparst)
  btn.title = user.name;
}

/**
 * Erstellt einen Kreis-Avatar mit den Initialen des Users.
 *
 * @param {string} name - Vollständiger Name (z.B. "Max Mustermann")
 * @returns {HTMLSpanElement}
 */
function _createInitialsAvatar(name) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  const span = document.createElement('span');
  span.textContent = initials;
  span.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'width:32px',
    'height:32px',
    'border-radius:50%',
    'background:var(--color-accent)',
    'color:#fff',
    'font-size:13px',
    'font-weight:600',
  ].join(';');
  return span;
}

/**
 * Schreibt Name und E-Mail in den Einstellungs-Modal-Bereich.
 *
 * @param {DiscopheryUser|null} user
 * @returns {void}
 */
function _renderUserInfo(user) {
  const el          = document.getElementById('settings-user-info');
  const labelEl     = document.getElementById('settings-user-label');
  const logoutRow   = document.getElementById('settings-logout-row');

  if (labelEl)   labelEl.style.display   = user ? '' : 'none';
  if (logoutRow) logoutRow.style.display = user ? '' : 'none';

  if (!el || !user) return;

  el.textContent = '';

  const name  = document.createElement('div');
  const email = document.createElement('div');

  name.textContent  = user.name;
  email.textContent = user.email;
  name.style.fontWeight  = '600';
  email.style.color      = 'var(--color-text-tertiary)';
  email.style.marginTop  = 'var(--space-1)';

  el.appendChild(name);
  el.appendChild(email);
}

/**
 * Setzt die Datenschutz- und Nutzungslinks im Login-Screen
 * aus config.js (einzige Quelle für diese URLs).
 *
 * @returns {void}
 */
function _setLegalLinks() {
  const privacyLink = document.getElementById('link-privacy');
  const termsLink   = document.getElementById('link-terms');

  if (privacyLink) privacyLink.href = CONFIG.PRIVACY_POLICY_URL;
  if (termsLink)   termsLink.href   = CONFIG.TERMS_OF_USE_URL;
}

// ═══════════════════════════════════════════════════════════════════════════
// JWT-PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dekodiert einen JWT-Token und extrahiert die User-Daten.
 *
 * Ein JWT besteht aus drei Base64-Teilen: header.payload.signature
 * Wir brauchen nur den mittleren Teil (payload).
 *
 * Sam: Keine Signatur-Verifikation nötig — der Token kommt direkt von
 * Google über HTTPS. Für Server-Ressourcen müsste man verifizieren,
 * aber wir schützen nur den Browser-State.
 *
 * @param {string} token - JWT-String von Google Identity Services
 * @returns {DiscopheryUser|null} - Extrahierte User-Daten oder null bei Fehler
 */
function _parseJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json   = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );

    const payload = JSON.parse(json);

    // Pflichtfelder prüfen — ein Token ohne diese Felder ist für uns nutzlos
    if (!payload.sub || !payload.email) return null;

    return {
      sub:     payload.sub,
      name:    payload.name    ?? payload.email,
      email:   payload.email,
      picture: payload.picture ?? null,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt den aktuell eingeloggten User zurück.
 * Andere Module (feed.js, ui.js) rufen diese Funktion auf statt direkt
 * auf currentUser zuzugreifen — dadurch bleibt der State gekapselt.
 *
 * @returns {DiscopheryUser|null}
 */
function getUser() {
  return currentUser;
}

// ─── Start ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initAuth);

// --- Auto-generated global exports for Vite migration ---
(window as any).SESSION_KEY = SESSION_KEY;
(window as any).currentUser = currentUser;
(window as any).initAuth = initAuth;
(window as any)._initGoogleSignIn = _initGoogleSignIn;
(window as any).handleGoogleSignIn = handleGoogleSignIn;
(window as any)._saveSession = _saveSession;
(window as any)._loadSession = _loadSession;
(window as any)._clearSession = _clearSession;
(window as any).logout = logout;
(window as any)._showApp = _showApp;
(window as any)._showLoginScreen = _showLoginScreen;
(window as any)._showAuthError = _showAuthError;
(window as any)._renderUserAvatar = _renderUserAvatar;
(window as any)._createInitialsAvatar = _createInitialsAvatar;
(window as any)._renderUserInfo = _renderUserInfo;
(window as any)._setLegalLinks = _setLegalLinks;
(window as any)._parseJwt = _parseJwt;
(window as any).getUser = getUser;
