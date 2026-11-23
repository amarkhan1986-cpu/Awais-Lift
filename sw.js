/* Awais Lift offline shell for the one-file site: the app opens even without internet,
   and the data it changed offline is sent by the app itself when the connection returns. */
const V = 'awl-1f-47117245';
const CDN = ["https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js", "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js", "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"];
const OK_HOST = /(^|\.)(gstatic\.com|fonts\.googleapis\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.allSettled([
    fetch(new Request('./', { cache: 'reload' })).then(r => r.ok && c.put('./', r)),
    ...CDN.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r))),
  ])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('awl-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const fromCache = req => caches.open(V).then(c => c.match(req, { ignoreSearch: true }));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url), same = u.origin === location.origin;
  /* the page itself: newest from the internet, but the saved copy if the internet is missing or too slow */
  if (same && (r.mode === 'navigate' || /\/(index\.html)?$/.test(u.pathname))) {
    e.respondWith(new Promise(resolve => {
      let done = false; const finish = x => { if (!done && x) { done = true; resolve(x); } };
      const net = fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put('./', c)); } return res; });
      const t = setTimeout(() => fromCache('./').then(finish), 4000);
      net.then(res => { clearTimeout(t); finish(res); }).catch(() => fromCache('./').then(h => { clearTimeout(t); finish(h || Response.error()); }));
    }));
    return;
  }
  if (same) { e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => fromCache(r).then(h => h || Response.error()))); return; }
  /* app libraries and fonts: saved once, then served from the phone (live exchange rates are never cached) */
  if (!OK_HOST.test(u.hostname) || /currency-api/.test(u.pathname)) return;
  e.respondWith(caches.open(V).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }))));
});
