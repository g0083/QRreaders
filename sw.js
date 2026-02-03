const CACHE_NAME = 'qr-app-v2'; // バージョンを上げてキャッシュを更新
const ASSETS = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'https://unpkg.com/@zxing/library@latest',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
