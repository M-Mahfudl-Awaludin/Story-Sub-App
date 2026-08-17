// Dicoding Stories — Service Worker
// Handles: app-shell precaching, runtime caching (incl. offline access to
// dynamic API data), push notifications, and notification click navigation.

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `dicoding-stories-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `dicoding-stories-runtime-${CACHE_VERSION}`;
const API_CACHE = `dicoding-stories-api-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, RUNTIME_CACHE, API_CACHE];

const API_ORIGIN = 'https://story-api.dicoding.dev';

// Resolve the deploy base path from the service worker's own location, so
// this works whether the app is hosted at a domain root or under a GitHub
// Pages project subpath (e.g. /repo-name/) without hardcoding anything.
const BASE_PATH = new URL('./', self.location).pathname;

// Core app-shell assets. Hashed JS/CSS chunks produced by the Vite build are
// picked up automatically by the runtime cache-first handler below the first
// time they're requested, so we don't need to hardcode their (hashed) names.
const PRECACHE_URLS = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}offline.html`,
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}favicon.png`,
  `${BASE_PATH}images/logo.png`,
  `${BASE_PATH}icons/icon-72x72.png`,
  `${BASE_PATH}icons/icon-96x96.png`,
  `${BASE_PATH}icons/icon-128x128.png`,
  `${BASE_PATH}icons/icon-144x144.png`,
  `${BASE_PATH}icons/icon-152x152.png`,
  `${BASE_PATH}icons/icon-192x192.png`,
  `${BASE_PATH}icons/icon-384x384.png`,
  `${BASE_PATH}icons/icon-512x512.png`,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url).catch((err) => {
        console.warn('[SW] Precache failed for', url, err);
      }))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isApiStoryGetRequest(url) {
  return url.origin === API_ORIGIN && url.pathname.startsWith('/v1/stories') && !url.pathname.includes('/guest');
}

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)$/i.test(url.pathname);
}

// Network-first: try the network, fall back to whatever is cached. Used for
// navigations and for the stories API so the freshest data wins when online,
// while still working when offline (criteria: dynamic content offline).
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
    if (cached) return cached;
    throw error;
  }
}

// Cache-first: used for static, content-hashed assets that never change
// once built, and for third-party assets (map tiles, fonts) so the app shell
// keeps its look while offline.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return; // Never intercept POST/PUT/DELETE (auth, add story, subscriptions).
  }

  const url = new URL(request.url);

  // App navigations: network-first, fall back to cached shell, then to the
  // dedicated offline page as a last resort.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(`${BASE_PATH}index.html`)) || (await cache.match(`${BASE_PATH}offline.html`));
      }),
    );
    return;
  }

  // Stories API: network-first, cached responses let the story list and
  // detail pages keep working when the device goes offline.
  if (isApiStoryGetRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Same-origin build assets (hashed JS/CSS/images) and third-party assets
  // (Leaflet tiles/CSS, Google Fonts): cache-first for speed + offline shell.
  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE).catch(() => fetch(request)));
    return;
  }
});

// ---------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      title: 'Dicoding Stories',
      options: { body: event.data ? event.data.text() : 'Ada pembaruan story baru.' },
    };
  }

  // Dicoding's Story API sends `{ title, options: { body } }`. We read that
  // shape but fall back gracefully if a different payload shape is sent.
  const title = payload.title || 'Dicoding Stories';
  const sourceOptions = payload.options || payload || {};
  const body = sourceOptions.body || 'Ada story baru yang bisa kamu lihat sekarang.';
  const storyId = sourceOptions.storyId || payload.storyId || null;
  const targetUrl = sourceOptions.url || payload.url || (storyId ? `#/stories/${storyId}` : '#/');

  const notificationOptions = {
    body,
    icon: sourceOptions.icon || `${BASE_PATH}icons/icon-192x192.png`,
    badge: sourceOptions.badge || `${BASE_PATH}icons/icon-72x72.png`,
    vibrate: [120, 60, 120],
    tag: 'dicoding-story-push',
    renotify: true,
    data: { url: targetUrl, storyId },
    actions: [
      { action: 'view-detail', title: 'Lihat Story' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data || {};
  const hash = data.storyId ? `#/stories/${data.storyId}` : (data.url || '#/');
  const targetPath = hash.startsWith('#') ? `${BASE_PATH}${hash}` : hash;
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clientsArr.find((c) => 'focus' in c);

      if (existing) {
        try {
          if ('navigate' in existing) await existing.navigate(targetUrl);
        } catch (error) {
          console.warn('[SW] navigate() failed:', error);
        }
        return existing.focus();
      }

      return self.clients.openWindow(targetUrl);
    })(),
  );
});
