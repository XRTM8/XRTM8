/**
 * Chrono Drift - Offline Cache & PWA Service Worker
 */
const CACHE_NAME = 'chronodrift-v110-cache';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './styles/ui-refresh.css',
  './script.js',
  './js/game-state.js',
  './js/multiplayer.js',
  './js/ui.js',
  './js/death-watchdog.js',
  './js/mobile-controls.js',
  './socket.io.min.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network first with cache fallback for real-time multiplayer assets
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
