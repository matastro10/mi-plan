// Hojas que suben desde abajo: opciones de una comida, botón de hambre, detalle de un día...
// Cada tipo de hoja se registra con definirHoja(tipo, fn) y fn devuelve { titulo, cuerpo, pie }.

import { accion } from './acciones.js';

const fabricas = {};
let actual = null;
let regreso = null; // a qué botón regresa el foco al cerrar

export const definirHoja = (tipo, fn) => {
  fabricas[tipo] = fn;
};

export const hojaActual = () => actual;

export function abrirHoja(tipo, params = {}) {
  if (!actual) regreso = document.activeElement;
  actual = { tipo, params };
  pintarHoja(true);
}

export function cerrarHoja() {
  if (!actual) return;
  actual = null;
  const caja = document.getElementById('hojas');
  const velo = caja.querySelector('.velo');
  document.documentElement.classList.remove('con-hoja');
  if (velo) {
    velo.classList.add('sale');
    setTimeout(() => {
      if (!actual) caja.innerHTML = '';
    }, 230);
  }
  if (regreso?.isConnected) regreso.focus({ preventScroll: true });
  regreso = null;
}

export function pintarHoja(nueva = false) {
  const caja = document.getElementById('hojas');
  if (!actual || !caja) return;
  const partes = fabricas[actual.tipo]?.(actual.params);
  if (!partes) {
    cerrarHoja();
    return;
  }
  const previo = caja.querySelector('.hoja-cuerpo');
  const scroll = !nueva && previo ? previo.scrollTop : 0;
  caja.innerHTML = `<div class="velo${nueva ? ' entra' : ''}">
    <section class="hoja hoja-${actual.tipo}${nueva ? ' entra' : ''}" role="dialog" aria-modal="true" aria-labelledby="hoja-titulo" tabindex="-1">
      <header class="hoja-cab">
        <h2 id="hoja-titulo">${partes.titulo}</h2>
        <button type="button" class="hoja-cerrar" data-accion="cerrar-hoja" aria-label="Cerrar">✕</button>
      </header>
      <div class="hoja-cuerpo">${partes.cuerpo}</div>
      ${partes.pie ? `<footer class="hoja-pie">${partes.pie}</footer>` : ''}
    </section>
  </div>`;
  document.documentElement.classList.add('con-hoja');
  if (scroll) caja.querySelector('.hoja-cuerpo').scrollTop = scroll;
  if (nueva) caja.querySelector('.hoja').focus({ preventScroll: true });
}

accion('cerrar-hoja', () => cerrarHoja());

/** Se llama una vez al arrancar: cerrar tocando afuera, con Escape, y mantener el Tab dentro de la hoja. */
export function prepararHojas() {
  const caja = document.getElementById('hojas');
  caja.addEventListener('click', (ev) => {
    if (ev.target.classList?.contains('velo')) cerrarHoja();
  });
  document.addEventListener('keydown', (ev) => {
    if (!actual) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      cerrarHoja();
      return;
    }
    if (ev.key !== 'Tab') return;
    const hoja = caja.querySelector('.hoja');
    const focos = [...hoja.querySelectorAll('button:not([disabled]), summary, input, textarea, a[href]')];
    if (!focos.length) return;
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];
    if (ev.shiftKey && (document.activeElement === primero || document.activeElement === hoja)) {
      ev.preventDefault();
      ultimo.focus();
    } else if (!ev.shiftKey && document.activeElement === ultimo) {
      ev.preventDefault();
      primero.focus();
    }
  });
}
