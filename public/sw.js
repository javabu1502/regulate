// Regulate — Service Worker
// Cache-first for static assets, network-first for pages, offline fallback

// Stamped by scripts/generate-audio-manifest.mjs on each build. A changed
// byte here is what makes browsers reinstall the SW and re-precache the
// app shell — without it, offline copies of unvisited pages go stale.
const BUILD_ID = "1795413413903";

// Versioned by build so a deploy's stale chunks and pages are evicted by the
// activate-time cleanup below instead of accumulating forever.
const STATIC_CACHE = `regulate-static-${BUILD_ID}`;
const PAGES_CACHE = `regulate-pages-${BUILD_ID}`;
// Audio cache is intentionally unversioned — 11MB shouldn't re-download on
// every SW update. Missing files are filled in from the manifest on activate.
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
  // All of them: only bubbles and burn were listed, so the other six fell
  // back to the offline page with no signal.
  "/games/bubbles",
  "/games/chimes",
  "/games/burn",
  "/games/color-wash",
  "/games/crossing",
  "/games/garden",
  "/games/labyrinth",
  "/games/looking-around",
  "/games/mandala",
  "/games/nothing",
  "/games/ripples",
  "/games/sand",
  "/games/stars",
  "/games/stones",
  "/toolkit",
  "/practice",
  "/exercises",
  "/programs",
  "/programs/first-week",
  "/meditations",
];

// Injected from src/lib/meditations.ts by scripts/generate-audio-manifest.mjs
const MEDITATION_PAGES = ["/meditations/safe-place","/meditations/body-as-home","/meditations/feet-on-the-floor","/meditations/letting-the-wave-pass","/meditations/putting-it-down","/meditations/the-container","/meditations/the-younger-you","/meditations/you-did-your-best-today","/meditations/permission-to-rest","/meditations/warming-your-hands","/meditations/heavy-and-warm","/meditations/following-the-breath-home","/meditations/drifting","/meditations/night-sky","/meditations/rain-on-the-roof"];

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

// ─── Precache helpers ──────────────────────────────────────────────────

// Cache each app-shell page AND the content-hashed /_next/static assets its
// HTML references (JS chunks, CSS). Without the chunks, a precached page
// renders but can't hydrate offline — buttons dead, timers frozen.
async function precacheAppShell() {
  const pagesCache = await caches.open(PAGES_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);
  const assetUrls = new Set();

  await Promise.all(
    [...APP_SHELL, ...MEDITATION_PAGES].map(async (path) => {
      try {
        const response = await fetch(path);
        if (!response.ok) return;
        await pagesCache.put(path, response.clone());
        const html = await response.text();
        // Matches src/href attributes and escaped refs inside inline flight data
        for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)>]+/g)) {
          assetUrls.add(m[0]);
        }
      } catch {
        // Page precache is best-effort; runtime caching covers the rest
      }
    })
  );

  await Promise.all(
    [...assetUrls].map(async (url) => {
      try {
        if (await staticCache.match(url)) return;
        const response = await fetch(url);
        if (response.ok) await staticCache.put(url, response);
      } catch { /* best-effort */ }
    })
  );
}

// Fill the audio cache from the build-time manifest. Tolerates individual
// failures (e.g. clips not yet recorded) so one 404 never blocks the rest.
async function precacheAudio() {
  try {
    const response = await fetch("/audio-manifest.json", { cache: "no-cache" });
    if (!response.ok) return;
    const all = await response.json();
    // Crisis audio is precached so breathing, grounding, somatic and SOS work
    // offline. Meditations are long files and optional, so they are left to
    // runtime caching in handleAudio: each one is stored the first time it
    // plays, instead of making every first load pull tens of megabytes.
    const files = all.filter((url) => !url.startsWith("/audio/meditations/"));
    const cache = await caches.open(AUDIO_CACHE);
    for (const url of files) {
      try {
        if (await cache.match(url)) continue;
        const audioResponse = await fetch(url);
        if (audioResponse.ok) await cache.put(url, audioResponse);
      } catch { /* skip this file, keep going */ }
    }
  } catch { /* offline install — runtime caching will fill in later */ }
}

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
      // Precache app shell pages + the JS/CSS they need to hydrate
      precacheAppShell(),
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
  // Client asks us to fill the audio cache once the page is loaded and idle.
  // Runs here (not in activate) so it never delays activation or page fetches.
  if (event.data && event.data.type === "PRECACHE_AUDIO") {
    event.waitUntil(precacheAudio());
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

// ─── Audio: cache-first with Range support ─────────────────────────────
// Audio must work offline — this is a crisis app. We cache the full file
// and slice 206 responses ourselves because <audio> sends Range requests
// (Safari requires a valid 206 back or playback fails).
async function handleAudio(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const url = new URL(request.url);
  let full = await cache.match(url.pathname);

  if (!full) {
    try {
      // Fetch WITHOUT the Range header so we cache the whole file
      const response = await fetch(url.pathname);
      if (!response.ok || response.status !== 200) return response;
      await cache.put(url.pathname, response.clone());
      full = response;
    } catch {
      return new Response("", { status: 503 });
    }
  }

  const range = request.headers.get("range");
  if (!range) return full;

  const match = /bytes=(\d+)-(\d+)?/.exec(range);
  const buffer = await full.arrayBuffer();
  if (!match) return new Response(buffer, { status: 200, headers: { "Content-Type": "audio/mpeg" } });

  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), buffer.byteLength - 1) : buffer.byteLength - 1;
  if (start >= buffer.byteLength) {
    return new Response("", {
      status: 416,
      headers: { "Content-Range": `bytes */${buffer.byteLength}` },
    });
  }

  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": full.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${buffer.byteLength}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

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

  // Audio files — cache-first with Range support so playback works offline
  if (isAudioFile(url)) {
    event.respondWith(handleAudio(request));
    return;
  }

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
