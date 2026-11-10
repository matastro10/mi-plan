// Service worker de Mi Plan: hace que la app abra sin internet y recibe las notificaciones.

const VERSION = 'v1';
const CACHE = `miplan-${VERSION}`;

// Todo lo que la app necesita para abrir sin conexión.
const NUCLEO = [
  './',
  './index.html',
  './manifest.json',
  './css/estilos.css',
  './js/app.js',
  './js/acciones.js',
  './js/avisos.js',
  './js/datos.js',
  './js/escena.js',
  './js/hambre.js',
  './js/hoja-comida.js',
  './js/hojas.js',
  './js/push.js',
  './js/store.js',
  './js/tema.js',
  './js/ui.js',
  './js/util.js',
  './js/vista-ajustes.js',
  './js/vista-historial.js',
  './js/vista-hoy.js',
  './js/vista-plan.js',
  './data/plan.json',
  './data/frases.json',
  './data/config.json',
  './fuentes/shrikhand-latin-400-normal.woff2',
  './fuentes/nunito-latin-wght-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(NUCLEO.map((ruta) => new Request(ruta, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.filter((k) => k.startsWith('miplan-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function guardar(peticion, respuesta) {
  if (respuesta && respuesta.ok && respuesta.type === 'basic') {
    const cache = await caches.open(CACHE);
    await cache.put(peticion, respuesta.clone());
  }
  return respuesta;
}

/** Datos (plan, frases, config): primero internet para ver cambios; si no hay, la copia guardada. */
async function redPrimero(peticion) {
  try {
    const respuesta = await fetch(new Request(peticion.url, { cache: 'no-cache' }));
    return await guardar(peticion, respuesta);
  } catch {
    const guardada = await caches.match(peticion, { ignoreSearch: true });
    if (guardada) return guardada;
    throw new Error('Sin conexión y sin copia guardada');
  }
}

/** Lo demás: se responde al instante con la copia guardada y se actualiza por detrás para la próxima vez. */
async function copiaPrimero(peticion, evento) {
  const guardada = await caches.match(peticion, { ignoreSearch: true });
  const refresco = fetch(new Request(peticion.url, { cache: 'no-cache' }))
    .then((respuesta) => guardar(peticion, respuesta))
    .catch(() => null);
  if (guardada) {
    evento.waitUntil(refresco);
    return guardada;
  }
  const fresca = await refresco;
  if (fresca) return fresca;
  throw new Error('Sin conexión y sin copia guardada');
}

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  if (peticion.mode === 'navigate') {
    evento.respondWith(
      copiaPrimero(new Request(new URL('./index.html', self.registration.scope).href), evento).catch(() => fetch(peticion)),
    );
    return;
  }
  if (url.pathname.includes('/data/')) {
    evento.respondWith(redPrimero(peticion));
    return;
  }
  evento.respondWith(copiaPrimero(peticion, evento));
});

/* ---------- Notificaciones ---------- */

self.addEventListener('push', (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { body: evento.data ? evento.data.text() : '' };
  }
  const titulo = datos.title || 'Mi Plan';
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: datos.tag || 'frase',
      data: { url: datos.url || './' },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const alcance = self.registration.scope;
  const destino = new URL((evento.notification.data && evento.notification.data.url) || './', alcance).href;
  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const ventana of ventanas) {
        if (ventana.url.startsWith(alcance) && 'focus' in ventana) return ventana.focus();
      }
      return self.clients.openWindow(destino);
    })(),
  );
});
