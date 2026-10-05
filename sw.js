// Keeps Λέξεις working offline. Bump CACHE when you want every device to drop its old copy.
const CACHE = 'lexeis-v1';
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
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from the cache straight away, then refresh the cached copy in the background,
// so the app opens offline and picks up changes from GitHub on the next launch.
// Fonts and the file-import libraries are cached the first time they load.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const cacheable = url.origin === self.location.origin
    || ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'].includes(url.hostname);
  if (!cacheable) return;
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: url.origin === self.location.origin });
      const fresh = fetch(req)
        .then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
