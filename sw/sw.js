/* WAR SHOP — Service Worker: caching to save visitors' data */
const V = 'v1';                       // غيّر الرقم (v2, v3…) عند كل تحديث كبير للموقع
const SHELL = 'shell-' + V, IMG = 'img-' + V, MAX_IMG = 250;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(ks => Promise.all(ks.filter(k => !k.endsWith('-' + V)).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}

// صور Cloudinary: من الكاش أولاً (لا تُحمَّل مرتين)
async function imageFirst(req) {
  const cache = await caches.open(IMG);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) { cache.put(req, res.clone()); trim(cache, MAX_IMG); }
  return res;
}

// الصفحة والخطوط: تُعرض فوراً من الكاش ثم تتحدّث في الخلفية (304 = بلا بيانات تقريباً)
async function staleWhileRevalidate(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then(res => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);

  if (u.hostname === 'res.cloudinary.com') return e.respondWith(imageFirst(req));
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') return e.respondWith(staleWhileRevalidate(req));

  if (u.origin === location.origin) {
    if (u.pathname.startsWith('/api/')) return;           // لا نخزّن واجهات API
    if (req.mode === 'navigate') return e.respondWith(staleWhileRevalidate(new Request(u.origin + '/', { headers: req.headers })));
    return e.respondWith(staleWhileRevalidate(req));
  }
  // Firebase / Cloudinary upload / Auth: مباشرة من الشبكة دائماً (مخزون وطلبات حيّة)
});
