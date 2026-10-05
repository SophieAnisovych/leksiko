// Keeps Λέξεις working offline. Bump CACHE when you want every device to drop its old copy.
const CACHE = 'lexeis-v9';
const APP_FILES = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'data/words.js',
  'manifest.json',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', event => {
  // cache: 'reload' skips the browser's own HTTP cache, so a new version never stores old files.
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The app's own files: always try the network first so updates show up right away,
// and fall back to the saved copy when offline.
// Fonts and the file-import libraries never change, so they come from the saved copy first.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          if (res.ok) caches.open(CACHE).then(cache => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  if (['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'].includes(url.hostname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') caches.open(CACHE).then(cache => cache.put(req, res.clone()));
        return res;
      }))
    );
  }
});
