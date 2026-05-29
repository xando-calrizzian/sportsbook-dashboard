// KILL-SWITCH service worker.
//
// Purpose: recover from a wedged PWA state. On install, deletes every
// paper-trade-* cache and unregisters this very registration so future
// page loads bypass any service worker entirely until a new working one
// is shipped. Posts KILLSWITCH_RELOAD to controlled clients so they do
// one clean reload into the SW-free state.
//
// The fetch handler is a no-op pass-through: never calls respondWith, so
// the browser handles every request via the normal network. This also
// works around any partial-response caching bug that the previous SW
// may have introduced.
//
// CACHE_VERSION is substituted by deploy_dashboard.py at push time so
// browsers see this as a "new" SW worth installing.

const CACHE_VERSION = "v1780024844";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("paper-trade-"))
          .map((k) => caches.delete(k))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const clientList = await self.clients.matchAll({ type: "window" });
      for (const client of clientList) {
        client.postMessage({ type: "KILLSWITCH_RELOAD", version: CACHE_VERSION });
      }
      try {
        await self.registration.unregister();
      } catch (e) {
        // best-effort: even if unregister throws, the pass-through fetch
        // handler below means we no longer interfere with page loads.
      }
    })()
  );
});

self.addEventListener("fetch", () => {
  // Intentional no-op. Do not call event.respondWith. The browser handles
  // every fetch via the normal network stack.
});
