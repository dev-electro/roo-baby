/**
 * ROO Service Worker — handles caching and updates cleanly.
 *
 * Strategy:
 * - HTML (/) → network-first, never cached (always get latest deploy)
 * - Hashed assets (_app/immutable/*) → cache-first (immutable by design)
 * - API calls → network-first, fallback to cache
 *
 * On new deploy: old cache deleted, all clients notified to refresh.
 */

const CACHE = 'roo-v3';

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(keys =>
			Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
		).then(() => {
			// Notify all open tabs to reload
			self.clients.matchAll({ type: 'window' }).then(clients => {
				clients.forEach(client => {
					client.postMessage({ type: 'SW_UPDATED' });
				});
			});
		})
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// API calls: network first
	if (request.method === 'POST' || url.pathname.startsWith('/api')) {
		event.respondWith(fetch(request).catch(() => caches.match(request)));
		return;
	}

	// HTML entry: network first, no cache (always get latest)
	if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
		event.respondWith(
			fetch(request).catch(() => caches.match(request))
		);
		return;
	}

	// Hashed assets (_app/immutable/*): cache-first (never change)
	if (url.pathname.includes('/_app/immutable/')) {
		event.respondWith(
			caches.match(request).then(cached =>
				cached || fetch(request).then(response => {
					const clone = response.clone();
					caches.open(CACHE).then(c => c.put(request, clone));
					return response;
				})
			)
		);
		return;
	}

	// Everything else (favicon, manifest, etc.): stale-while-revalidate
	event.respondWith(
		caches.match(request).then(cached => {
			const fetchPromise = fetch(request).then(response => {
				caches.open(CACHE).then(c => c.put(request, response.clone()));
				return response;
			}).catch(() => {});
			return cached || fetchPromise;
		})
	);
});

// Listen for skip message from client (manual refresh trigger)
self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});
