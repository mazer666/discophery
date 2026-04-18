/**
 * @fileoverview Discophery — Service Worker
 *
 * Strategie:
 *  - App-Shell (HTML / CSS / JS / Assets): Cache-First, Netz-Fallback
 *  - Externe Requests (CORS-Proxy, Google GIS): immer Netz, kein Cache
 *  - Neuer SW aktiviert sich sofort (skipWaiting + clients.claim)
 *
 * Cache-Version hochzählen wenn sich App-Shell-Dateien ändern.
 */

const CACHE = 'discophery-v7';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './theme.js',
  './style.css',
  './style-components.css',
  './style-feed-manager.css',
  './config.js',
  './feeds.js',
  './auth.js',
  './filter.js',
  './feed-manager.js',
  './feed-manager-ui.js',
  './feed.js',
  './ui-cards.js',
  './ui.js',
];

// ── Install: App-Shell vorab cachen ─────────────────────────────────────────

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: alte Caches löschen, Clients sofort übernehmen ────────────────

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: Cache-First für eigene Ressourcen, Netz für alles andere ─────────

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Externe Ressourcen (CORS-Proxy, Google GIS, RSS-Feeds) → immer Netz
  if (url.origin !== self.location.origin) return;

  // Nur GET cachen
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request).then((resp) => {
        // Nur gültige Same-Origin-Responses cachen
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return resp;
      });
    }),
  );
});
