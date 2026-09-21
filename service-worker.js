/**
 * NEON CLASH: OVERDRIVE — Service Worker
 * Cache-First PWA strategy: instant loads + full offline play (bot mode).
 *
 * Bump CACHE_VERSION whenever game files change so every client
 * receives the update immediately (old caches are purged on activate).
 */
const CACHE_VERSION = 'neon-clash-v1';

const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './favicon.ico',
    './css/style.css',
    './js/engine/AudioEngine.js',
    './js/engine/Physics.js',
    './js/engine/Input.js',
    './js/engine/Renderer.js',
    './js/engine/UIManager.js',
    './js/gameplay/BotAI.js',
    './js/gameplay/GameMode.js',
    './js/gameplay/MapManager.js',
    './js/gameplay/Player.js',
    './js/gameplay/PowerUp.js',
    './js/gameplay/Progression.js',
    './js/gameplay/Weapon.js',
    './js/network/NetworkManager.js',
    './js/network/peerjs.min.js',
    './js/mobile/MobileUX.js',
    './js/main.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-192.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png'
];

// Install: pre-cache the whole game shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate: purge any stale caches from previous game versions
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_VERSION)
                .map((key) => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

// Fetch: Cache-First for same-origin game assets, network fallback.
// Cross-origin calls (PeerJS broker, STUN, analytics) always hit the network.
self.addEventListener('fetch', (event) => {
    const req = event.request;

    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(req, { ignoreSearch: false }).then((cached) => {
            if (cached) return cached;

            return fetch(req).then((networkRes) => {
                // Runtime-cache successful responses (e.g. deep links)
                if (networkRes && networkRes.ok && networkRes.type === 'basic') {
                    const clone = networkRes.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
                }
                return networkRes;
            }).catch(() => {
                // Offline navigation fallback → always land in the game shell
                if (req.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return new Response('OFFLINE - NEON CLASH asset unavailable', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            });
        })
    );
});
