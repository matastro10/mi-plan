// Arranque de la app: carga los datos, pinta la pantalla y conecta los botones.

import { cargarDatos, datos } from './datos.js';
import { estado, alCambiar, emitir, progreso, slots, queToca, atrasadas, cambiarAjuste } from './store.js';
import { ui } from './ui.js';
import { accion, despachar } from './acciones.js';
import { aplicarTema, esNoche } from './tema.js';
import { escenaSVG, marHTML, alturaAstro, brilloReflejo, ASTRO_X } from './escena.js';
import { aviso, confetiArena } from './avisos.js';
import { prepararHojas, pintarHoja } from './hojas.js';
import { vistaHoy } from './vista-hoy.js';
import { vistaPlan } from './vista-plan.js';
import { vistaHistorial } from './vista-historial.js';
import { vistaAjustes, refrescarPush, alElegirRespaldo } from './vista-ajustes.js';
import './hoja-comida.js';
import { latidoCrono } from './hambre.js';
import { esc, claveFecha, fechaLarga } from './util.js';

const VISTAS = { hoy: vistaHoy, plan: vistaPlan, historial: vistaHistorial, ajustes: vistaAjustes };
const TITULOS = { hoy: 'Mi Plan', plan: 'Mi plan', historial: 'Historial', ajustes: 'Ajustes' };

const $ = (id) => document.getElementById(id);

/* ---------- Encabezado ---------- */

function saludo() {
  const h = new Date().getHours();
  const base = h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = estado.ajustes.nombre.trim();
  return nombre ? `${base}, ${nombre}` : base;
}

function pintarCabecera(noche) {
  const hoy = claveFecha();
  $('cabecera').classList.toggle('compacta', ui.vista !== 'hoy');
  $('titulo').textContent = TITULOS[ui.vista];
  $('saludo').textContent = saludo();
  $('fecha').textContent = fechaLarga(hoy);

  const caja = $('escena');
  const p = progreso(hoy);
  const compacta = ui.vista !== 'hoy';
  if (caja.dataset.noche !== String(noche) || !caja.firstElementChild) {
    caja.innerHTML = escenaSVG({ noche, p, compacta });
    caja.dataset.noche = String(noche);
    return;
  }
  // Misma escena: solo se mueve el sol (o la luna) con el avance del día.
  const astro = caja.querySelector('#e-astro');
  if (astro) astro.style.transform = `translate(${ASTRO_X}px, ${alturaAstro(noche, p, compacta)}px)`;
  const reflejo = caja.querySelector('#e-reflejo');
  if (reflejo && !noche) reflejo.setAttribute('opacity', String(brilloReflejo(p)));
}

/* ---------- Pintar todo ---------- */

let firmaTiempo = '';

function firmaDeTiempo() {
  const hoy = claveFecha();
  const base = `${hoy}|${esNoche()}`;
  if (ui.vista !== 'hoy') return base;
  const lista = slots(hoy);
  const toca = queToca(lista);
  return [base, toca?.s.menu.id, toca?.tipo, toca?.faltan, atrasadas(lista).length].join('|');
}

function correrEfectos() {
  for (const e of ui.efectos.splice(0)) {
    if (e.tipo === 'lavado') {
      const tarjeta = $(e.id);
      if (!tarjeta) continue;
      const ola = document.createElement('span');
      ola.className = 'lavado';
      ola.setAttribute('aria-hidden', 'true');
      tarjeta.appendChild(ola);
      ola.addEventListener('animationend', () => ola.remove());
      setTimeout(() => ola.remove(), 1600);
    } else if (e.tipo === 'confeti') {
      confetiArena(document.querySelector('.progreso .tabla') || document.querySelector('.progreso'));
    }
  }
}

