/* Service Worker NØVΛX ESPORT
   Permet d'afficher des notifications "natives" (icône, vibration,
   tiroir de notifications système) comme une vraie appli installée,
   même quand l'onglet n'est pas au premier plan.
   NB : sans serveur de push (FCM/APNs), impossible de notifier quand
   le site/la PWA est totalement fermé — il faut qu'il tourne au moins
   en arrière-plan (onglet ou PWA ouverte). */

const CACHE_NAME = 'novax-esport-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* Réception d'un message depuis la page pour afficher une notification native */
self.addEventListener('message', (event) => {
  const data = event.data;
  if(!data || data.type !== 'SHOW_NOTIFICATION') return;

  const { title, body, tag } = data.payload;

  self.registration.showNotification(title, {
    body,
    tag,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [120, 60, 120],
    renotify: true,
    requireInteraction: false,
    silent: false
  });
});

/* Clique sur la notification -> ramène l'utilisateur sur l'appli */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const existing = clientsArr.find((c) => 'focus' in c);
      if(existing) return existing.focus();
      if(self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
