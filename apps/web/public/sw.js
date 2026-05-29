/**
 * Pulse — safe service worker.
 *
 * IMPORTANT: We deliberately do NOT cache JS/CSS build chunks or page HTML.
 * Doing so caused ChunkLoadError "Something broke" after every deploy: the SW
 * served a stale app shell that referenced chunk filenames Vercel had already
 * removed. Vercel's CDN already serves content-hashed assets with long-lived
 * immutable caching, so a custom asset cache buys nothing and risks stale state.
 *
 * This SW now only:
 *  - purges ALL old caches on activate (heals previously-poisoned clients), and
 *  - passes every request straight through to the network.
 * Bump CACHE whenever this file changes so browsers install the new version.
 */
const CACHE = "pulse-v8";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network passthrough — no caching. Let the browser + Vercel CDN handle it.
self.addEventListener("fetch", () => {});
