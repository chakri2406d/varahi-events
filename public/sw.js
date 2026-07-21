// Minimal, safe service worker for the Varahi Events PWA.
// Strategy: network-first with cache fallback, so users always get the
// latest deployed build when online, and something usable when offline.
// Firebase/Firestore/auth traffic is NEVER cached — stale auth/data would
// break the app, so those requests are always passed straight to the network.

const CACHE_NAME = 'varahi-events-v1'

// App-shell files that are safe and cheap to pre-cache on install.
// (Hashed build assets are picked up on demand by the fetch handler below.)
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/varahi_events.jpg',
]

// URLs that must never be cached — auth/data must always be fresh.
const NEVER_CACHE = ['firestore', 'googleapis', 'firebase', 'identitytoolkit']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only ever handle GET requests — POST/PUT/etc. must hit the network.
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never touch cross-origin requests or Firebase/Firestore/auth traffic —
  // let the browser handle those normally, uncached.
  const isSameOrigin = url.origin === self.location.origin
  const isFirebaseRelated = NEVER_CACHE.some((token) => request.url.includes(token))
  if (!isSameOrigin || isFirebaseRelated) return

  // Network-first: try the network, fall back to cache, update cache on success.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache valid, basic (same-origin) responses.
        if (response && response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
