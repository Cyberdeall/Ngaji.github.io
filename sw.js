// =========================================
// SW.JS - Service Worker
// Version 4.2.0 - Ngaos Al Falah Ploso
// =========================================

const CACHE_NAME = 'ngaos-alfalah-v4.2.0';

// Daftar file yang wajib di-cache untuk mode offline PWA
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './player.html',
    './css/login.css',
    './js/config.js',
    './js/constants.js',
    './js/utils.js',
    './js/crypto.js',
    './js/auth.js',
    './js/login.js',
    './manifest.json',
    './logo-alfalah.png',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
            .catch(err => console.error('[SW] Install error:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[ServiceWorker] Hapus cache lama:', cache);
                        return caches.delete(cache);
                    }
                    return Promise.resolve();
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    try {
        const requestUrl = new URL(event.request.url);

        // Don't cache request ke Clerk API atau Stream Audio Icecast
        if (
            requestUrl.hostname.includes('clerk') || 
            requestUrl.hostname.includes('alhastream.com') ||
            requestUrl.pathname.includes('status-json.xsl')
        ) {
            event.respondWith(fetch(event.request));
            return;
        }

        // For HTML: try cache first, update in background (stale-while-revalidate)
        if (event.request.mode === 'navigate' || 
            event.request.destination === 'document') {
            event.respondWith(
                caches.match(event.request)
                    .then(cachedResponse => {
                        const fetchPromise = fetch(event.request)
                            .then(response => {
                                if (response && response.status === 200) {
                                    const responseToCache = response.clone();
                                    caches.open(CACHE_NAME).then(cache => {
                                        cache.put(event.request, responseToCache);
                                    });
                                }
                                return response;
                            })
                            .catch(() => cachedResponse);
                        
                        return cachedResponse || fetchPromise;
                    })
                    .catch(() => {
                        return caches.match('./index.html');
                    })
            );
            return;
        }

        // For other assets: network first, fallback to cache
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
    } catch (err) {
        console.error('[SW] Fetch error:', err);
    }
});
