const CACHE='estate-nest-v1';
const A=['./','./index.html','./manifest.webmanifest','./icon.svg','./estate.json','./deps.json','./kernel/nest.mjs','./kernel/fall-remember.mjs','./kernel/sha256.mjs'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});
