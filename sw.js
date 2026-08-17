importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'dmf-pwa-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos paths relativos al sw.js
      return cache.addAll([
        './',
        './index.html',
        './logo-dental-mas-facil.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Ignorar peticiones que no son GET o que van a otras APIs externas (como OneSignal o Apps Script)
  if (e.request.method !== 'GET' || e.request.url.includes('script.google.com') || e.request.url.includes('onesignal.com')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).catch(() => {
        // Fallback básico para PWA offline
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
