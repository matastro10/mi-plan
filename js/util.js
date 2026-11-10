// Utilidades chicas: texto seguro, fechas, horas, azar con semilla y portapapeles.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dos = (n) => String(n).padStart(2, '0');

/* ---------- Fechas (siempre en la hora del teléfono) ---------- */

export function claveFecha(d = new Date()) {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function deClave(clave) {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(clave, n) {
  const d = deClave(clave);
  d.setDate(d.getDate() + n);
  return claveFecha(d);
}

/** Lunes de la semana a la que pertenece la fecha. */
export function lunesDe(clave) {
  return sumarDias(clave, -((deClave(clave).getDay() + 6) % 7));
}

/** Los 7 días (lunes a domingo) de la semana de esa fecha. */
export function semanaDe(clave) {
  const lunes = lunesDe(clave);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const fmtLarga = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtCorta = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const fmtDia = new Intl.DateTimeFormat('es-MX', { weekday: 'long' });
const fmtDiaMes = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

export const fechaLarga = (clave) => mayus(fmtLarga.format(deClave(clave)));
export const fechaCorta = (clave) => fmtCorta.format(deClave(clave)).replace(/\./g, '');
export const nombreMes = (anio, mes) => mayus(fmtMes.format(new Date(anio, mes, 1)));
export const nombreDia = (clave) => fmtDia.format(deClave(clave));
const fmtCompleta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
/** "2026-11-09" → "9 de noviembre de 2026" (si no es una fecha, la deja como venga) */
export const fechaCompleta = (clave) => (/^\d{4}-\d{2}-\d{2}$/.test(String(clave)) ? fmtCompleta.format(deClave(clave)) : String(clave ?? ''));
/** "2026-11-09" → "9 nov" */
export const diaMes = (clave) => fmtDiaMes.format(deClave(clave)).replace(/\./g, '');
export const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/* ---------- Horas ---------- */

export const aMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

export const minAhora = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

function partes12(min) {
  const h24 = Math.floor(min / 60) % 24;
  return { txt: `${h24 % 12 || 12}:${dos(min % 60)}`, ap: h24 >= 12 ? 'PM' : 'AM' };
}

/** "13:00" → "1:00 PM" */
export function hora12(hhmm) {
  const p = partes12(aMin(hhmm));
  return `${p.txt} ${p.ap}`;
}

/** ("12:00","13:00") → "12:00–1:00 PM" */
export function rango12(ini, fin) {
  const a = partes12(aMin(ini));
  const b = partes12(aMin(fin));
  return a.ap === b.ap ? `${a.txt}–${b.txt} ${b.ap}` : `${a.txt} ${a.ap}–${b.txt} ${b.ap}`;
}

/** Minutos → "1 h 20 min" */
export function duracion(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/* ---------- Azar con semilla (para que la frase del día no cambie al recargar) ---------- */

export function semilla(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function azar(inicial) {
  let a = inicial >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Base64 URL (para las claves de las notificaciones) ---------- */

export function aB64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deB64url(txt) {
  const limpio = txt.trim().replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(limpio.padEnd(Math.ceil(limpio.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/* ---------- Portapapeles ---------- */

export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // plan B para navegadores que no dejan usar el portapapeles moderno
  }
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, texto.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
