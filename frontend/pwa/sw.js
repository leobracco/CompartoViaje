/* CompartoViaje Service Worker.
   Estrategia:
   - App shell: cache-first (index, css, js, íconos).
   - GET /api/trips/search y /api/trips/:id: stale-while-revalidate.
   - Otros GET /api: network-first, fallback a cache.
   - POSTs se pueden encolar con Background Sync (stub). */

const VERSION = 'cv-v3';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.webmanifest',
  '/js/app.js',
  '/js/router.js',
  '/js/api.js',
  '/js/store.js',
  '/js/ws.js',
  '/js/ui.js',
  '/js/views/home.js',
  '/js/views/search.js',
  '/js/views/trip.js',
  '/js/views/publish.js',
  '/js/views/bookings.js',
  '/js/views/me.js',
  '/js/views/auth.js',
  '/js/views/chat.js',
  '/js/views/admin.js',
  '/js/views/review.js',
  '/icons/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/trips/search') || url.pathname.match(/^\/api\/trips\/[^/]+$/)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) {
    const cache = await caches.open(VERSION);
    cache.put(req, res.clone());
  }
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(VERSION);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: { code: 'offline', message: 'Sin conexión' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || network || new Response(JSON.stringify({ error: { code: 'offline' } }), { status: 503 });
}
