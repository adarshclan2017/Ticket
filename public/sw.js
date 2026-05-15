// Install: activate immediately without waiting for old tabs to close
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: take control of all clients right away
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Support Ticket Update';
  const options = {
    body: data.body || 'Your ticket has been updated.',
    icon: '/infolab.png',
    badge: '/infolab.png',
    tag: 'ticket-notification',
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
