// Avisos cortos que aparecen abajo y se van solos, y el confeti de arena.

import { sinMovimiento } from './util.js';

export function aviso(texto, ms = 2800) {
  const caja = document.getElementById('avisos');
  if (!caja) return;
  const el = document.createElement('div');
  el.className = 'aviso';
  el.textContent = texto;
  caja.appendChild(el);
  while (caja.children.length > 2) caja.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('sale');
    setTimeout(() => el.remove(), 350);
  }, ms);
}

const COLORES = ['#F4E1C1', '#F28C38', '#E86A5C', '#4FC3D9', '#FFD166', '#C9A46B'];

/** Granitos de arena que saltan desde un elemento (al completar el día). */
export function confetiArena(origen) {
  if (sinMovimiento() || !origen?.animate) return;
  const r = origen.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < 36; i++) {
    const g = document.createElement('span');
    g.className = 'grano';
    g.style.left = `${cx}px`;
    g.style.top = `${cy}px`;
    g.style.background = COLORES[i % COLORES.length];
    document.body.appendChild(g);
    const ang = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 140;
    const anim = g.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        {
          transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 70}px) rotate(${Math.random() * 540}deg) scale(.5)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' },
    );
    anim.onfinish = () => g.remove();
  }
}
