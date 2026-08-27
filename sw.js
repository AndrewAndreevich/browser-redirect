// Минимальный service worker: нужен только для того, чтобы Chrome считал сайт устанавливаемым
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  e.respondWith(fetch(e.request).catch(function () {
    return new Response('offline', { headers: { 'Content-Type': 'text/plain' } });
  }));
});
