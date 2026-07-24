// =========================================
// SW.JS - Service Worker
// Version 4.0.0 - Ngaos Al Falah Ploso
// =========================================

const CACHE_NAME = 'ngaos-alfalah-v4.0.0';

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

// 1. INSTALL EVENT (Caching aset dasar)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE EVENT (Membersihkan cache versi lama)
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

// 3. FETCH EVENT (Network First untuk API & Dynamic Stream, Cache First untuk Statis)
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Jangan cache request ke Clerk API atau Stream Audio Icecast
    if (
        requestUrl.hostname.includes('clerk') || 
        requestUrl.hostname.includes('alhastream.com') ||
        requestUrl.pathname.includes('status-json.xsl')
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Strategi Caching: Network First dengan Fallback ke Cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Simpan salinan terbaru ke cache jika respons valid
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Jika offline / koneksi terputus, ambil dari cache
                return caches.match(event.request);
            })
    );
});
