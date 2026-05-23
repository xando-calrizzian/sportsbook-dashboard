// Service worker for the paper-trade dashboard.
//
// Strategy:
//   - Network-first for HTML and JSON (the dashboard payload). When online
//     the user always sees the freshest deploy on every load. When offline,
//     fall back to the cached copy so the icon never opens to a broken page.
//   - Cache-first for icons + manifest (rarely-changing shell). Bumping
//     CACHE_VERSION on every deploy invalidates the whole namespace at once.
//   - skipWaiting + clients.claim so a new SW takes over within seconds of
//     the next page load -- no need to close and reopen the PWA.
//   - On activate, postMessage UPDATE_READY to every controlled client.
//     The client side shows a "tap to refresh" banner; tap sends back
//     SKIP_WAITING (already done here, but kept for clarity) and reloads.
//
// CACHE_VERSION is substituted by deploy_dashboard.py at push time.

const CACHE_VERSION = "v1779524747";
const CACHE_NAME = `paper-trade-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "./manifest.json",
  "./icon-120.png",
  "./icon-152.png",
  "./icon-167.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

const HTML_NETWORK_TIMEOUT_MS = 5000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("paper-trade-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
      const clientList = await self.clients.matchAll({ type: "window" });
      for (const client of clientList) {
        client.postMessage({ type: "UPDATE_READY", version: CACHE_VERSION });
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function networkWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("network_timeout")), ms);
    fetch(req)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isHtml =
    url.pathname.endsWith("/") ||
    url.pathname.endsWith(".html") ||
    accept.includes("text/html");
  const isJson = url.pathname.endsWith(".json") || accept.includes("application/json");

  // Network-first for HTML and JSON so updates land instantly when online.
  // The response goes back to the page BEFORE we touch the cache, so any
  // cache.put work cannot affect what the browser sees. The body is cloned
  // up front (read-once safety) and the cache write is a fire-and-forget
  // side effect.
  if (isHtml || isJson) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await networkWithTimeout(req, HTML_NETWORK_TIMEOUT_MS);
          if (fresh && fresh.status === 200) {
            const forCache = fresh.clone();
            // Schedule the cache write without awaiting; never block the
            // response return on it. Failures are swallowed so a flaky
            // cache layer never breaks the page.
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, forCache).catch(() => {});
            }).catch(() => {});
          }
          return fresh;
        } catch (err) {
          const cached = await caches.match(req);
          if (cached) return cached;
          // Last-resort fallback to root cache for HTML, so the PWA still
          // opens something rather than throwing a generic chrome error.
          if (isHtml) {
            const rootCached = await caches.match("./");
            if (rootCached) return rootCached;
          }
          return new Response("offline", { status: 503, statusText: "offline" });
        }
      })()
    );
    return;
  }

  // Cache-first for static shell.
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
