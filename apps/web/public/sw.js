/**
 * Pulse — minimal service worker.
 * - App shell cached on install
 * - Network-first for navigation, fall back to cache when offline
 * - Cache-first for static assets
 */
// Bump this version any time the app shell changes meaningfully.
// On activate, all old caches are purged so users don't see stale broken pages.
const CACHE = "pulse-v7";
const SHELL = ["/", "/dashboard", "/chat", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache the AI API or any /api route
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match("/dashboard"))),
    );
    return;
  }

  // Cache-first for static assets
  if (url.origin === location.origin && /\.(js|css|woff2?|png|svg|jpg|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => undefined);
          return res;
        });
      }),
    );
  }
});
