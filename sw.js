/* ─────────────────────────────────────────────
   sw.js – Service Worker for Lakshmanna Sarees PWA (BB)
   Caches key assets for offline / fast loading
───────────────────────────────────────────── */
const CACHE_NAME = 'lakshmanna-v10';
const PRECACHE_ASSETS = [
  '/',
  '/home.html',
  '/products.html',
  '/cart.html',
  '/profile.html',
  '/home.css',
  '/products.css',
  '/cart.css',
  '/profile.css',
  '/cart.js',
  '/shop.js',
  '/logo.jpg',
  '/manifest.json'
];

// Install – pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).catch(err => console.warn('[SW] Pre-cache failed:', err))
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch – network first for API, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and API requests (always go to network)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first for static assets (images, css, js)
  if (/\.(jpg|jpeg|png|webp|gif|css|js|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Network-first for HTML pages
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
