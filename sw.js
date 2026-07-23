/* Pueblo Vivo · service worker (prototipo) */
const CACHE='pueblovivo-v131';
const SHELL=['./','index.html','parcelas-data.js','poi-data.js','lotes-reales.js','manifest.json','icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(a=>c.add(a).catch(()=>{})))));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=e.request.url;
  if(u.includes('supabase.co')||u.includes('supabase.in')||u.includes('docs.google')||u.includes('spreadsheets'))return; // central/planilla: siempre directo, sin SW
  // Las fotos del repo (fotos/*.jpg) son inmutables: van cache-first como el resto de los assets.
  // Antes caían en network-first y se re-bajaban enteras en cada apertura → en el celu con datos fallaban.
  const esImagen=e.request.destination==='image'||/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(u);
  const isAsset=u.includes('arcgisonline')||u.includes('tile.openstreetmap')||u.includes('picsum')||u.includes('fonts.g')||u.includes('unpkg.com')||u.includes('jsdelivr')||u.includes('drive.google')||u.includes('googleusercontent')||u.includes('/fotos/')||esImagen;
  if(isAsset){ // cache-first (mapas, fotos, librerías): se bajan una sola vez
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      if(res&&res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}
      return res;
    })));
    return;
  }
  // app (html/js/json): network-first SIN cache HTTP (siempre fresco), cae a cache si no hay red.
  // Ojo: solo una navegación puede caer a index.html; si no, una imagen fallada recibía el HTML
  // como respuesta, no decodificaba y el onerror la borraba de la ficha.
  e.respondWith(fetch(new Request(e.request.url,{cache:'no-store'})).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return res;})
    .catch(()=>caches.match(e.request).then(h=>h||(e.request.mode==='navigate'?caches.match('index.html'):Response.error()))));
});
