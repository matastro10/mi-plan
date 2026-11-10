// Hojas de: opciones de una comida, usar la comida libre y detalle de un día del calendario.

import { datos } from './datos.js';
import {
  dia,
  slots,
  semana,
  vasosMeta,
  elegir,
  tachar,
  usarLibre,
  sumarAgua,
  alternarEjercicio,
  gruposOmitidos,
  resumenEleccion,
} from './store.js';
import { esc, claveFecha, rango12, fechaLarga } from './util.js';
import { accion } from './acciones.js';
import { aviso } from './avisos.js';
import { definirHoja, cerrarHoja, abrirHoja } from './hojas.js';
import { ui } from './ui.js';
import { tacharHoy } from './vista-hoy.js';

/* ---------- Opciones de una comida (de hoy) ---------- */

function ayudaElige(g) {
  if (g.elige === 'varias') return 'las que quieras';
  return g.opcional ? 'opcional' : `elige ${g.elige || 1}`;
}

function opcionHTML(menu, g, o, elegidas, sem) {
  const puesta = elegidas.includes(o.id);
  let tope = '';
  let bloqueada = false;
  if (o.limiteSemanal) {
    const usados = sem.usos[`${menu.id}:${o.id}`] || 0;
    bloqueada = !puesta && usados >= o.limiteSemanal;
    tope = `<span class="op-tope">${bloqueada ? `Ya van ${usados} de ${o.limiteSemanal} esta semana. Vuelve el lunes.` : `Máximo ${o.limiteSemanal} por semana. Llevas ${usados}.`}</span>`;
  }
  const varias = g.elige === 'varias';
  return `<button type="button" class="opcion${puesta ? ' elegida' : ''}${varias ? ' varias' : ''}" data-accion="elegir"
      data-menu="${esc(menu.id)}" data-grupo="${esc(g.id)}" data-op="${esc(o.id)}" data-k="op:${esc(menu.id)}:${esc(g.id)}:${esc(o.id)}"
      aria-pressed="${puesta}" ${bloqueada ? 'disabled' : ''}>
    <span class="op-marca" aria-hidden="true"></span>
    <span class="op-txt">
      <span class="op-nombre">${esc(o.nombre)}</span>
      ${o.detalle ? `<span class="op-detalle">${esc(o.detalle)}</span>` : ''}
      ${o.nota ? `<span class="op-nota">${esc(o.nota)}</span>` : ''}
      ${tope}
    </span>
  </button>`;
}

function equivalenciasHTML(menu, g, elegidas, sem) {
  const yaEstan = new Set(g.opciones.map((o) => o.nombre));
  const otras = (datos.plan.equivalenciasFruta || []).filter((n) => !yaEstan.has(n));
  if (!otras.length) return '';
  const id = `eq-${menu.id}-${g.id}`;
  const abierta = ui.abiertos.has(id) || elegidas.some((x) => x.startsWith('eq:'));
  return `<details class="equiv" id="${esc(id)}" ${abierta ? 'open' : ''}>
    <summary>Otras frutas que valen lo mismo</summary>
    <div class="opciones">${otras.map((n) => opcionHTML(menu, g, { id: `eq:${n}`, nombre: n }, elegidas, sem)).join('')}</div>
  </details>`;
}

definirHoja('comida', ({ menuId }) => {
  const hoy = claveFecha();
  const s = slots(hoy).find((x) => x.menu.id === menuId);
  if (!s) return null;
  const { menu, slot } = s;
  const sem = semana(hoy);
  const fuera = gruposOmitidos(menu, s.sel);

  const grupos = menu.grupos
    .map((g) => {
      if (fuera.has(g.id)) {
        return `<div class="grupo fuera"><h3>${esc(g.titulo)}</h3><p class="op-nota">No va con el platillo que elegiste.</p></div>`;
      }
      const elegidas = s.sel[g.id] || [];
      return `<div class="grupo">
        <h3>${esc(g.titulo)} <small>${ayudaElige(g)}</small></h3>
        <div class="opciones">${g.opciones.map((o) => opcionHTML(menu, g, o, elegidas, sem)).join('')}</div>
        ${g.equivalencias ? equivalenciasHTML(menu, g, elegidas, sem) : ''}
      </div>`;
    })
    .join('');

  const notas = (menu.notas || []).map((n) => `<li>${esc(n)}</li>`).join('');
  const cuerpo = `
    <p class="hoja-hora">${rango12(slot.inicio, slot.fin)}</p>
    ${s.cambiada ? `<p class="banda">🔁 Hoy con el menú de la ${esc(menu.nombre.toLowerCase())}.</p>` : ''}
    ${s.libre ? '<p class="banda">Hoy esta es tu comida libre 🎉 Disfrútala.</p>' : ''}
    ${menu.instruccion ? `<p class="instruccion">${esc(menu.instruccion)}</p>` : ''}
    ${notas ? `<ul class="notas">${notas}</ul>` : ''}
    ${grupos}`;

  const pie = s.ok
    ? `<button type="button" class="btn sec" data-accion="comida-quitar" data-menu="${esc(menu.id)}">Quitar la palomita</button>
       <button type="button" class="btn" data-accion="cerrar-hoja">Cerrar</button>`
    : `<button type="button" class="btn" data-accion="comida-lista" data-menu="${esc(menu.id)}">✅ Listo, ya me la comí</button>`;

  return { titulo: `${esc(slot.emoji || '')} ${esc(slot.nombreLargo || slot.nombre)}`, cuerpo, pie };
});

