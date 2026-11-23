// Service worker: permite abrir la app sin conexión.
// Si cambias index.html, sube el número de versión para forzar la actualización.
const CACHE = 'nuestra-semana-v4';
const ASSETS = ['./', './index.html', './firebase-config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  // Librerías de Firebase: tienen versión fija, así que se guardan una vez y ya.
  if (url.startsWith(FIREBASE_CDN)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
    return;
  }
  if (new URL(url).origin !== location.origin) return;   // el resto (base de datos, login) va directo a internet
  // Archivos de la app: primero la caché (rápido y offline); en segundo plano se baja la versión nueva.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, {ignoreSearch: true});
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
