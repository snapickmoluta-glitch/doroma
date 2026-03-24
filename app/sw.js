const CACHE_NAME = 'doroma-v1';
const BASE = '/doroma/app';

// キャッシュするアセット
const PRECACHE_URLS = [
  `${BASE}/`,
  `${BASE}/offers`,
  `${BASE}/mypage`,
  `${BASE}/withdraw`,
  `${BASE}/faq`,
];

// インストール時にプリキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // プリキャッシュ失敗は無視（オフラインでも動作可能にするため）
      });
    })
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ネットワークファースト + キャッシュフォールバック
self.addEventListener('fetch', (event) => {
  // API・認証リクエストはキャッシュしない
  if (
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('/auth/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功レスポンスをキャッシュに保存
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});
