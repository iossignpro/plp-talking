// sw.js - Service Worker
const CACHE_NAME = 'drift-bottle-forum-v1.0.3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安装事件
self.addEventListener('install', event => {
  console.log('Service Worker 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存核心文件');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('跳过等待，直接激活');
        return self.skipWaiting();
      })
  );
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('Service Worker 激活');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Claiming clients');
      return self.clients.claim();
    })
  );
});

// 获取事件 - 处理所有请求
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果有缓存，返回缓存
        if (cachedResponse) {
          return cachedResponse;
        }

        // 否则从网络获取
        return fetch(event.request)
          .then(networkResponse => {
            // 检查响应是否有效
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // 克隆响应用于缓存
            const responseToCache = networkResponse.clone();

            // 将新请求添加到缓存
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(error => {
            console.log('获取失败:', error);
            // 对于文档请求，返回缓存的首页
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            // 对于其他请求，返回错误
            return new Response('网络连接失败', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});