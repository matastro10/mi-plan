// Botón "Tengo mucha hambre": da UNA recomendación a la vez, usando solo lo que dice el plan.
// Orden: 1) agua y 10 minutos · 2) alimentos libres · 3) adelantar la siguiente comida si falta poco
//        · 4) recordar la comida libre. Si ya es hora de una comida, lo primero es comerla.

import { datos } from './datos.js';
import {
  slots,
  queToca,
  semana,
  registrarHambre,
  espera,
  iniciarEspera,
  terminarEspera,
  sumarAgua,
  fraseAlAzar,
  fraseDelDia,
} from './store.js';
import { esc, claveFecha, rango12, duracion } from './util.js';
import { accion } from './acciones.js';
import { aviso } from './avisos.js';
import { definirHoja, abrirHoja, cerrarHoja, pintarHoja, hojaActual } from './hojas.js';

const MINUTOS = 10;
const FALTA_POCO = 90; // minutos: hasta cuánto antes se sugiere adelantar la siguiente comida

let w = { paso: 'agua', num: 1, frase: '' };

function contexto() {
  const hoy = claveFecha();
  const lista = slots(hoy);
  return { hoy, toca: queToca(lista), sem: semana(hoy), pendientes: lista.filter((s) => !s.ok) };
}

const nombreDe = (s) => (s.slot.nombreLargo || s.slot.nombre).toLowerCase();

/** Para este momento se usan frases de calma y de cuidarse (lista "hambre" de data/frases.json). */
function fraseParaHambre(hoy) {
  const propias = (datos.frases.hambre || []).filter((f) => typeof f === 'string' && f.trim());
  if (propias.length) return propias[Math.floor(Math.random() * propias.length)];
  return fraseAlAzar(fraseDelDia(hoy));
}

export function abrirHambre() {
  const hoy = claveFecha();
  registrarHambre(hoy);
  const e = espera();
  w = { paso: 'agua', num: 1, frase: fraseParaHambre(hoy) };
  if (e && Date.now() - e.fin < 20 * 60000) {
    w.paso = 'espera'; // el temporizador sigue corriendo, o acaba de terminar
  } else {
    if (e) terminarEspera();
    if (contexto().toca?.tipo === 'ahora') w.paso = 'toca';
  }
  abrirHoja('hambre');
}

function ir(paso) {
  // Número de paso que se muestra: agua = 1, libres = 2, y los que sigan según cuáles apliquen hoy.
  if (paso === 'agua' || paso === 'espera') w.num = 1;
  else if (paso === 'libres') w.num = 2;
  else if (paso === 'adelantar') w.num = 3;
  else if (paso === 'libre') w.num = w.paso === 'adelantar' ? 4 : 3;
  w.paso = paso;
  pintarHoja();
}

/** Qué sigue después de los alimentos libres. */
function trasLibres() {
  const { toca } = contexto();
  if (toca && (toca.tipo === 'ahora' || toca.faltan <= FALTA_POCO)) return 'adelantar';
  return trasAdelantar();
}

function trasAdelantar() {
  const { sem, pendientes } = contexto();
  return !sem.libre && pendientes.length ? 'libre' : 'final';
}

