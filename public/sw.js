// Regulate — Service Worker
// Cache-first for static assets, network-first for pages, offline fallback

const CACHE_VERSION = "regulate-v8";
const STATIC_CACHE = "regulate-static-v7";
const PAGES_CACHE = "regulate-pages-v7";
const AUDIO_CACHE = "regulate-audio-v7";

// App shell — precached on install
const APP_SHELL = [
  "/",
  "/breathing",
  "/grounding",
  "/body-scan",
  "/somatic",
  "/affirmations",
  "/journal",
  "/learn",
  "/sos",
  "/crisis",
  "/sleep",
  "/safety-plan",
  "/caregiver",
  "/settings",
  "/settings/preferences",
  "/onboarding",
  "/games",
  "/games/bubbles",
  "/games/burn",
  "/toolkit",
];

const STATIC_ASSETS = [
  "/manifest.json",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

// Offline fallback HTML — shown when a navigation request fails and nothing is cached
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Regulate — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0f1e;
      color: #e2e8f0;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #5eead4; }
    p { line-height: 1.6; margin-bottom: 1.5rem; color: #94a3b8; }
    .breathing {
      width: 80px; height: 80px;
      border-radius: 50%;
      background: rgba(94, 234, 212, 0.15);
      border: 2px solid rgba(94, 234, 212, 0.3);
      margin: 0 auto 2rem;
      animation: breathe 6s ease-in-out infinite;
    }
    @keyframes breathe {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.3); opacity: 1; }
    }
    button {
      background: rgba(94, 234, 212, 0.15);
      border: 1px solid rgba(94, 234, 212, 0.3);
      color: #5eead4;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
    }
    button:active { background: rgba(94, 234, 212, 0.25); }
  </style>
</head>
<body>
  <div class="container">
    <div class="breathing"></div>
    <h1>You're offline</h1>
    <p>The app should still work — most features are available offline. Try going back or tapping retry when your connection returns.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`;

// ─── Install ───────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      // Cache the offline fallback page
      caches.open(STATIC_CACHE).then((cache) =>
        cache.put(
          new Request("/_offline"),
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        )
      ),
      // Precache static assets (cache-first, so these must be in cache)
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      // Precache app shell pages
      caches.open(PAGES_CACHE).then((cache) => cache.addAll(APP_SHELL)),
    ])
  );
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const KEEP = [STATIC_CACHE, PAGES_CACHE, AUDIO_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Helpers ───────────────────────────────────────────────────────────

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/icon.svg" ||
    url.pathname.endsWith(".svg")
  );
}

function isAudioFile(url) {
  return (
    url.pathname.startsWith("/audio/") ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".ogg") ||
    url.pathname.endsWith(".wav") ||
    url.pathname.endsWith(".m4a")
  );
}

function isNextBundle(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/data/")
  );
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

// ─── Cache-first strategy ──────────────────────────────────────────────
// Return from cache immediately; update cache in background on cache miss
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return undefined; // caller handles fallback
  }
}

// ─── Stale-while-revalidate ────────────────────────────────────────────
// Return cached version immediately, fetch fresh copy in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await fetchPromise);
}

// ─── Network-first strategy ────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached;
  }
}

// ─── Push Notification Handling ────────────────────────────────────

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, tag, data } = event.data.payload;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        tag,
        data,
        silent: false,
      })
    );
  }
});

// Handle notification click — open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ─── Fetch handler ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and non-http(s)
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // Skip cross-origin requests (analytics, external APIs, etc.)
  if (url.origin !== self.location.origin) return;

  // API calls — network-first
  if (isApiRequest(url)) {
    event.respondWith(
      networkFirst(request, PAGES_CACHE).then(
        (response) =>
          response ||
          new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
      )
    );
    return;
  }

  // Audio files — let the browser handle natively (range requests
  // and replay work better without SW interception)
  if (isAudioFile(url)) return;

  // Next.js bundles (JS/CSS chunks) — cache-first (content-hashed filenames)
  if (isNextBundle(url)) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).then(
        (response) => response || fetch(request)
      )
    );
    return;
  }

  // Static assets (icons, manifest, SVGs) — cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).then(
        (response) => response || fetch(request)
      )
    );
    return;
  }

  // Navigation requests (HTML pages) — network-first
  // Always fetches latest version; falls back to cache when offline
  if (isNavigationRequest(request)) {
    event.respondWith(
      networkFirst(request, PAGES_CACHE).then(async (response) => {
        if (response) return response;
        // Nothing in cache and network failed — show offline page
        const offlinePage = await caches.match("/_offline");
        return (
          offlinePage ||
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  // Everything else (fonts, images, etc.) — stale-while-revalidate
  event.respondWith(
    staleWhileRevalidate(request, STATIC_CACHE).then(
      (response) =>
        response || new Response("", { status: 503 })
    )
  );
});
