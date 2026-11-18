/* ============================================================================
   Agent Jennai — Service Worker (Web Push)
   ----------------------------------------------------------------------------
   Menerima push dari server push Agent Jennai dan menampilkannya sebagai
   notifikasi sistem, termasuk saat aplikasi ditutup. Klik notifikasi
   memfokuskan jendela aplikasi yang sudah terbuka, atau membuka aplikasi.

   Payload push yang didukung (JSON dari server):
     { "title": "...", "body": "...", "url": "...", "tag": "...",
       "icon": "...", "id": "..." }
   Semua field opsional; tanpa payload pun notifikasi generik ditampilkan
   (userVisibleOnly mewajibkan setiap push menghasilkan notifikasi terlihat).

   Service worker ini TIDAK menangani fetch / cache: aplikasi tetap memuat
   seperti biasa dari jaringan. Notifikasi in-app (bell + laci
   Pemberitahuan) berjalan terpisah di halaman sebagai fallback.
   ============================================================================ */

self.addEventListener('push', function (event) {
  var data = {};
  if (event.data) {
    try {
      data = event.data.json() || {};
    } catch (e) {
      try {
        data = { body: event.data.text() };
      } catch (e2) {
        data = {};
      }
    }
  }
  var title = data.title || 'Agent Jennai';
  var options = {
    body: data.body || '',
    icon: data.icon || 'icon.webp',
    badge: data.badge || 'icon.webp',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: {
      url: data.url || './',
      id: data.id || ''
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if ('focus' in client) {
          if (target && target !== './' && 'navigate' in client) {
            try { client.navigate(target); } catch (e) { /* abaikan: fokus saja */ }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});
