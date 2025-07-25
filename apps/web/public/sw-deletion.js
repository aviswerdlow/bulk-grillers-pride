/**
 * Service Worker for Progressive Deletion
 * Provides offline support and performance optimization
 */

const CACHE_NAME = 'deletion-cache-v1';
const DELETION_QUEUE = 'deletion-queue';

// Assets to cache for offline support
const STATIC_ASSETS = [
  '/deletion/core.css',
  '/deletion/core.js',
  '/deletion/enhanced.js',
  '/deletion/optimal.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Don't cache all assets upfront, use runtime caching
      console.log('[SW] Installed');
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('deletion-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle deletion API requests
  if (url.pathname.startsWith('/api/delete')) {
    event.respondWith(handleDeletionRequest(request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (request.method === 'GET' && isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Network-first for everything else
  event.respondWith(networkFirst(request));
});

// Handle deletion requests with offline queue
async function handleDeletionRequest(request) {
  try {
    // Try network first
    const response = await fetch(request.clone());
    
    if (response.ok) {
      // Process any queued deletions
      await processQueuedDeletions();
    }
    
    return response;
  } catch (error) {
    // Network failed, queue the deletion
    const formData = await request.formData();
    const deletionData = {
      items: formData.getAll('items[]'),
      reason: formData.get('reason'),
      timestamp: Date.now()
    };
    
    await queueDeletion(deletionData);
    
    // Return a synthetic response
    return new Response(
      JSON.stringify({
        status: 'queued',
        message: 'Deletion queued for when you\'re back online'
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Queue deletion for later processing
async function queueDeletion(data) {
  const queue = await getQueue();
  queue.push(data);
  await saveQueue(queue);
  
  // Notify clients
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'deletion-queued',
        data: data
      });
    });
  });
}

// Process queued deletions when back online
async function processQueuedDeletions() {
  const queue = await getQueue();
  if (queue.length === 0) return;
  
  const processed = [];
  
  for (const deletion of queue) {
    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletion)
      });
      
      if (response.ok) {
        processed.push(deletion);
      }
    } catch (error) {
      console.error('[SW] Failed to process queued deletion:', error);
    }
  }
  
  // Remove processed items from queue
  const remainingQueue = queue.filter(item => !processed.includes(item));
  await saveQueue(remainingQueue);
  
  // Notify clients of processed deletions
  if (processed.length > 0) {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'deletions-processed',
          count: processed.length
        });
      });
    });
  }
}

// Cache strategies
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Helper functions
function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2?)$/);
}

async function getQueue() {
  try {
    const cache = await caches.open(DELETION_QUEUE);
    const response = await cache.match('queue');
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('[SW] Error reading queue:', error);
  }
  return [];
}

async function saveQueue(queue) {
  try {
    const cache = await caches.open(DELETION_QUEUE);
    const response = new Response(JSON.stringify(queue));
    await cache.put('queue', response);
  } catch (error) {
    console.error('[SW] Error saving queue:', error);
  }
}

// Background sync for queued deletions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-deletions') {
    event.waitUntil(processQueuedDeletions());
  }
});

// Message handling
self.addEventListener('message', (event) => {
  if (event.data.type === 'check-queue') {
    getQueue().then((queue) => {
      event.ports[0].postMessage({
        type: 'queue-status',
        count: queue.length
      });
    });
  }
});