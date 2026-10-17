/* FitLog service worker: keeps the app working offline.
   Strategy: serve the cached copy immediately and refresh it in the background,
   so an update is picked up the next time the app is opened. Bump CACHE to force a clean slate. */
const CACHE = 'fitlog-v1.3.0';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'foods.js', 'program.js',
  'util.js', 'store.js', 'sync.js', 'charts.js', 'views1.js', 'views2.js', 'views3.js', 'main.js',
  'icon-180.png', 'icon-192.png', 'icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // never touch api.github.com
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await fresh) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  }));
});
