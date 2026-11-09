/* Fish IQ - service worker
   Στρατηγική:
   - Πλοήγηση (index.html): δίκτυο πρώτα, με εφεδρεία την προσωρινή μνήμη (ώστε κάθε
     ανέβασμα νέας έκδοσης να φαίνεται αμέσως, αλλά να ανοίγει και χωρίς σύνδεση).
   - Εικονίδια / φωτογραφίες / χάρτης / γραμματοσειρές: προσωρινή μνήμη πρώτα.
   - Κλήσεις καιρού, παλίρροιας, χαρτών-πλακιδίων, αποστολής μηνυμάτων: ΠΟΤΕ δεν
     αποθηκεύονται, πάνε πάντα κατευθείαν στο δίκτυο.
*/

/* ΚΑΝΟΝΑΣ GlenApps (10/11/2026): η εφαρμογή ανοίγει αμέσως από τη συσκευή· δίκτυο το πολύ 3″ — ΜΗΝ αφαιρεθεί.
   gaNet(δίκτυο, αποθήκη, συμβάν): αν το δίκτυο δεν απαντήσει σε 3″ και υπάρχει αποθηκευμένο αντίγραφο, δίνεται αυτό
   (το δίκτυο συνεχίζει στο παρασκήνιο και ενημερώνει την αποθήκη)· μετά από καθυστέρηση, για 30″ όλα κατευθείαν από τη συσκευή.
   Σφάλμα διακομιστή (5xx) δεν αντικαθιστά το αποθηκευμένο. Οι αναβαθμίσεις έρχονται όπως πριν (νέο όνομα αποθήκης σε κάθε έκδοση). */
var GA_MS=3000,gaSlow=0;
function gaNet(net,fromCache,ev){var p=Promise.resolve(net);try{ev&&ev.waitUntil&&ev.waitUntil(p.catch(function(){}))}catch(x){}
  function fc(){try{return Promise.resolve(fromCache()).catch(function(){})}catch(x){return Promise.resolve()}}
  if(Date.now()<gaSlow)return fc().then(function(c){return c||p});
  return new Promise(function(ok){var done=false,t;function fin(r){if(!done){done=true;clearTimeout(t);ok(r)}}
    t=setTimeout(function(){fc().then(function(c){if(c){gaSlow=Date.now()+30000;fin(c)}})},GA_MS);
    p.then(function(r){if(r&&r.status>=500)fc().then(function(c){fin(c||r)});else fin(r)},function(){fc().then(function(c){fin(c||Response.error())})});});}
const VERSION = 'fishiq-v5.27';
const CORE = VERSION + '-core';
const ASSETS = VERSION + '-assets';

const PRECACHE = [
  './',
  './index.html','./plaisio.js','./efarmoges-mas.js','./metafora-rythmisi.js?v=5.27','./metafora-lipsi.js?v=5.27',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './apple-touch-icon.png'
];

// Τομείς που δεν πρέπει ποτέ να μπουν σε προσωρινή μνήμη
const NEVER_CACHE = [
  'api.open-meteo.com',
  'marine-api.open-meteo.com',
  'archive-api.open-meteo.com',
  'api.web3forms.com',
  'api.emailjs.com',
  'nominatim.openstreetmap.org',
  'tile.openstreetmap.org',
  'script.google.com',
  'google.com'
];

// Τομείς βοηθητικών βιβλιοθηκών που αξίζει να κρατάμε
const CDN_CACHE = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Ζωντανά δεδομένα: καθαρό δίκτυο, καμία παρέμβαση
  if (NEVER_CACHE.some(host => url.hostname.endsWith(host))) return;

  // Η ρύθμιση συνεργάτη πρέπει να είναι πάντα φρέσκια
  if (url.pathname.endsWith('partner.json')) return;

  // Άνοιγμα της εφαρμογής: δίκτυο πρώτα
  if (req.mode === 'navigate') {
    event.respondWith(gaNet(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CORE).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        ,() =>
          caches.match('./index.html').then(hit => hit || caches.match('./'))
        ,event));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isCdn = CDN_CACHE.some(host => url.hostname.endsWith(host));

  if (!sameOrigin && !isCdn) return;

  // Στατικά αρχεία: προσωρινή μνήμη πρώτα, ενημέρωση στο παρασκήνιο
  event.respondWith(
    caches.match(req).then(hit => {
      const network = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(ASSETS).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
