#!/usr/bin/env node
// Manda la frase de la hora al teléfono. Lo corre el GitHub Action cada hora.
//
//   node enviar.mjs            → manda la frase que toca (si está en horario)
//   node enviar.mjs --decidir  → solo dice si toca mandar (para el Action)
//   node enviar.mjs --agenda   → muestra las frases de hoy, hora por hora
//   node enviar.mjs --ensayo   → muestra lo que mandaría, sin mandarlo
//
// Secretos (GitHub → Settings → Secrets and variables → Actions):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SUBSCRIPTION   → notificaciones de la app (Web Push)
//   NTFY_TOPIC                                               → plan B con la app ntfy (opcional)

import { readFile, appendFile } from 'node:fs/promises';
import { agendaDelDia, fraseParaHora, ahoraEnZona, horario } from './logica.mjs';

const RAIZ = new URL('../', import.meta.url);
const leerJSON = async (ruta) => JSON.parse(await readFile(new URL(ruta, RAIZ), 'utf8'));
const args = new Set(process.argv.slice(2));
const env = process.env;
const tiene = (nombre) => Boolean(env[nombre] && env[nombre].trim());

const [config, frases, plan] = await Promise.all([
  leerJSON('data/config.json'),
  leerJSON('data/frases.json'),
  leerJSON('data/plan.json'),
]);
const datos = { config, frases, plan };
const zona = config.zonaHoraria || 'America/Argentina/Buenos_Aires';

// El Action corre al minuto 58 y a veces GitHub lo atrasa; sumando 5 minutos queda en "la hora que viene".
const momento = tiene('SIMULAR') ? new Date(env.SIMULAR) : new Date(Date.now() + 5 * 60000);
if (Number.isNaN(momento.getTime())) {
  console.error('SIMULAR no es una fecha válida. Ejemplo: 2026-11-10T12:00:00-03:00');
  process.exit(1);
}
const local = ahoraEnZona(zona, momento);
const dosDigitos = (n) => String(n).padStart(2, '0');

if (args.has('--agenda')) {
  const { ini, fin } = horario(config);
  console.log(`Frases del ${local.fecha} (${zona}), de ${ini}:00 a ${fin}:00\n`);
  for (const a of agendaDelDia(local.fecha, datos)) {
    console.log(`${dosDigitos(a.hora)}:00  [${a.tipo.padEnd(6)}]  ${a.texto ?? '(sin frase)'}`);
  }
  process.exit(0);
}

const esPrueba = env.PRUEBA === 'true' || args.has('--prueba');
const conWebPush = tiene('PUSH_SUBSCRIPTION') && tiene('VAPID_PUBLIC_KEY') && tiene('VAPID_PRIVATE_KEY');
const conNtfy = tiene('NTFY_TOPIC');

let elegida = fraseParaHora(local, datos);
if (esPrueba) {
  const muestra = elegida?.texto || agendaDelDia(local.fecha, datos).find((a) => a.tipo === 'frase')?.texto || '';
  elegida = { tipo: 'prueba', texto: `Prueba lista ✅ Así te van a llegar tus frases. ${muestra}`.trim() };
}

const horaTxt = `${local.fecha} ${dosDigitos(local.hora)}:${dosDigitos(local.minuto)} (${zona})`;

if (args.has('--decidir')) {
  let enviar = false;
  if (!elegida) console.log(`${horaTxt}: fuera de horario, no se manda nada.`);
  else if (!conWebPush && !conNtfy) {
    console.log('Todavía no hay secretos configurados (PUSH_SUBSCRIPTION + claves VAPID, o NTFY_TOPIC). No se manda nada.');
    if (esPrueba) console.log('::warning::Faltan los secretos. Abre la app → Ajustes → Frases cada hora y sigue los pasos.');
  } else {
    enviar = true;
    console.log(`${horaTxt}: toca mandar frase (${elegida.tipo}).`);
  }
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `enviar=${enviar}\n`);
  process.exit(0);
}

