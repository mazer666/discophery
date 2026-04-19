/**
 * @fileoverview Discophery — Service Worker (Vite-Build)
 *
 * Strategie:
 *  - App-Shell (HTML / CSS / JS / Assets): Cache-First, Netz-Fallback
 *  - Externe Requests (CORS-Proxy, RSS-Feeds): immer Netz, kein Cache
 *  - Neuer SW aktiviert sich sofort (skipWaiting + clients.claim)
 *
 * Cache-Version hochzählen wenn sich App-Shell-Dateien ändern.
 */

const CACHE = 'discophery-v10';

const APP_SHELL = [
  './',
  './index.html',
  './assets/app.js',
  './assets/index.css',
  './assets/logo.png',
  './assets/manifest.json',
  './icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request).then((resp) => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return resp;
      });
    }),
  );
});
