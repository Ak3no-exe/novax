/* Service Worker - NØVΛX ESPORT
   Rôle :
   1) Mettre en cache les fichiers de l'appli pour un chargement rapide
      et un fonctionnement minimal hors-ligne.
   2) Afficher les notifications "natives" demandées par la page
      (nouveau joueur ajouté), via postMessage.
*/

const CACHE_NAME = 'novax-esport-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  /* skipWaiting() : dès qu'une nouvelle version du Service Worker est
     détectée (à chaque chargement de page, grâce à updateViaCache:'none'),
     elle s'installe et prend le contrôle immédiatement, sans attendre
     que tous les onglets soient fermés. Combiné à clients.claim() dans
     "activate" et au rechargement automatique côté page (voir index.html,
     événement "controllerchange"), un simple rafraîchissement suffit
     à récupérer la dernière version. */
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // On force un téléchargement réseau strict (cache:'no-store') pour
      // chaque fichier de l'appli, afin de ne jamais recopier une version
      // encore présente dans le cache HTTP du navigateur. Sans ça, une
      // mise à jour pouvait se re-remplir avec d'anciens fichiers et
      // sembler "toujours disponible" même après avoir déjà été appliquée.
      await Promise.all(APP_SHELL.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (response && response.ok) {
            await cache.put(url, response.clone());
          }
        } catch (e) {
          /* pas grave si un fichier échoue au premier chargement hors-ligne */
        }
      }));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Stratégie : réseau d'abord (network-first). On essaie toujours de
   récupérer la version la plus fraîche sur le réseau, on la met en
   cache au passage, et on ne se rabat sur le cache que si le réseau
   échoue (hors-ligne). Ainsi, un simple rafraîchissement suffit à voir
   les changements dès qu'ils sont en ligne, sans bouton dédié. */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

/* Réception des messages envoyés depuis la page */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  /* Utilisé par le bouton "Vérifier les mises à jour" pour forcer
     ce SW à prendre le contrôle immédiatement une fois réinstallé. */
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = data.payload || {};
    self.registration.showNotification(title || 'NØVΛX ESPORT', {
      body: body || '',
      tag: tag || 'novax-notification',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [80, 40, 80]
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const client = clientsArr.find((c) => 'focus' in c);
      if (client) return client.focus();
      return self.clients.openWindow('./index.html');
    })
  );
});
