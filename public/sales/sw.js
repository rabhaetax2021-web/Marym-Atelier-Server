/* Sales service worker - scope: /sales */
const CACHE_NAME = 'mary-sales-v1';
const PRECACHE_URLS = [
  '/sales',
  '/appicon.jpg',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/sales') && !url.pathname.startsWith('/assets') && !PRECACHE_URLS.includes(url.pathname)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
      return caches.open(CACHE_NAME).then((cache) => { cache.put(event.request, resp.clone()); return resp; });
    }).catch(() => caches.match('/appicon.jpg')))
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { body: event.data?.text() || '' }; }
  const title = data.title || 'Marym Sales';
  const options = {
    body: data.body || '',
    icon: '/appicon.jpg',
    badge: '/appicon.jpg',
    data: data
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/sales'));
});
