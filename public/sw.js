const CACHE_NAME = 'gis-lembeyan-v1';
const STATIC_ASSETS = [
  '/',
  '/field-maps',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install: Cache essential shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Pre-cache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-while-revalidate for Map Tiles & static assets, Network-first for APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Map Tiles (OSM, Esri, Google Maps, CartoDB): Cache First with background refresh
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      caches.open('map-tiles-cache').then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          // Return cache immediately, fetch fresh in background if online
          fetch(event.request)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(event.request, res.clone());
              }
            })
            .catch(() => {});
          return cached;
        }

        try {
          const fresh = await fetch(event.request);
          if (fresh && fresh.status === 200) {
            cache.put(event.request, fresh.clone());
          }
          return fresh;
        } catch (e) {
          // If offline and no tile, return transparent 1x1 png or fallback
          return new Response('', { status: 408, statusText: 'Offline Map Tile' });
        }
      })
    );
    return;
  }

  // 2. Non-GET requests (POST /api/lahan, etc) -> let network handle, offline handled in offline-gis.ts
  if (event.request.method !== 'GET') {
    return;
  }

  // 3. Static assets & HTML navigation: Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        })
        .catch(() => {
          // Offline fallback
          return cached || (event.request.mode === 'navigate' ? (await cache.match('/')) || (await cache.match('/field-maps')) : null);
        });

      return cached || fetchPromise;
    })
  );
});
