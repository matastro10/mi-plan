// Modo día / modo noche. En automático, la playa se hace de noche de 8 PM a 6 AM.

import { estado } from './store.js';

export function esNoche(d = new Date()) {
  const tema = estado.ajustes.tema || 'auto';
  if (tema === 'noche') return true;
  if (tema === 'dia') return false;
  const h = d.getHours();
  return h >= 20 || h < 6;
}

export function aplicarTema() {
  const noche = esNoche();
  const raiz = document.documentElement;
  const valor = noche ? 'noche' : 'dia';
  if (raiz.dataset.tema !== valor) raiz.dataset.tema = valor;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = noche ? '#081A33' : '#4FC3D9';
  return noche;
}
