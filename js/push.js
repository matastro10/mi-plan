// Notificaciones con Web Push.
// En iPhone solo funcionan con la app agregada a la pantalla de inicio (iOS 16.4 o más nuevo).
// Las claves (VAPID) se crean aquí mismo, en el teléfono; el envío lo hace el GitHub Action cada hora.

import { estado, guardarPush } from './store.js';
import { aB64url, deB64url } from './util.js';

const conLimite = (promesa, ms) =>
  Promise.race([promesa, new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('tiempo agotado')), ms))]);

const registro = () => conLimite(navigator.serviceWorker.ready, 8000);

export async function estadoPush() {
  const soportado = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const instalada = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let suscripcion = null;
  let endpoint = null;
  if (soportado) {
    try {
      const reg = await conLimite(navigator.serviceWorker.ready, 4000);
      const sus = await reg.pushManager.getSubscription();
      if (sus) {
        suscripcion = JSON.stringify(sus.toJSON());
        endpoint = sus.endpoint;
      }
    } catch {
      // sin service worker todavía: se muestra como "no activadas"
    }
  }
  return { soportado, instalada, ios, permiso: soportado ? Notification.permission : 'default', suscripcion, endpoint };
}

/** Par de claves VAPID (curva P-256), en el formato que usa la librería web-push. */
async function crearClaves() {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publica = aB64url(await crypto.subtle.exportKey('raw', par.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
  return { publica, privada: jwk.d };
}

export async function activarPush() {
  // Lo primero es pedir permiso: iOS exige que salga directo del toque del botón.
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    const error = new Error('Sin permiso de notificaciones');
    error.codigo = 'permiso';
    throw error;
  }
  if (!estado.push.publica) guardarPush(await crearClaves());
  const reg = await registro();
  const previa = await reg.pushManager.getSubscription();
  if (previa) {
    if (previa.endpoint === estado.push.endpoint) return JSON.stringify(previa.toJSON());
    await previa.unsubscribe(); // era de otras claves: se rehace
  }
  const sus = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: deB64url(estado.push.publica),
  });
  guardarPush({ endpoint: sus.endpoint });
  return JSON.stringify(sus.toJSON());
}

export async function desactivarPush() {
  try {
    const reg = await registro();
    const sus = await reg.pushManager.getSubscription();
    if (sus) await sus.unsubscribe();
  } finally {
    guardarPush({ endpoint: null });
  }
}

/** Borra claves y suscripción para empezar de cero (por si se perdió la clave privada). */
export async function reiniciarPush() {
  await desactivarPush().catch(() => {});
  guardarPush({ publica: null, privada: null, endpoint: null });
}

export async function probarLocal() {
  const reg = await registro();
  await reg.showNotification('Mi Plan ⚔️', {
    body: 'Así se van a ver tus frases. ¡A darle!',
    icon: 'icons/icon-192.png',
    tag: 'prueba',
    data: { url: './' },
  });
}
