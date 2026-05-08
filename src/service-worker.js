/**
 * ROO Service Worker
 * Cache-first for static assets, network-first for API calls.
 */

const CACHE_NAME = 'roo-v1';
const STATIC_ASSETS = [
	'/',
	'/manifest.json',
	'/favicon.svg'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS);
		})
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			);
		})
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);
	
	// API calls: network first
	if (request.method === 'POST' || url.pathname.startsWith('/api')) {
		event.respondWith(
			fetch(request).catch(() => caches.match(request))
		);
		return;
	}
	
	// Static assets: cache first
	if (request.method === 'GET') {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) {
					// Refresh cache in background
					fetch(request).then((response) => {
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(request, response.clone());
						});
					}).catch(() => {});
					return cached;
				}
				
				return fetch(request).then((response) => {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, clone);
					});
					return response;
				});
			})
		);
	}
});
