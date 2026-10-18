/* קפה פנוי service worker — offline app shell + map tile cache.
   Registered only in production builds (see src/main.tsx). Bump VERSION to drop old caches. */
const VERSION = 'kp-v1'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const TILE_CACHE = `${VERSION}-tiles`
const FONT_CACHE = `${VERSION}-fonts`
const MAX_TILES = 600

const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

async function cacheFirst(request, cacheName, onStore) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
    if (onStore) onStore()
  }
  return response
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(SHELL_CACHE)
    cache.put('/', response.clone())
    return response
  } catch {
    return (await caches.match('/')) || Response.error()
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
  } else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    // Hashed build files never change — cache forever
    event.respondWith(cacheFirst(request, ASSET_CACHE))
  } else if (url.hostname === 'tile.openstreetmap.org') {
    // OSM's tile policy asks clients to cache tiles
    event.respondWith(cacheFirst(request, TILE_CACHE, () => trim(TILE_CACHE, MAX_TILES)))
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE))
  } else if (url.origin === self.location.origin && SHELL.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE))
  }
  // Everything else (e.g. the Overpass API) goes straight to the network
})

// Tapping a "cart is free" notification opens the app on that cart
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => 'focus' in w)
      if (win) {
        win.navigate(target)
        return win.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
