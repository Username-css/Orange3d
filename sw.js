// Orange3D Service Worker — cache offline
// Strategi: cache-first untuk kecepatan, tapi selalu perbarui cache di background dari network
// (stale-while-revalidate). Kalau network gagal (offline), pakai cache yang ada.
const CACHE_NAME = 'orange3d-cache-v1';

const CORE_ASSETS = [
  './',
  './index.html',
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Reflector.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js',
  'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // App shell wajib berhasil dicache
      return cache.addAll(CORE_ASSETS).then(() =>
        // CDN best-effort: satu gagal (mis. offline saat install pertama) tidak menggagalkan semua
        Promise.allSettled(
          CDN_ASSETS.map((url) =>
            fetch(url, { mode: 'cors' })
              .then((res) => { if (res && res.ok) return cache.put(url, res); })
              .catch(() => {})
          )
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      // Cache-first kalau ada (langsung tampil cepat + jalan offline), tetap update cache di background
      return cached || networkFetch;
    })
  );
});
