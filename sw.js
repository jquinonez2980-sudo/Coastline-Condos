/**
 * Coastline Condos — Service Worker
 * Strategy: pre-cache the app shell, then stale-while-revalidate for all
 * same-origin GET requests (instant repeat visits + offline resilience).
 * Bump CACHE_VERSION whenever you ship changes, so clients refresh.
 */
const CACHE_VERSION = 'coastline-v13-walkthrough-tune';
const SHELL = [
  './',
  './index.html',
  './css/site.min.css',
  './js/min/inventory.js',
  './js/min/i18n-extra.js',
  './js/min/main.js',
  './manifest.webmanifest',
  './assets/brand/coastline-logo-horizontal-reversed.svg',
  './assets/brand/coastline-logo-horizontal-color.svg',
  './assets/images/hero-poster-w768.webp',
  './favicon/favicon-32x32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // let CDN/fonts pass through

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
