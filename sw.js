// Service worker de SeñaLink: permite instalar la app y usarla sin conexión.
// - Código y modelo de señas: red primero (para recibir cada modelo nuevo).
// - MediaPipe, TensorFlow.js y su WebAssembly (pesados, no cambian): caché primero.

const VERSION = 'senalink-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './img/icon.svg',
  './img/icon-192.png',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/session.js',
  './js/camera.js',
  './js/features.js',
  './js/recognizer.js',
  './js/signs.js',
  './js/speech.js',
  './js/settings.js',
  './js/ui.js',
  './js/icons.js',
  './js/views/inicio.js',
  './js/views/atencion.js',
  './js/views/respuesta.js',
  './js/views/noReconocida.js',
  './js/views/fin.js',
  './vendor/mediapipe/vision_bundle.mjs',
  './vendor/tfjs/tf.min.js',
];
const HEAVY = /\.(wasm|task)$|vision_wasm_.*\.js$|vision_bundle\.mjs$|tf\.min\.js$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  if (HEAVY.test(url.pathname) || isFont) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        // Sin conexión: solo las páginas caen en index.html; un archivo (como el
        // modelo) que no está en caché debe fallar, no devolver HTML.
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
      ),
  );
});
