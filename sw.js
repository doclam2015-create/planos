// Caché de la app para que abra sin conexión.
//
// La página se pide SIEMPRE a la red primero, con la caché de reserva: así una
// versión nueva se ve en cuanto hay señal, sin que haya que hacer nada. Los
// iconos y el manifiesto sí van de caché primero, porque no cambian.
const CACHE = "planos-v3";
const FILES = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const esDocumento = e.request.mode === "navigate" ||
                      e.request.destination === "document" ||
                      new URL(e.request.url).pathname.endsWith("/index.html");

  if (esDocumento) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => { c.put(e.request, copia); c.put("./", res.clone()); });
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => {
      const live = fetch(e.request).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || live;
    })
  );
});
