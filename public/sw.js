// Service worker for the Varahi Events PWA.
//
// IMPORTANT LESSON BAKED IN HERE: never serve a cached index.html.
// The HTML references hashed build files (index-AbC123.js). After a new deploy
// those filenames change, so a cached HTML shell points at chunks that no
// longer exist — every lazily-loaded page then fails to load and the app shows
// an error screen. So: HTML is ALWAYS fetched from the network, and only
// hashed static assets (which are immutable) are cached.

const CACHE_NAME = 'varahi-events-v3'

// Only genuinely immutable, non-HTML assets are worth pre-caching.
const APP_SHELL = ['/manifest.webmanifest', '/varahi_events.jpg']

// Never cache: auth/data traffic must always be fresh.
const NEVER_CACHE = ['firestore', 'googleapis', 'firebase', 'identitytoolkit']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})   // a failed pre-cache must never block activation
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isSameOrigin = url.origin === self.location.origin
  const isFirebase   = NEVER_CACHE.some((t) => request.url.includes(t))
  if (!isSameOrigin || isFirebase) return

  // Page navigations and any HTML: network only, never cached. This is what
  // guarantees a fresh deploy is picked up and chunk URLs always match.
  const isNavigation =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html')

  if (isNavigation) {
    event.respondWith(fetch(request).catch(() => caches.match('/varahi_events.jpg')))
    return
  }

  // Static assets: try network, fall back to cache when offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
