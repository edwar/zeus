/* Service worker del modo campo de Zeus Ops.
 * Solo hace dos cosas: guardar los archivos de la aplicación (JS, CSS, fuentes, iconos) y la página del modo campo, para que abra
 * sin señal. Todo lo demás —incluidas las API y el resto del sitio— pasa derecho a la red: nunca se guardan datos de clientes aquí
 * (eso vive en IndexedDB y se borra al cerrar sesión). */
const VERSION = "v1";
const STATIC = `zeus-static-${VERSION}`;
const PAGES = `zeus-pages-${VERSION}`;
const FIELD_PAGE = /^\/(es|en)\/app\/field\/?$/;
const STATIC_FILE = /^\/(_next\/static\/|icon-|apple-icon|favicon)/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith("zeus-") && k !== STATIC && k !== PAGES) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Archivos de la aplicación (nombres con hash: no cambian): primero el caché.
  if (STATIC_FILE.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // La página del modo campo: primero la red (para tener lo último) y, si no hay señal o tarda, la última copia.
  if (req.mode === "navigate" && FIELD_PAGE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        const key = new Request(url.origin + url.pathname);
        try {
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), 5000);
          const res = await fetch(req, { signal: ctl.signal });
          clearTimeout(timer);
          // Una redirección (p. ej. al inicio de sesión) o un error no se guarda como si fuera la página.
          if (res.ok && !res.redirected) cache.put(key, res.clone());
          return res;
        } catch {
          const hit = await cache.match(key);
          if (hit) return hit;
          throw new Error("offline");
        }
      })(),
    );
  }
});

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "clear") {
    event.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("zeus-")).map((k) => caches.delete(k)))));
  }
  if (d.type === "precache" && Array.isArray(d.urls)) {
    // La página avisa qué archivos de la app ya cargó, para que la próxima vez abra sin señal aunque el service worker se haya instalado tarde.
    event.waitUntil(
      caches.open(STATIC).then((cache) =>
        Promise.all(
          d.urls
            .filter((u) => typeof u === "string" && STATIC_FILE.test(new URL(u, self.location.origin).pathname))
            .map(async (u) => {
              const req = new Request(u, { credentials: "same-origin" });
              if (!(await cache.match(req))) {
                try { const res = await fetch(req); if (res.ok) await cache.put(req, res); } catch { /* sin señal: se intentará la próxima vez */ }
              }
            }),
        ),
      ),
    );
  }
});
