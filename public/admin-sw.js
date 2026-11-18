// Yönetim paneli anlık bildirimleri (kapsam: /admin/). Önbellek yok; yalnızca bildirim gösterir ve tıklanınca ilgili sayfayı açar.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'YSNSOFT', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'YSNSOFT';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    icon: '/saha-icon-192.png',
    badge: '/saha-icon-192.png',
    data: { url: data.url || '/admin' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const same = wins.find((w) => w.url === url);
    if (same) return same.focus();
    return self.clients.openWindow(url);
  })());
});
