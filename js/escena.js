// Los dibujos de la app (todos hechos aquí, en SVG): la playa del encabezado,
// el mar de abajo, la fogata de la racha y la tabla de surf del progreso.

import { semilla, azar } from './util.js';

const r1 = (x) => Math.round(x * 10) / 10;

/* ---------- Palmeras ---------- */

const HOJA = 'M0 0 C 18 -20, 50 -24, 78 2 C 54 -8, 26 -6, 0 0 Z';

function hoja(angulo, largo, espejo) {
  const giro = espejo ? -angulo : angulo;
  return `<path d="${HOJA}" transform="rotate(${giro}) scale(${espejo ? -largo : largo} ${largo})"/>`;
}

function palmera({ x, y, escala, tronco, clase = '' }) {
  const angulos = [-64, -34, -4, 30];
  const derecha = angulos.map((a, i) => hoja(a, i % 2 ? 0.9 : 1, false)).join('');
  const izquierda = angulos.map((a, i) => hoja(a, i % 2 ? 1 : 0.9, true)).join('');
  return `<g class="palma ${clase}" transform="translate(${x} ${y}) scale(${escala})">
    <path class="tronco" d="${tronco}" fill="none" stroke-width="9" stroke-linecap="round"/>
    <path class="tronco-anillos" d="${tronco}" fill="none" stroke-width="9" stroke-dasharray="1.5 8" stroke-linecap="butt"/>
    <g class="copa">${izquierda}${derecha}${hoja(-96, 0.62, false)}</g>
    <circle class="coco" cx="-4" cy="5" r="4.2"/><circle class="coco" cx="5" cy="7" r="4.2"/>
  </g>`;
}

/* ---------- Sol a rayas (estilo cartel retro) ---------- */

/** Rebanada horizontal de un círculo de radio r, entre las alturas ya y yb. */
function rebanada(r, ya, yb) {
  const x = (y) => r1(Math.sqrt(Math.max(0, r * r - y * y)));
  if (ya <= -r) return `M ${-x(yb)} ${yb} A ${r} ${r} 0 ${yb > 0 ? 1 : 0} 1 ${x(yb)} ${yb} Z`;
  if (yb >= r) return `M ${x(ya)} ${ya} A ${r} ${r} 0 ${ya < 0 ? 1 : 0} 1 ${-x(ya)} ${ya} Z`;
  return `M ${-x(ya)} ${ya} L ${x(ya)} ${ya} A ${r} ${r} 0 0 1 ${x(yb)} ${yb} L ${-x(yb)} ${yb} A ${r} ${r} 0 0 1 ${-x(ya)} ${ya} Z`;
}

const SOL = [
  [-38, 7],
  [9.6, 15.4],
  [19.2, 25],
  [30, 38],
]
  .map(([a, b]) => `<path d="${rebanada(38, a, b)}"/>`)
  .join('');

/* ---------- Encabezado: cielo, sol o luna, mar y orilla ---------- */

export const ASTRO_X = 292;

/** Altura del sol o la luna según el avance del día (0 a 1): el sol baja al mar, la luna sube. */
export function alturaAstro(noche, p, compacta = false) {
  const q = Math.max(0, Math.min(1, p));
  const y = noche ? 146 - q * 70 : 72 + q * 98;
  // En el encabezado chico se ve menos cielo: el astro no sube tanto para que no se corte.
  return r1(compacta ? Math.max(y, noche ? 114 : 128) : y);
}

export const brilloReflejo = (p) => r1(0.35 + Math.max(0, Math.min(1, p)) * 0.4);

function bordeMar(y) {
  let d = `M0 ${y}`;
  for (let x = 0; x < 390; x += 26) d += ' q 6.5 -3 13 0 t 13 0';
  return `${d} V 240 H 0 Z`;
}

function estrellas() {
  const rnd = azar(semilla('cielo de playa'));
  let s = '';
  for (let i = 0; i < 38; i++) {
    const x = r1(6 + rnd() * 378);
    const y = r1(34 + rnd() * 118);
    const r = r1(0.6 + rnd() * 1.1);
    s += `<circle class="estrella e${i % 3}" cx="${x}" cy="${y}" r="${r}"/>`;
  }
  return s;
}