if (!elegida) {
  console.log(`${horaTxt}: fuera de horario, no se manda nada.`);
  process.exit(0);
}

const mensaje = {
  title: config.tituloNotificacion || 'Mi Plan',
  body: elegida.texto,
  tag: elegida.tipo === 'comida' ? 'comida' : 'frase',
  url: './',
};

if (args.has('--ensayo')) {
  console.log(`${horaTxt}\nMandaría (${elegida.tipo}):\n  ${mensaje.title}\n  ${mensaje.body}`);
  process.exit(0);
}

if (!conWebPush && !conNtfy) {
  console.log('No hay secretos configurados: no se manda nada.');
  process.exit(0);
}

const errores = [];

/* ---------- Web Push (la app instalada en el iPhone) ---------- */

async function mandarWebPush() {
  const { default: webpush } = await import('web-push');
  let suscripciones;
  try {
    const leido = JSON.parse(env.PUSH_SUBSCRIPTION);
    suscripciones = Array.isArray(leido) ? leido : [leido];
    for (const s of suscripciones) {
      if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) throw new Error('incompleta');
    }
  } catch {
    throw new Error('El secreto PUSH_SUBSCRIPTION no está bien copiado. Cópialo otra vez desde la app (Ajustes → Frases cada hora) y pégalo completo.');
  }
  const sujeto = tiene('VAPID_SUBJECT')
    ? env.VAPID_SUBJECT.trim()
    : `https://github.com/${env.GITHUB_REPOSITORY || 'mi-plan'}`;
  try {
    webpush.setVapidDetails(sujeto, env.VAPID_PUBLIC_KEY.trim(), env.VAPID_PRIVATE_KEY.trim());
  } catch {
    throw new Error('Las claves VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no están bien copiadas. Cópialas otra vez desde la app.');
  }
  for (const [i, sus] of suscripciones.entries()) {
    try {
      const r = await webpush.sendNotification(sus, JSON.stringify(mensaje), {
        TTL: 50 * 60, // si el teléfono está apagado más de 50 min, esa frase ya no llega tarde
        urgency: 'normal',
        topic: mensaje.tag,
      });
      console.log(`Web Push ${i + 1}: enviada (respuesta ${r.statusCode}).`);
    } catch (e) {
      const codigo = e?.statusCode;
      if (codigo === 404 || codigo === 410) {
        throw new Error('Tu suscripción caducó. Abre la app → Ajustes → Frases cada hora, activa de nuevo, copia PUSH_SUBSCRIPTION y actualiza el secreto en GitHub.');
      }
      if (codigo === 401 || codigo === 403) {
        throw new Error(`El servidor de notificaciones rechazó las claves (error ${codigo}). Revisa que VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y PUSH_SUBSCRIPTION sean los tres de la misma activación.`);
      }
      throw new Error(`No se pudo enviar la notificación${codigo ? ` (error ${codigo})` : ''}: ${e?.body || e?.message || e}`);
    }
  }
}

/* ---------- Plan B: ntfy ---------- */

async function mandarNtfy() {
  const servidor = (tiene('NTFY_SERVER') ? env.NTFY_SERVER.trim() : 'https://ntfy.sh').replace(/\/+$/, '');
  const r = await fetch(servidor, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: env.NTFY_TOPIC.trim(), title: mensaje.title, message: mensaje.body }),
  });
  if (!r.ok) throw new Error(`ntfy respondió con error ${r.status}.`);
  console.log('ntfy: enviada.');
}

if (conWebPush) await mandarWebPush().catch((e) => errores.push(e.message));
if (conNtfy) await mandarNtfy().catch((e) => errores.push(e.message));

console.log(`${horaTxt} · ${elegida.tipo}: ${mensaje.body}`);

if (errores.length) {
  for (const e of errores) console.log(`::error::${e}`);
  // Para no llenarte el correo de avisos, el Action solo "falla" en la prueba y en la primera frase del día.
  const { ini } = horario(config);
  process.exit(esPrueba || local.hora === ini ? 1 : 0);
}
