// Pantalla principal: la frase, el avance del día, las 5 comidas, el agua, la actividad y la comida libre.

import { datos } from './datos.js';
import {
  dia,
  slots,
  queToca,
  atrasadas,
  progreso,
  vasosMeta,
  semana,
  fraseDelDia,
  resumenEleccion,
  tachar,
  sumarAgua,
  alternarEjercicio,
  invertir,
  deshacerLibre,
} from './store.js';
import { esc, claveFecha, minAhora, rango12, nombreDia, duracion, INICIALES } from './util.js';
import { tablaSVG } from './escena.js';
import { accion } from './acciones.js';
import { ui } from './ui.js';
import { aviso } from './avisos.js';
import { abrirHoja } from './hojas.js';

/* ---------- Pintar ---------- */

export function vistaHoy() {
  const hoy = claveFecha();
  const d = dia(hoy);
  const lista = slots(hoy);
  const ahora = minAhora();
  const toca = queToca(lista, ahora);
  const sem = semana(hoy);
  const vm = vasosMeta();
  const hechas = lista.filter((s) => s.ok).length;
  const pct = Math.round(progreso(hoy) * 100);

  return `
    ${fraseHTML(hoy)}
    ${pendientesHTML(atrasadas(lista, ahora))}
    ${progresoHTML(pct, hechas, lista.length, d.agua, vm)}
    <section class="bloque-comidas" aria-label="Comidas de hoy">
      <ol class="comidas">${lista.map((s, i) => comidaHTML(s, i, toca)).join('')}</ol>
      ${invertirHTML(d)}
    </section>
    ${aguaHTML(d, vm)}
    ${actividadHTML(d, sem, hoy)}
    ${libreHTML(sem, hoy)}
  `;
}

function fraseHTML(hoy) {
  const f = fraseDelDia(hoy);
  if (!f) return '';
  return `<section class="frase" aria-label="Frase de hoy">
    <span class="frase-espada" aria-hidden="true">⚔️</span>
    <p>${esc(f)}</p>
  </section>`;
}

function pendientesHTML(tarde) {
  if (!tarde.length) return '';
  const nombres = tarde.map((s) => (s.slot.nombreLargo || s.slot.nombre).toLowerCase());
  const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0];
  return `<section class="pendientes" role="note">
    <span aria-hidden="true">⏰</span>
    <p><strong>Te falta tachar: ${esc(lista)}.</strong> Si ya comiste, ponle su palomita.</p>
  </section>`;
}

function progresoHTML(pct, hechas, total, agua, vm) {
  const f = pct / 100;
  const titulo = pct >= 100 ? '¡Día completo! 🤙' : pct === 0 ? 'Tu ola de hoy' : 'Vas surfeando tu día';
  return `<section class="tarjeta progreso">
    <div class="fila">
      <h2>${titulo}</h2>
      <span class="pct">${pct}%</span>
    </div>
    <div class="pista" role="progressbar" aria-label="Avance del día" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
      <div class="pista-agua" style="width:calc(${f} * (100% - 96px) + 44px)"></div>
      <div class="tabla" style="left:calc(${f} * (100% - 96px) + 6px)">${tablaSVG()}</div>
      <span class="isla-meta" aria-hidden="true">🏝️</span>
    </div>
    <p class="detalle">${hechas} de ${total} comidas y ${Math.min(agua, vm.min)} de ${vm.min} vasos de agua</p>
  </section>`;
}

