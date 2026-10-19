/* קפה פנוי service worker — offline app shell + safe tile cache.
   Bump VERSION to drop old caches and force immediate quota cleanup. */
const VERSION = 'kp-v3'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const TILE_CACHE = `${VERSION}-tiles`
const FONT_CACHE = `${VERSION}-fonts`
const MAX_TILES = 80 // Kept small to prevent opaque-response QuotaExceededError

const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION) || k.includes('kp-v1'))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

/**
 * Safely stores a response in cache. Catches QuotaExceededError and drops
 * tile caches without ever rejecting or breaking the fetch flow.
 */
async function safePut(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName)
    await cache.put(request, response)
  } catch (err) {
    // If quota exceeded, purge non-essential tile cache to recover space
    try {
      await caches.delete(TILE_CACHE)
    } catch {}
  }
}

async function trim(cacheName, max) {
  try {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    for (let i = 0; i < keys.length - max; i++) {
      await cache.delete(keys[i])
    }
  } catch {}
}

async function cacheFirst(request, cacheName, onStore) {
  try {
    const cached = await caches.match(request)
    if (cached) return cached
  } catch {}

  try {
    const response = await fetch(request)
    if (response.ok || response.type === 'opaque') {
      safePut(cacheName, request, response.clone())
        .then(() => onStore?.())
        .catch(() => {})
    }
    return response
  } catch (err) {
    const fallback = await caches.match(request)
    if (fallback) return fallback
    throw err
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      safePut(SHELL_CACHE, '/', response.clone())
    }
    return response
  } catch {
    const fallback = await caches.match('/')
    return fallback || Response.error()
  }
}

async function staleWhileRevalidate(request, cacheName) {
  let cached = null
  try {
    const cache = await caches.open(cacheName)
    cached = await cache.match(request)
  } catch {}

  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') {
        safePut(cacheName, request, response.clone())
      }
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
    // Hashed build files never change — cache-first with safePut
    event.respondWith(cacheFirst(request, ASSET_CACHE))
  } else if (url.hostname === 'tile.openstreetmap.org') {
    // Only cache small batch of tiles, never allow quota error to break
    event.respondWith(cacheFirst(request, TILE_CACHE, () => trim(TILE_CACHE, MAX_TILES)))
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE))
  } else if (url.origin === self.location.origin && SHELL.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE))
  }
})

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
