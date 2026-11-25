const CACHE_NAME = 'pawide-pwa-v5';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) return caches.delete(name);
                })
            )
        ).then(() => self.clients.claim())
    );
});

// Network-first for app shell so updates apply immediately; cache fallback offline
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});