const lista = (items) => `<ul class="lista-plan">${(items || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

definirHoja('hambre', () => {
  const c = contexto();
  const libres = datos.plan.libres || {};
  const cabeza = `<div class="animo">
      <p class="animo-1">💪 Tener hambre es normal, no pasa nada.</p>
      ${w.frase ? `<p class="animo-2">${esc(w.frase)}</p>` : ''}
    </div>`;
  const seguido =
    c.sem.hambre >= 4
      ? `<p class="nota-calma">Esta semana ya usaste este botón ${c.sem.hambre} veces. Coméntaselo a tu nutrióloga en la próxima cita: quizá hay que ajustar el plan.</p>`
      : '';
  let cuerpo = '';
  let pie = '';

  if (w.paso === 'toca' && c.toca?.tipo === 'ahora') {
    const s = c.toca.s;
    cuerpo = `<div class="paso">
        <h3>🍽️ ¡Ya te toca comer!</h3>
        <p>Tu ${esc(nombreDe(s))} es ahora (${rango12(s.inicio, s.fin)}). Cómela con calma: para eso está.</p>
      </div>`;
    pie = `<button type="button" class="btn" data-accion="hambre-comida" data-menu="${esc(s.menu.id)}">Ver mis opciones</button>
      <button type="button" class="btn sec" data-accion="hambre-ir" data-paso="agua">Ya me la comí y sigo con hambre</button>`;
  } else if (w.paso === 'espera') {
    cuerpo = `<div class="paso">
        <h3>⏳ Paso 1: espera tus ${MINUTOS} minutos</h3>
        <div class="crono" id="crono">
          <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="crono-fondo" cx="60" cy="60" r="52"/><circle class="crono-aro" id="crono-aro" cx="60" cy="60" r="52" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/></svg>
          <span class="crono-num" id="crono-num" role="timer" aria-live="off">--:--</span>
        </div>
        <p id="crono-txt">Tómate tu vaso con calma y deja pasar el tiempo.</p>
      </div>`;
    pie = `<button type="button" class="btn" data-accion="hambre-paso">Ya se me pasó 💪</button>
      <button type="button" class="btn sec" data-accion="hambre-ir" data-paso="libres">Sigo con hambre</button>`;
  } else if (w.paso === 'libres') {
    const ej = (libres.ejemplosVerdura || []).join(', ');
    cuerpo = `<div class="paso">
        <h3>🥒 Paso ${w.num}: algo de tus alimentos libres</h3>
        <p>Son libres: puedes comerlos en cualquier momento.</p>
        ${lista(libres.alimentos)}
        ${ej ? `<p class="detalle">Por ejemplo: ${esc(ej)}.</p>` : ''}
      </div>`;
    pie = `<button type="button" class="btn" data-accion="hambre-va">Va, voy por eso</button>
      <button type="button" class="btn sec" data-accion="hambre-sigue">Sigo con hambre</button>`;
  } else if (w.paso === 'adelantar' && c.toca) {
    const s = c.toca.s;
    const cuando = c.toca.tipo === 'ahora' ? 'ya está en su horario' : `empieza en ${duracion(c.toca.faltan)}`;
    cuerpo = `<div class="paso">
        <h3>⏩ Paso ${w.num}: adelanta tu ${esc(nombreDe(s))}</h3>
        <p>Tu ${esc(nombreDe(s))} (${rango12(s.inicio, s.fin)}) ${cuando}. Adelántala: sigue siendo tu plan.</p>
      </div>`;
    pie = `<button type="button" class="btn" data-accion="hambre-comida" data-menu="${esc(s.menu.id)}">Ver opciones y adelantarla</button>
      <button type="button" class="btn sec" data-accion="hambre-ir" data-paso="${trasAdelantar()}">Mejor espero</button>`;
  } else if (w.paso === 'libre' && !c.sem.libre && c.pendientes.length) {
    cuerpo = `<div class="paso">
        <h3>🎉 Paso ${w.num}: tu comida libre</h3>
        <p>Todavía no usas tu comida libre de esta semana. ¿La usas ahorita o la guardas para un momento que valga la pena?</p>
      </div>`;
    pie = `<button type="button" class="btn" data-accion="libre-usar">Usarla ahora</button>
      <button type="button" class="btn sec" data-accion="hambre-ir" data-paso="final">La guardo 😎</button>`;
  } else if (w.paso === 'final' || w.paso === 'adelantar' || w.paso === 'libre') {
    const sig = c.toca?.s;
    cuerpo = `<div class="paso">
        <h3>Si de plano sigues con mucha hambre</h3>
        <p>Come más de tus alimentos libres${sig ? ` o adelanta tu ${esc(nombreDe(sig))}` : ''}. Comer cuando de verdad tienes hambre no es fallar.</p>
        <p>Y cuéntaselo a tu nutrióloga: ella puede ajustar el plan para que no te quedes con hambre.</p>
      </div>`;
    pie = `${sig ? `<button type="button" class="btn" data-accion="hambre-comida" data-menu="${esc(sig.menu.id)}">Ver opciones de mi ${esc(nombreDe(sig))}</button>` : ''}
      <button type="button" class="btn${sig ? ' sec' : ''}" data-accion="cerrar-hoja">Entendido</button>`;
  } else {
    // Paso 1: agua (o café / té) y 10 minutos
    cuerpo = `<div class="paso">
        <h3>💧 Paso 1: un vaso grande y ${MINUTOS} minutos</h3>
        <p>Tómate un vaso grande de algo de tu lista libre (sin azúcar):</p>
        ${lista(libres.bebidas)}
        <p>Luego espera ${MINUTOS} minutos y ve cómo te sientes.</p>
      </div>`;
    pie = `<button type="button" class="btn" data-accion="hambre-espera">⏳ Empezar los ${MINUTOS} minutos</button>
      <button type="button" class="btn sec" data-accion="hambre-ir" data-paso="libres">Ya lo hice y sigo con hambre</button>
      <button type="button" class="enlace" data-accion="hambre-vaso">Sumar ese vaso a mi agua de hoy</button>`;
  }

  return { titulo: '🛟 Tengo mucha hambre', cuerpo: cabeza + cuerpo + seguido, pie };
});

/* ---------- Temporizador ---------- */

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let avisado = false;

/** Se llama cada segundo: actualiza el reloj de la hoja y la etiqueta sobre la boya. */
export function latidoCrono() {
  const e = espera();
  const chapa = document.getElementById('boya-crono');
  if (!e) {
    if (chapa) chapa.hidden = true;
    avisado = false;
    return false;
  }
  const falta = e.fin - Date.now();
  if (falta < -20 * 60000) {
    terminarEspera();
    return false;
  }
  if (chapa) {
    chapa.hidden = false;
    chapa.textContent = falta > 0 ? `⏳ ${mmss(falta)}` : '¡Listo!';
  }
  const num = document.getElementById('crono-num');
  if (num) {
    num.textContent = mmss(falta);
    const aro = document.getElementById('crono-aro');
    const total = Number(e.total) || MINUTOS * 60000;
    if (aro) aro.setAttribute('stroke-dashoffset', String(Math.min(100, Math.max(0, 100 - (falta / total) * 100))));
    const txt = document.getElementById('crono-txt');
    if (txt && falta <= 0) txt.textContent = `¡Listo! Pasaron los ${MINUTOS} minutos. ¿Cómo vas?`;
  }
  if (falta <= 0 && !avisado) {
    avisado = true;
    if (hojaActual()?.tipo !== 'hambre') aviso(`⏳ Pasaron los ${MINUTOS} minutos. Toca la boya y dime cómo vas.`, 5000);
  }
  return true;
}

/* ---------- Acciones ---------- */

accion('hambre', () => abrirHambre());

accion('hambre-ir', (el) => {
  if (w.paso === 'espera') terminarEspera();
  ir(el.dataset.paso);
});

accion('hambre-espera', () => {
  avisado = false;
  w.paso = 'espera';
  iniciarEspera(MINUTOS);
  latidoCrono();
});

accion('hambre-vaso', () => {
  sumarAgua(claveFecha(), 1);
  aviso('Vaso sumado a tu agua 💧', 1800);
});

accion('hambre-paso', () => {
  terminarEspera();
  cerrarHoja();
  aviso('¡Bien ahí! Sigue con tu día 🤙');
});

accion('hambre-va', () => {
  cerrarHoja();
  aviso('Buen provecho 🥒');
});

accion('hambre-sigue', () => ir(trasLibres()));

accion('hambre-comida', (el) => {
  terminarEspera();
  abrirHoja('comida', { menuId: el.dataset.menu });
});
