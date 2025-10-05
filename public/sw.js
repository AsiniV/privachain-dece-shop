/**
 * PrivaChain Service Worker for Advanced DPI Bypass
 * Implements network-level interceptors and proxy mechanisms
 */

const CACHE_NAME = 'privachain-bypass-v1';
const PROXY_ENDPOINTS = [
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://proxy.cors.sh/',
];

// Enhanced request headers for DPI bypass
const BYPASS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'DNT': '1',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

// Generate random IP for header spoofing
function generateRandomIP() {
  const ranges = [
    [8, 8, 8, 8], // Google DNS
    [1, 1, 1, 1], // Cloudflare DNS
    [208, 67, 222, 222], // OpenDNS
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return `${range[0]}.${range[1]}.${range[2]}.${range[3]}`;
}

// Advanced fetch interceptor
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip service worker scope and same-origin requests
  if (url.origin === self.location.origin) {
    return;
  }

  // Apply bypass for external HTTP/HTTPS requests
  if (url.protocol === 'https:' || url.protocol === 'http:') {
    event.respondWith(handleBypassedRequest(event.request));
  }
});

async function handleBypassedRequest(request) {
  const url = request.url;
  console.log('🔧 SW: Intercepting request for bypass:', url);

  // Strategy 1: Try direct request with enhanced headers
  try {
    const enhancedRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        ...BYPASS_HEADERS,
        'X-Forwarded-For': generateRandomIP(),
        'X-Real-IP': generateRandomIP(),
        'CF-Connecting-IP': generateRandomIP(),
      },
      mode: 'cors',
      credentials: 'omit',
    });

    const response = await fetch(enhancedRequest);
    if (response.ok) {
      console.log('✅ SW: Direct bypass successful');
      return response;
    }
  } catch (error) {
    console.log('🔄 SW: Direct bypass failed, trying proxy methods');
  }

  // Strategy 2: Try proxy endpoints
  for (const proxy of PROXY_ENDPOINTS) {
    try {
      const proxyUrl = proxy.includes('quest=') 
        ? proxy + encodeURIComponent(url)
        : proxy.includes('url=')
        ? proxy + encodeURIComponent(url)
        : proxy + url;

      const proxyResponse = await fetch(proxyUrl, {
        headers: BYPASS_HEADERS,
        mode: 'cors',
        credentials: 'omit',
      });

      if (proxyResponse.ok) {
        console.log('✅ SW: Proxy bypass successful via:', proxy);
        return proxyResponse;
      }
    } catch (error) {
      console.log('🔄 SW: Proxy failed:', proxy);
      continue;
    }
  }

  // Strategy 3: DNS-over-HTTPS bypass
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    const dohResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A&ct=application/dns-json`);
    if (dohResponse.ok) {
      const dnsData = await dohResponse.json();
      if (dnsData.Answer && dnsData.Answer.length > 0) {
        const ip = dnsData.Answer[0].data;
        const ipUrl = url.replace(domain, ip);
        
        const ipResponse = await fetch(ipUrl, {
          headers: {
            ...BYPASS_HEADERS,
            'Host': domain, // Preserve original host header
          },
          mode: 'cors',
          credentials: 'omit',
        });

        if (ipResponse.ok) {
          console.log('✅ SW: DNS-over-HTTPS bypass successful');
          return ipResponse;
        }
      }
    }
  } catch (error) {
    console.log('🔄 SW: DNS-over-HTTPS bypass failed');
  }

  // Fallback: Return original request
  console.log('⚠️ SW: All bypass methods failed, returning original request');
  return fetch(request);
}

// Cache management for performance
self.addEventListener('install', event => {
  console.log('🔧 SW: PrivaChain service worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ SW: Cache initialized');
        return cache;
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('✅ SW: PrivaChain service worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ SW: Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
  self.clients.claim();
});

// Message handling for advanced features
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'BYPASS_URL':
      handleBypassedRequest(new Request(data.url))
        .then(response => {
          event.ports[0]?.postMessage({
            success: true,
            status: response.status,
            statusText: response.statusText
          });
        })
        .catch(error => {
          event.ports[0]?.postMessage({
            success: false,
            error: error.message
          });
        });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME)
        .then(() => {
          event.ports[0]?.postMessage({ success: true });
        });
      break;
      
    default:
      console.log('🔄 SW: Unknown message type:', type);
  }
});

console.log('🚀 PrivaChain Service Worker loaded and ready for advanced bypass operations');