accion('elegir', (el) => elegir(claveFecha(), el.dataset.menu, el.dataset.grupo, el.dataset.op));

accion('comida-lista', (el) => {
  cerrarHoja();
  tacharHoy(el.dataset.menu, true);
});

accion('comida-quitar', (el) => {
  tacharHoy(el.dataset.menu, false);
});

/* ---------- Usar la comida libre ---------- */

definirHoja('libre', () => {
  const hoy = claveFecha();
  const sem = semana(hoy);
  if (sem.libre) return null;
  const pendientes = slots(hoy).filter((s) => !s.ok);
  const e = datos.plan.metas.ejercicio;
  const resumen = `<p class="instruccion">Esta semana llevas ${sem.comidas} de ${sem.posibles} comidas tachadas y ${sem.ejercicio} ${sem.ejercicio === 1 ? 'día' : 'días'} de ejercicio (meta: ${e.diasMin} a ${e.diasMax}).</p>`;
  if (!pendientes.length) {
    return {
      titulo: '🎉 Comida libre',
      cuerpo: `${resumen}<p>Hoy ya tachaste todas tus comidas. Guárdala para otro día de esta semana. 😎</p>`,
      pie: '<button type="button" class="btn" data-accion="cerrar-hoja">Va</button>',
    };
  }
  const botones = pendientes
    .map(
      (s) => `<button type="button" class="opcion" data-accion="libre-elegir" data-menu="${esc(s.menu.id)}">
        <span class="op-emoji" aria-hidden="true">${esc(s.slot.emoji || '🍽️')}</span>
        <span class="op-txt"><span class="op-nombre">${esc(s.slot.nombreLargo || s.slot.nombre)}</span><span class="op-detalle">${rango12(s.inicio, s.fin)}</span></span>
      </button>`,
    )
    .join('');
  return {
    titulo: '🎉 Comida libre',
    cuerpo: `<p>${esc(datos.plan.metas.notaComidaLibre || '')}</p>${resumen}<h3>¿En cuál comida de hoy la usas?</h3><div class="opciones">${botones}</div>`,
    pie: '<button type="button" class="btn sec" data-accion="cerrar-hoja">Mejor la guardo</button>',
  };
});

accion('libre-elegir', (el) => {
  cerrarHoja();
  usarLibre(claveFecha(), el.dataset.menu);
  aviso('¡Disfrútala! 🎉 Es parte del plan.', 3400);
});

/* ---------- Detalle de un día (desde el calendario) ---------- */

definirHoja('dia', ({ fecha }) => {
  const hoy = claveFecha();
  if (fecha > hoy) return null;
  const d = dia(fecha);
  const vm = vasosMeta();
  const filas = slots(fecha)
    .map((s) => {
      const eleccion = s.libre ? 'Comida libre 🎉' : resumenEleccion(s.menu, s.sel);
      return `<li class="dia-fila${s.ok ? ' hecha' : ''}">
        <span class="dia-txt"><strong>${esc(s.slot.emoji || '')} ${esc(s.slot.nombreLargo || s.slot.nombre)}</strong>${eleccion ? `<span>${esc(eleccion)}</span>` : ''}</span>
        <button type="button" class="palomita chica" data-accion="dia-tachar" data-fecha="${esc(fecha)}" data-menu="${esc(s.menu.id)}" data-k="dia:${esc(s.menu.id)}"
          aria-pressed="${s.ok}" aria-label="${s.ok ? 'Quitar la palomita de' : 'Tachar'} ${esc(s.slot.nombreLargo || s.slot.nombre)}"><span aria-hidden="true">✓</span></button>
      </li>`;
    })
    .join('');
  const cuerpo = `
    ${fecha === hoy ? '' : '<p class="instruccion">¿Se te olvidó tachar algo ese día? Aquí lo corriges.</p>'}
    <ul class="dia-lista">${filas}</ul>
    <div class="dia-extra">
      <div class="dia-agua">
        <span>💧 ${d.agua} de ${vm.min} vasos</span>
        <span class="fila-mini">
          <button type="button" class="btn sec chico" data-accion="dia-agua" data-fecha="${esc(fecha)}" data-delta="-1" data-k="dia-agua-menos" aria-label="Quitar un vaso" ${d.agua ? '' : 'disabled'}>−</button>
          <button type="button" class="btn sec chico" data-accion="dia-agua" data-fecha="${esc(fecha)}" data-delta="1" data-k="dia-agua-mas" aria-label="Sumar un vaso">+</button>
        </span>
      </div>
      <button type="button" class="chip${d.ej ? ' activo' : ''}" data-accion="dia-ej" data-fecha="${esc(fecha)}" data-k="dia-ej" aria-pressed="${d.ej}">🏃 ${d.ej ? 'Ese día entrené' : 'Marcar que entrené'}</button>
      ${d.hambre ? `<p class="detalle">Botón de hambre: ${d.hambre} ${d.hambre === 1 ? 'vez' : 'veces'}.</p>` : ''}
    </div>`;
  return {
    titulo: esc(fechaLarga(fecha)),
    cuerpo,
    pie: '<button type="button" class="btn" data-accion="cerrar-hoja">Listo</button>',
  };
});

accion('ver-dia', (el) => abrirHoja('dia', { fecha: el.dataset.fecha }));
accion('dia-tachar', (el) => tachar(el.dataset.fecha, el.dataset.menu));
accion('dia-agua', (el) => sumarAgua(el.dataset.fecha, Number(el.dataset.delta) || 0));
accion('dia-ej', (el) => alternarEjercicio(el.dataset.fecha));
