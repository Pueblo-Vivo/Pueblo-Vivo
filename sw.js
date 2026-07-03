/* Pueblo Vivo · service worker (prototipo) */
const CACHE='pueblovivo-v35';
const SHELL=['./','index.html','parcelas-data.js','poi-data.js','lotes-reales.js','manifest.json','icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(a=>c.add(a).catch(()=>{})))));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=e.request.url;
  if(u.includes('supabase.co')||u.includes('supabase.in')||u.includes('docs.google')||u.includes('spreadsheets'))return; // central/planilla: siempre directo, sin SW
  const isAsset=u.includes('arcgisonline')||u.includes('tile.openstreetmap')||u.includes('picsum')||u.includes('fonts.g')||u.includes('unpkg.com')||u.includes('jsdelivr')||u.includes('drive.google')||u.includes('googleusercontent');
  if(isAsset){ // cache-first (mapas, fotos, librerías)
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return res;})));
    return;
  }
  // app (html/js/json): network-first SIN cache HTTP (siempre fresco), cae a cache si no hay red
  e.respondWith(fetch(new Request(e.request.url,{cache:'no-store'})).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return res;}).catch(()=>caches.match(e.request).then(h=>h||caches.match('index.html'))));
});