export function escenaSVG({ noche = false, p = 0, compacta = false } = {}) {
  const H = 172; // línea del horizonte
  const cx = ASTRO_X;
  const cy = alturaAstro(noche, p, compacta);

  const astro = noche
    ? `<circle r="70" fill="url(#e-halo)"/>
       <circle r="25" fill="#FCF0C3"/>
       <circle cx="-8" cy="-7" r="5" fill="#E7D69B"/><circle cx="9" cy="3" r="3.6" fill="#E7D69B"/><circle cx="-3" cy="11" r="2.6" fill="#E7D69B"/>`
    : `<circle r="84" fill="url(#e-halo)"/><g fill="url(#e-sol)">${SOL}</g>`;

  const reflejo = noche
    ? `<g id="e-reflejo" fill="#FCF0C3" opacity=".38"><rect x="${cx - 20}" y="180" width="34" height="1.8" rx=".9"/><rect x="${cx - 4}" y="186" width="22" height="1.8" rx=".9"/><rect x="${cx - 15}" y="193" width="26" height="1.8" rx=".9"/><rect x="${cx + 1}" y="200" width="13" height="1.8" rx=".9"/><rect x="${cx - 9}" y="207" width="9" height="1.8" rx=".9"/></g>`
    : `<g id="e-reflejo" fill="#FFE08A" opacity="${brilloReflejo(p)}"><rect x="${cx - 24}" y="180" width="48" height="3" rx="1.5"/><rect x="${cx - 14}" y="188" width="28" height="3" rx="1.5"/><rect x="${cx - 28}" y="197" width="56" height="3" rx="1.5"/><rect x="${cx - 10}" y="206" width="20" height="3" rx="1.5"/></g>`;

  const cielo = noche
    ? `<g class="estrellas">${estrellas()}</g>`
    : `<g class="nubes" fill="#fff"><g opacity=".8"><ellipse cx="206" cy="132" rx="30" ry="7"/><ellipse cx="192" cy="127" rx="14" ry="8"/><ellipse cx="218" cy="126" rx="15" ry="9"/></g><g opacity=".55"><ellipse cx="112" cy="152" rx="26" ry="5.5"/><ellipse cx="124" cy="148" rx="13" ry="7"/></g></g>
       <path d="M232 62 q5 -6 10 0 q5 -6 10 0 M252 78 q3.6 -4.4 7.2 0 q3.6 -4.4 7.2 0" fill="none" stroke="#0D4F62" stroke-width="1.7" stroke-linecap="round" opacity=".45"/>`;

  return `<svg class="escena" viewBox="0 0 390 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="e-halo"><stop offset="0" stop-color="${noche ? '#FCF0C3' : '#FFE9A8'}" stop-opacity="${noche ? 0.32 : 0.8}"/><stop offset="1" stop-color="${noche ? '#FCF0C3' : '#FFE9A8'}" stop-opacity="0"/></radialGradient>
      <linearGradient id="e-sol" gradientUnits="userSpaceOnUse" x1="0" y1="-38" x2="0" y2="38"><stop offset="0" stop-color="#FFE08A"/><stop offset=".55" stop-color="#F9A94A"/><stop offset="1" stop-color="#EE7B3C"/></linearGradient>
      <linearGradient id="e-mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${noche ? '#12395A' : '#1E8FA8'}"/><stop offset="1" stop-color="${noche ? '#1B4F73' : '#4FC3D9'}"/></linearGradient>
      <clipPath id="e-cielo"><rect x="0" y="-60" width="390" height="${H + 60}"/></clipPath>
    </defs>
    ${cielo}
    <g clip-path="url(#e-cielo)"><g id="e-astro" class="astro" style="transform:translate(${cx}px, ${cy}px)">${astro}</g></g>
    <path class="isla" d="M96 ${H + 1} q 26 -17 56 -9 q 20 -11 48 9 Z"/>
    <path d="${bordeMar(H)}" fill="url(#e-mar)"/>
    ${reflejo}
    <g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="1.6" opacity="${noche ? 0.22 : 0.5}">
      <path d="M40 190 q7 -3.4 14 0 t14 0"/><path d="M150 202 q7 -3.4 14 0 t14 0"/><path d="M96 183 q5 -2.6 10 0 t10 0"/><path d="M330 192 q6 -3 12 0 t12 0"/><path d="M214 186 q5 -2.6 10 0 t10 0"/>
    </g>
    <path class="espuma" d="M0 215 C 52 205, 104 225, 164 215 S 286 203, 390 219" fill="none" stroke-width="5" stroke-linecap="round"/>
    <path class="orilla" d="M0 218 C 52 208, 104 228, 164 218 S 286 206, 390 222 V 241 H 0 Z"/>
    ${palmera({ x: 34, y: 166, escala: 0.56, tronco: 'M0 4 C 4 40, -10 90, -30 140', clase: 'chica' })}
    ${palmera({ x: 352, y: 112, escala: 0.98, tronco: 'M0 4 C -2 44, 12 92, 30 136' })}
  </svg>`;
}

