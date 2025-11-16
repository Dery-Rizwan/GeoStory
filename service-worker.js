importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log(`[SW] Workbox berhasil dimuat`);

  const { precacheAndRoute } = workbox.precaching;
  const { registerRoute } = workbox.routing;
  const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = workbox.strategies;
  const { ExpirationPlugin } = workbox.expiration;

  const RUNTIME_CACHE = 'story-app-runtime-v1';
  const IMAGE_CACHE = 'story-app-images-v1';

  precacheAndRoute(self.__WB_MANIFEST);

  self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.startsWith('workbox-') &&
                cacheName !== RUNTIME_CACHE &&
                cacheName !== IMAGE_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => self.clients.claim())
    );
  });
  
  registerRoute(
    ({url}) => url.origin === 'https://story-api.dicoding.dev',
    new NetworkFirst({
      cacheName: RUNTIME_CACHE,
      plugins: [
        new ExpirationPlugin({
          maxAgeSeconds: 1 * 24 * 60 * 60,
          maxEntries: 50,
        }),
      ],
    })
  );

  registerRoute(
    ({request}) => request.destination === 'image',
    new CacheFirst({
      cacheName: IMAGE_CACHE,
      plugins: [
        new ExpirationPlugin({
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxEntries: 60,
        }),
      ],
    })
  );

  registerRoute(
    ({url}) => url.origin.startsWith('https://fonts.googleapis.com') ||
               url.origin.startsWith('https://fonts.gstatic.com') ||
               url.origin.startsWith('https://unpkg.com/leaflet'),
    new StaleWhileRevalidate({
      cacheName: 'external-assets-cache',
    })
  );

} else {
  console.log(`[SW] Workbox gagal dimuat`);
}

// ===== PUSH NOTIFICATION EVENT =====
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  // Default notification data
  let notificationData = {
    title: 'New Story Available! 📖',
    body: 'Someone just shared a new story. Check it out!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'story-notification',
    data: {
      url: '/#/'
    }
  };

  if (event.data) {
    try {
      const textData = event.data.text();
      console.log('[SW] Push data (text):', textData);
      
      try {
        const payload = JSON.parse(textData);
        console.log('[SW] Push payload (JSON):', payload);
        
        // Handle format API dengan nested options
        if (payload.options) {
          notificationData = {
            title: payload.title || notificationData.title,
            body: payload.options.body || notificationData.body,
            icon: payload.options.icon || notificationData.icon,
            badge: payload.options.badge || notificationData.badge,
            tag: payload.options.tag || 'story-notification',
            data: {
              url: payload.options.data?.url || '/#/',
              storyId: payload.options.data?.storyId
            }
          };
        } 
        // Handle format flat JSON (backward compatibility)
        else {
          notificationData = {
            title: payload.title || notificationData.title,
            body: payload.body || payload.message || notificationData.body,
            icon: payload.icon || notificationData.icon,
            badge: notificationData.badge,
            tag: payload.tag || 'story-notification',
            data: {
              url: payload.url || '/#/',
              storyId: payload.storyId
            }
          };
        }
      } catch (jsonError) {
        console.log('[SW] Push data is plain text, using as body');
        notificationData.body = textData || notificationData.body;
      }
    } catch (error) {
      console.error('[SW] Error processing push data:', error);
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: [
        {
          action: 'open',
          title: 'View Story'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ],
      vibrate: [200, 100, 200],
      requireInteraction: false
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const url = event.notification.data?.url || '/#/';
        
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline story submission
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncPendingStories());
  }
});

// Sync pending stories from IndexedDB
async function syncPendingStories() {
  try {
    console.log('[SW] Syncing pending stories...');
    
    const db = await openDB();
    const tx = db.transaction('pending-stories', 'readonly');
    const store = tx.objectStore('pending-stories');
    const pendingStories = await store.getAll();
    
    if (pendingStories.length === 0) {
      console.log('[SW] No pending stories to sync');
      return;
    }
    
    console.log('[SW] Found pending stories:', pendingStories.length);
    
    for (const story of pendingStories) {
      try {
        await syncStory(story);
      } catch (error) {
        console.error('[SW] Failed to sync story:', error);
      }
    }
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('story-app-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Sync individual story
async function syncStory(story) {
  const token = await getToken();
  
  if (!token) {
    throw new Error('No auth token available');
  }
  
  const formData = new FormData();
  formData.append('description', story.description);
  formData.append('photo', story.photo);
  formData.append('lat', story.lat);
  formData.append('lon', story.lon);
  
  const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to sync story');
  }
  
  const db = await openDB();
  const tx = db.transaction('pending-stories', 'readwrite');
  const store = tx.objectStore('pending-stories');
  await store.delete(story.id);
  
  console.log('[SW] Story synced successfully:', story.id);
}

// Get auth token from clients
async function getToken() {
  const clients = await self.clients.matchAll();
  
  if (clients.length === 0) {
    return null;
  }
  
  // Request token from client
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.token);
    };
    
    clients[0].postMessage(
      { type: 'GET_TOKEN' },
      [messageChannel.port2]
    );
  });
}

console.log('[SW] Service Worker loaded');
