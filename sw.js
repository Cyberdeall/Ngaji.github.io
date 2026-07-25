// =========================================
// SW.JS - Service Worker
// Version 4.1.1 - Ngaos Al Falah Ploso (Fixed Non-GET Cache Bug)
// =========================================

const CACHE_NAME = 'ngaos-alfalah-v4.1.1';

// Daftar file yang wajib di-cache untuk mode offline PWA
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './player.html',
    './css/login.css',
    './js/config.js',
    './js/auth.js',
    './js/login.js',
    './manifest.json',
    './logo-alfalah.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
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
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 1. FILTER METODE HTTP: caches.put() HANYA mendukung metode GET
    if (event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }

    // 2. Jangan cache request ke Clerk API atau Stream Audio Icecast
    if (
        requestUrl.hostname.includes('clerk') || 
        requestUrl.hostname.includes('alhastream.com') ||
        requestUrl.pathname.includes('status-json.xsl')
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    // 3. Eksekusi Caching Strategy
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
});