function comidaHTML(s, i, toca) {
  const esLaQueToca = toca && toca.s.menu.id === s.menu.id;
  const ahora = esLaQueToca && toca.tipo === 'ahora';
  const sigue = esLaQueToca && toca.tipo === 'sigue';
  const nombre = s.slot.nombre;
  const eleccion = s.libre ? 'Comida libre 🎉' : resumenEleccion(s.menu, s.sel);
  let estado = '';
  if (!s.ok && ahora) estado = '<span class="insignia">Ahora 🌊</span>';
  else if (!s.ok && sigue) estado = `<span class="insignia suave">Sigue, en ${duracion(toca.faltan)}</span>`;
  return `<li class="comida r${i % 5}${s.ok ? ' hecha' : ''}${ahora ? ' ahora' : ''}" id="c-${esc(s.menu.id)}">
    <button type="button" class="comida-cuerpo" data-accion="abrir-comida" data-menu="${esc(s.menu.id)}" data-k="abrir:${esc(s.menu.id)}">
      <span class="comida-emoji" aria-hidden="true">${esc(s.slot.emoji || '🍽️')}</span>
      <span class="comida-txt">
        <span class="comida-nombre">${esc(nombre)}</span>
        <span class="comida-hora">${rango12(s.inicio, s.fin)} ${estado}</span>
        ${s.cambiada ? `<span class="comida-nota">🔁 Hoy con el menú de la ${esc(s.menu.nombre.toLowerCase())}</span>` : ''}
        <span class="comida-eleccion${eleccion ? '' : ' vacia'}">${eleccion ? esc(eleccion) : 'Toca para ver tus opciones'}</span>
      </span>
    </button>
    <button type="button" class="palomita" data-accion="tachar" data-menu="${esc(s.menu.id)}" data-k="tachar:${esc(s.menu.id)}" aria-pressed="${s.ok}" aria-label="${s.ok ? 'Quitar la palomita de' : 'Tachar'} ${esc(s.slot.nombreLargo || nombre)}">
      <span aria-hidden="true">✓</span>
    </button>
  </li>`;
}

function invertirHTML(d) {
  const [a, b] = datos.plan.intercambiables || [];
  const A = datos.plan.comidas.find((m) => m.id === a);
  const B = datos.plan.comidas.find((m) => m.id === b);
  if (!A || !B) return '';
  const par = `${A.nombre.toLowerCase()} y ${B.nombre.toLowerCase()}`;
  return `<div class="invertir">
    <button type="button" class="chip${d.inv ? ' activo' : ''}" data-accion="invertir" data-k="invertir" aria-pressed="${d.inv}">
      🔁 ${d.inv ? `Hoy invertiste ${esc(par)}` : `Invertir ${esc(par)} hoy`}
    </button>
  </div>`;
}

function aguaHTML(d, vm) {
  const m = datos.plan.metas.agua;
  const litros = Number(((d.agua * vm.ml) / 1000).toFixed(2));
  const meta = `${(m.minMl / 1000).toFixed(1)}–${(m.maxMl / 1000).toFixed(1)} L`;
  let vasos = '';
  for (let i = 0; i < vm.max; i++) {
    vasos += `<span class="vaso${i < d.agua ? ' lleno' : ''}${i >= vm.min ? ' extra' : ''}"></span>`;
  }
  if (d.agua > vm.max) vasos += `<span class="vaso-mas">+${d.agua - vm.max}</span>`;
  const estado = d.agua >= vm.min ? '¡Meta cumplida! 💧' : `${d.agua} de ${vm.min} vasos`;
  return `<section class="tarjeta agua">
    <div class="fila">
      <h2>Agua</h2>
      <span class="dato">${estado}</span>
    </div>
    <div class="vasos" aria-hidden="true">${vasos}</div>
    <p class="detalle">Llevas ${litros} L. Meta: ${meta} al día.</p>
    <div class="fila-botones">
      <button type="button" class="btn sec chico" data-accion="agua-menos" data-k="agua-menos" aria-label="Quitar un vaso" ${d.agua ? '' : 'disabled'}>−</button>
      <button type="button" class="btn" data-accion="agua-mas" data-k="agua-mas">+1 vaso (${vm.ml} ml)</button>
    </div>
  </section>`;
}

