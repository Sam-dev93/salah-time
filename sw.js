const CACHE_NAME = 'salah-times-v1';
const urlsToCache = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: App shell cached');
      })
      .catch(error => {
        console.error('Service Worker: Caching failed', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Cleanup complete');
    })
  );
  
  // Claim clients to make service worker take effect immediately
  return self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests for extensions and chrome://
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('chrome://') ||
      event.request.url.startsWith('moz-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              console.log('Service Worker: Caching new resource:', event.request.url);
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(error => {
        console.log('Service Worker: Fetch failed, serving offline fallback');
        // Return the cached index.html for navigation requests when offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        // For other requests, just return a generic offline response
        return new Response('Offline - Please check your internet connection', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Handle app updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skipping waiting...');
    self.skipWaiting();
  }
});

// Background sync for future enhancement
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync:', event.tag);
  if (event.tag === 'sync-prayer-times') {
    event.waitUntil(
      // Could implement background prayer times update here
      console.log('Service Worker: Syncing prayer times data')
    );
  }
});

// Push notifications for prayer times (future enhancement)
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Time for prayer',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 1,
        url: data.url || './index.html'
      },
      actions: [
        {
          action: 'view-times',
          title: 'View Prayer Times'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ],
      tag: 'prayer-notification',
      renotify: true,
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification('🕌 Salah Times', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || './index.html';

  if (event.action === 'view-times') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          // Check if app is already open
          for (const client of clients) {
            if (client.url.includes('index.html') && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if app not already open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else {
    // Default action - just open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          if (clients.length > 0) {
            return clients[0].focus();
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', event => {
  console.log('Service Worker: Notification closed');
});