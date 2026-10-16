// sw.js — service worker MoveCash (cahier V2 · §10)
// Généré au build par le plugin de vite.config.js, qui remplit BUILD_ID et PRECACHE.
// Une nouvelle version = un nouveau fichier = mise à jour détectée.
/* global __PRECACHE__ */

const BUILD_ID = "__BUILD_ID__";
const PRECACHE = __PRECACHE__;
const SHELL_CACHE = `movecash-shell-${BUILD_ID}`;
const RUNTIME_CACHE = "movecash-runtime";

// ─── Installation : coquille de l'app en cache (hors ligne) ─────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
  // Pas de skipWaiting ici : la nouvelle version attend le clic « Mettre à jour »
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("movecash-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ─── Requêtes ────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Jamais de cache pour l'API ni le temps réel : données personnelles et à jour
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/")) return;

  // Pages : réseau d'abord, coquille en cache si hors ligne (SPA)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match("/index.html")) || Response.error())
    );
    return;
  }

  // Fichiers statiques : cache d'abord, puis réseau (et mise en cache)
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })()
  );
});

// ─── Notifications push (NOT-02) ─────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "MoveCash", body: event.data?.text() };
  }

  event.waitUntil(
    (async () => {
      // App ouverte et visible : le bandeau interne (Socket.IO) suffit, pas de doublon
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((w) => w.visibilityState === "visible")) return;

      await self.registration.showNotification(data.title || "MoveCash", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: data.tag || undefined,
        renotify: !!data.tag,
        data: { link: data.link || "/notifications" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) return existing.navigate(link).catch(() => existing.postMessage({ type: "NAVIGATE", link }));
        return existing.postMessage({ type: "NAVIGATE", link });
      }
      return self.clients.openWindow(link);
    })()
  );
});

// Version visible dans les outils du navigateur
self.MOVECASH_BUILD = BUILD_ID;