function actividadHTML(d, sem, hoy) {
  const e = datos.plan.metas.ejercicio;
  const puntos = sem.dias
    .map((f, i) => {
      const hecho = dia(f).ej;
      return `<span class="punto${hecho ? ' hecho' : ''}${f === hoy ? ' hoy' : ''}"><i>${INICIALES[i]}</i></span>`;
    })
    .join('');
  return `<section class="tarjeta actividad">
    <div class="fila">
      <h2>Actividad</h2>
      <span class="dato">${sem.ejercicio} de ${e.diasMin}–${e.diasMax} días</span>
    </div>
    <div class="puntos" aria-hidden="true">${puntos}</div>
    <p class="detalle">Meta: ${e.diasMin} a ${e.diasMax} días por semana, de ${e.minutosMin} a ${e.minutosMax} minutos.</p>
    <button type="button" class="btn${d.ej ? ' logrado' : ''}" data-accion="ejercicio" data-k="ejercicio" aria-pressed="${d.ej}">
      ${d.ej ? '✅ Hoy entrené' : '🏃 Marcar que hoy entrené'}
    </button>
  </section>`;
}

function libreHTML(sem, hoy) {
  const nota = esc(datos.plan.metas.notaComidaLibre || '1 comida libre por semana.');
  if (sem.libre) {
    const menu = datos.plan.comidas.find((m) => m.id === sem.libre.menuId);
    const cuando = sem.libre.fecha === hoy ? 'hoy' : `el ${nombreDia(sem.libre.fecha)}`;
    return `<section class="tarjeta libre">
      <div class="fila">
        <h2>Comida libre</h2>
        <span class="dato">Usada ${esc(cuando)}</span>
      </div>
      <p class="detalle">La usaste en tu ${esc((menu?.nombreLargo || menu?.nombre || 'comida').toLowerCase())}. El lunes tienes otra. 🎉</p>
      <button type="button" class="enlace" data-accion="libre-deshacer" data-k="libre-deshacer">Me equivoqué, deshacer</button>
    </section>`;
  }
  return `<section class="tarjeta libre">
    <div class="fila">
      <h2>Comida libre</h2>
      <span class="dato">Disponible 🎉</span>
    </div>
    <p class="detalle">${nota} Se reinicia cada lunes.</p>
    <button type="button" class="btn sec" data-accion="libre-usar" data-k="libre-usar">Usar mi comida libre</button>
  </section>`;
}

/* ---------- Acciones ---------- */

/** Tacha (o destacha) una comida de hoy, con la ola que pasa por la tarjeta y el festejo si se completa el día. */
export function tacharHoy(menuId, valor) {
  const hoy = claveFecha();
  const lista = slots(hoy);
  const s = lista.find((x) => x.menu.id === menuId);
  if (!s) return;
  const nuevo = valor ?? !s.ok;
  if (nuevo === s.ok) return;
  const completa = nuevo && lista.filter((x) => !x.ok).length === 1;
  if (nuevo) ui.efectos.push({ tipo: 'lavado', id: `c-${menuId}` });
  if (completa) ui.efectos.push({ tipo: 'confeti' });
  tachar(hoy, menuId, nuevo);
  if (completa) aviso('¡Día completo! La fogata crece 🔥', 3600);
  else if (nuevo) aviso('¡Tachada! 🌊', 1600);
}

accion('tachar', (el) => tacharHoy(el.dataset.menu));
accion('abrir-comida', (el) => abrirHoja('comida', { menuId: el.dataset.menu }));

accion('invertir', () => {
  const hoy = claveFecha();
  invertir(hoy);
  aviso(dia(hoy).inv ? '🔁 Listo: hoy van invertidas' : 'De vuelta al orden normal');
});

accion('agua-mas', () => {
  const hoy = claveFecha();
  const { min } = vasosMeta();
  const antes = dia(hoy).agua;
  sumarAgua(hoy, 1);
  if (antes + 1 === min) aviso('¡Meta de agua cumplida! 💧');
});

accion('agua-menos', () => sumarAgua(claveFecha(), -1));

accion('ejercicio', () => {
  const hoy = claveFecha();
  alternarEjercicio(hoy);
  if (dia(hoy).ej) aviso('¡Entrenamiento anotado! 💪');
});

accion('libre-usar', () => abrirHoja('libre'));

accion('libre-deshacer', () => {
  const sem = semana(claveFecha());
  if (!sem.libre) return;
  deshacerLibre(sem.libre);
  aviso('Listo, tu comida libre vuelve a estar disponible');
});