function pintar() {
  if (!datos.plan) return;
  const foco = document.activeElement?.dataset?.k;
  const noche = aplicarTema();
  pintarCabecera(noche);

  const cont = $('vista');
  cont.dataset.vista = ui.vista;
  cont.innerHTML = VISTAS[ui.vista]();

  document.querySelectorAll('.barra [data-vista]').forEach((b) => {
    if (b.dataset.vista === ui.vista) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  pintarHoja();
  if (foco) document.querySelector(`[data-k="${CSS.escape(foco)}"]`)?.focus({ preventScroll: true });
  correrEfectos();
  latidoCrono();
  firmaTiempo = firmaDeTiempo();
}

/** Cada rato: si cambió el día, la hora de una comida o el modo noche, se vuelve a pintar. */
function tic() {
  if (!datos.plan || firmaDeTiempo() === firmaTiempo) return;
  const activo = document.activeElement;
  if (activo && /^(INPUT|TEXTAREA)$/.test(activo.tagName)) return; // no interrumpir mientras escribe
  pintar();
}

/* ---------- Navegación ---------- */

function irA(vista, { subir = true } = {}) {
  if (!VISTAS[vista]) return;
  ui.vista = vista;
  try {
    history.replaceState(null, '', `#${vista}`);
  } catch {
    // sin historial (archivo local): no pasa nada
  }
  emitir();
  if (subir) window.scrollTo(0, 0);
  if (vista === 'ajustes') refrescarPush();
}

accion('ir', (el) => irA(el.dataset.vista));
accion('recargar', () => location.reload());

/* ---------- Arranque ---------- */

function pantallaDeError(error) {
  $('titulo').textContent = 'Mi Plan';
  $('vista').innerHTML = `<section class="tarjeta">
    <h2>No pude abrir tu plan</h2>
    <p>${esc(error.message)}</p>
    <p class="detalle">Revisa tu conexión y vuelve a intentar.</p>
    <button type="button" class="btn" data-accion="recargar">Reintentar</button>
  </section>`;
}

async function iniciar() {
  aplicarTema();
  $('mar').innerHTML = marHTML();
  prepararHojas();
  document.addEventListener('click', despachar);

  try {
    await cargarDatos();
  } catch (error) {
    console.error(error);
    pantallaDeError(error);
    return;
  }

  const inicial = location.hash.slice(1);
  if (VISTAS[inicial]) ui.vista = inicial;

  alCambiar(pintar);
  pintar();
  if (ui.vista === 'ajustes') refrescarPush();
  if (datos.origen === 'respaldo' && navigator.onLine && datos.aviso) {
    aviso(`${datos.aviso} Uso la última copia buena de tu plan.`, 6000);
  }

  // Campos de texto de Ajustes
  $('vista').addEventListener('change', (ev) => {
    const campo = ev.target;
    if (campo.dataset?.ajuste) {
      // Se guarda sin redibujar la pantalla, para no "comerse" el toque que sigue.
      cambiarAjuste(campo.dataset.ajuste, campo.value.trim().slice(0, 60), false);
      $('saludo').textContent = saludo();
    }
    if (campo.id === 'archivo-respaldo') alElegirRespaldo(campo);
  });
  $('vista').addEventListener('input', (ev) => {
    if (ev.target.id === 'frase-nueva') ui.borradorFrase = ev.target.value;
  });

  // Recordar qué secciones plegables están abiertas
  document.addEventListener(
    'toggle',
    (ev) => {
      const d = ev.target;
      if (d.tagName !== 'DETAILS' || !d.id) return;
      if (d.open) ui.abiertos.add(d.id);
      else ui.abiertos.delete(d.id);
    },
    true,
  );

  setInterval(tic, 20000);
  setInterval(latidoCrono, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    tic();
    latidoCrono();
  });
  window.addEventListener('hashchange', () => {
    const v = location.hash.slice(1);
    if (VISTAS[v] && v !== ui.vista) irA(v);
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Sin service worker:', e));
  }
  navigator.storage?.persist?.().catch(() => {});
}

iniciar();
