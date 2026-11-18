// Saha listesi için service worker (kapsam: /admin/saha). Amaç: zayıf ya da kopan bağlantıda sayfanın açılması.
// - Sayfa (gezinme): önce ağ, ağ yoksa son kayıtlı kopya.
// - /_next/static: dosya adları içerik karmalı ve değişmez → önce önbellek.
// - API: önbelleğe ALINMAZ. Günün listesi ve bekleyen sonuçlar sayfanın kendisinde (localStorage) tutulur;
//   böylece oturum kapanınca eski kişisel veri service worker önbelleğinde kalmaz.
const CACHE = 'saha-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' && url.pathname === '/admin/saha') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        // Yalnızca gerçek sayfa saklanır (girişe yönlendirme ya da hata değil)
        if (res.ok && !res.redirected) (await caches.open(CACHE)).put('/admin/saha', res.clone());
        return res;
      } catch {
        return (await caches.match('/admin/saha')) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || /^\/saha-(icon|apple)/.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});
