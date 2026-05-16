// Service worker for the paper-trade dashboard.
// Strategy: cache-first for shell assets (manifest, icons, the SW itself),
// stale-while-revalidate for index.html so the phone shows the last-good
// dashboard instantly and fetches the fresh build in the background for next load.
// CACHE_VERSION is rewritten on every deploy to invalidate old caches.

const CACHE_VERSION = "v1778944576";
const CACHE_NAME = `paper-trade-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("paper-trade-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isHtml = url.pathname.endsWith("/") || url.pathname.endsWith("index.html");

  if (isHtml) {
    // Stale-while-revalidate for the dashboard HTML
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match("./index.html");
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              cache.put("./index.html", res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Cache-first for shell assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
