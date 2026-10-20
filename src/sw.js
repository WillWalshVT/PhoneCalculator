const PREFIX=`phasor-static:${self.registration.scope}:`;
const CACHE=PREFIX+'__VERSION__';
const assets=__ASSETS__;
const urls=assets.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(urls.map(u=>new Request(u,{cache:'reload'})));await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data?.type==='STATUS')e.waitUntil((async()=>{const c=await caches.open(CACHE);e.ports[0]?.postMessage({ready:(await Promise.all(urls.map(u=>c.match(u)))).every(Boolean)});})());});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||!u.href.startsWith(self.registration.scope))return;

 e.respondWith((async()=>{const cache=await caches.open(CACHE);const home=new URL('./',self.registration.scope);const path=u.pathname===home.pathname||u.pathname===home.pathname+'index.html'?home.href:u.origin+u.pathname;const cached=await cache.match(path);return cached||fetch(e.request);})());
});
