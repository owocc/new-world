/* 新世界居民 PWA Service Worker */
const CACHE = 'nwr-v1';
const PRECACHE = ['/', '/messages'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API、Better Auth 与流式请求永远直连网络
  if (url.pathname.startsWith('/api/')) return;

  // 静态资源：缓存优先
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/apple-touch-icon.png' ||
    /\.(png|jpg|jpeg|webp|avif|svg|woff2?)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // 页面与数据：网络优先，离线回退到缓存
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return res;
      })
      .catch(() =>
        caches.match(request).then((hit) => hit || (request.mode === 'navigate' ? caches.match('/') : undefined)),
      ),
  );
});

/* 浏览器通知点击：优先聚焦已打开的对应页面，否则新开窗口 */
self.addEventListener('notificationclick', (event) => {
  const target = event.notification.data?.url || '/';
  event.notification.close();

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const targetPath = new URL(target, self.location.origin).pathname;
      // 已有打开对应路径的窗口：聚焦
      for (const client of clientList) {
        if (new URL(client.url).pathname === targetPath) {
          return client.focus();
        }
      }
      // 已有任意应用窗口：聚焦并导航
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          await client.focus();
          return client.navigate(target);
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
