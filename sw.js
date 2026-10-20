const PREFIX = `phasor-static:${self.registration.scope}:`;
const CACHE = PREFIX + 'e5be02c092224e2b959cab4cf5bbac7452b13de52e36b133e716b344cf0a79b1';
const assets = ['./', './index.html', './connect.js', './app.js', './style.css', './manifest.webmanifest', './icon.png', './icon-maskable.png'];
const urls = assets.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  // Installation must finish before this version replaces the working offline app.
  await cache.addAll(urls.map(url => new Request(url, { cache: 'reload' })));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'STATUS') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const ready = (await Promise.all(urls.map(url => cache.match(url)))).every(Boolean);
    event.ports[0]?.postMessage({ ready });
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const home = new URL('./', self.registration.scope);
    const isHome = url.pathname === home.pathname || url.pathname === home.pathname + 'index.html';
    const cached = await cache.match(event.request.mode === 'navigate' && isHome ? home.href : event.request);
    return cached || fetch(event.request);
  })());
});
