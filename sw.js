/* Second Brain OS — service worker
   Cache-first app shell so the installed version opens instantly and works
   with the network off. Bump CACHE to publish changes.

   Notes:
   - Only caches for this app (prefix "sb-os-") are cleared on activate. Other
     Rewrite OS products on the same domain keep their caches.
   - Matching ignores the ?v= query string so index.html can cache-bust
     without breaking the offline shell. */

const CACHE = 'sb-os-v3.3.0-3';
const PREFIX = 'sb-os-';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/app.css',
  './assets/store.js',
  './assets/app.js',
  './assets/palette.js',
  './assets/brain3d.js',
  './assets/brain-data.js',
  './assets/vendor/three.min.js',
  './assets/vendor/GLTFLoader.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ASSETS.map((asset) =>
      // cache:'reload' bypasses any stale HTTP-cache copy, so a cache-name
      // bump cannot bake the previous build into the new shell.
      fetch(asset, { cache: 'reload' })
        .then((res) => { if (res && res.status === 200) return c.put(asset, res); })
        .catch(() => {})
    ))).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.indexOf(PREFIX) === 0 && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;

      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html', { ignoreSearch: true });
        return undefined;
      });
    })
  );
});