/* ---------- Mar animado de abajo (donde flota la barra) ---------- */

function ondas(ancho, lambda, amp, alto) {
  let d = `M0 ${amp}`;
  for (let x = 0; x < ancho; x += lambda) {
    d += ` Q ${x + lambda / 4} ${r1(-amp * 0.6)} ${x + lambda / 2} ${amp} T ${x + lambda} ${amp}`;
  }
  return `${d} V ${alto} H 0 Z`;
}

export function marHTML() {
  const capa = (clase, lambda, amp) =>
    `<svg class="ola ${clase}" viewBox="0 0 1920 130" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${ondas(1920, lambda, amp, 130)}"/></svg>`;
  return capa('ola-3', 240, 9) + capa('ola-2', 160, 8) + capa('ola-1', 120, 7);
}

/* ---------- Fogata de la racha ---------- */

/** nivel 0 = solo brasas · 5 = fogata enorme */
export function fogataSVG(nivel = 0) {
  const n = Math.max(0, Math.min(5, nivel));
  const s = [0, 0.52, 0.7, 0.88, 1.06, 1.24][n];
  const fuego =
    n > 0
      ? `<circle cx="80" cy="${r1(112 - 30 * s)}" r="${r1(62 * s)}" fill="url(#f-brillo)"/>
         <g transform="translate(80 118) scale(${s})">
           <path class="llama l1" d="M0 0 C -30 -14 -24 -48 -4 -84 C 0 -60 30 -50 26 -20 C 24 -6 12 0 0 0 Z" fill="#E86A5C"/>
           <path class="llama l2" d="M0 -2 C -19 -12 -15 -34 -1 -58 C 3 -42 19 -34 16 -15 C 14 -6 8 -2 0 -2 Z" fill="#F28C38"/>
           <path class="llama l3" d="M0 -3 C -10 -9 -8 -22 0 -36 C 3 -26 10 -20 8 -11 C 7 -6 4 -3 0 -3 Z" fill="#FFD166"/>
         </g>
         ${n >= 4 ? '<g class="chispas" fill="#FFD166"><circle cx="58" cy="52" r="2"/><circle cx="104" cy="40" r="1.6"/><circle cx="86" cy="22" r="1.8"/><circle cx="70" cy="30" r="1.3"/></g>' : ''}`
      : `<g class="brasas" fill="#F28C38"><circle cx="70" cy="116" r="3"/><circle cx="82" cy="113" r="2.4"/><circle cx="92" cy="117" r="2.8"/></g>
         <path class="humo" d="M80 104 q -8 -12 0 -22 q 8 -10 0 -22" fill="none" stroke-width="3" stroke-linecap="round"/>`;
  return `<svg class="fogata nivel-${n}" viewBox="0 0 160 150" aria-hidden="true" focusable="false">
    <defs><radialGradient id="f-brillo"><stop offset="0" stop-color="#FFD166" stop-opacity=".55"/><stop offset="1" stop-color="#F28C38" stop-opacity="0"/></radialGradient></defs>
    <ellipse class="monticulo" cx="80" cy="136" rx="72" ry="10"/>
    ${fuego}
    <g transform="translate(80 124)">
      <g transform="rotate(13)"><rect x="-46" y="-7" width="92" height="14" rx="7" fill="#6F4426"/><circle cx="40" cy="0" r="5" fill="#B98A5A"/></g>
      <g transform="rotate(-13)"><rect x="-46" y="-7" width="92" height="14" rx="7" fill="#8A5731"/><circle cx="-40" cy="0" r="5" fill="#C99A68"/></g>
    </g>
    <g class="piedras"><ellipse cx="26" cy="136" rx="9" ry="6"/><ellipse cx="134" cy="136" rx="9" ry="6"/><ellipse cx="46" cy="141" rx="7" ry="4.5"/><ellipse cx="114" cy="141" rx="7" ry="4.5"/></g>
  </svg>`;
}

/* ---------- Tabla de surf del progreso ---------- */

export const tablaSVG = () =>
  `<svg class="tabla-svg" viewBox="0 0 72 30" aria-hidden="true" focusable="false">
    <path d="M3 15 C 16 3, 50 2, 69 15 C 50 28, 16 27, 3 15 Z" fill="#FFF6E4" stroke="#12303A" stroke-width="2"/>
    <path d="M8 15 H 64" stroke="#C9A46B" stroke-width="1.3"/>
    <path d="M25 5.6 L 30.5 5 V 25 L 25 24.4 Z" fill="#E86A5C"/><path d="M33.5 4.8 H 37 V 25.2 H 33.5 Z" fill="#4FC3D9"/>
  </svg>`;
