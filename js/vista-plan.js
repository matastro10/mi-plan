// Pantalla "Mi plan": todo el plan para consultarlo (opciones, equivalencias, libres, medidas, comer fuera).

import { datos } from './datos.js';
import { estado } from './store.js';
import { esc, rango12, fechaCompleta } from './util.js';
import { ui } from './ui.js';

const abierto = (id) => (ui.abiertos.has(id) ? 'open' : '');

function grupoHTML(g) {
  const ayuda = g.elige === 'varias' ? 'las que quieras' : g.opcional ? 'opcional' : `elige ${g.elige || 1}`;
  const ops = g.opciones
    .map(
      (o) => `<li>
        <strong>${esc(o.nombre)}</strong>
        ${o.detalle ? `<span>${esc(o.detalle)}</span>` : ''}
        ${o.nota ? `<em>${esc(o.nota)}</em>` : ''}
        ${o.limiteSemanal ? `<em>Máximo ${o.limiteSemanal} veces por semana.</em>` : ''}
      </li>`,
    )
    .join('');
  return `<div class="plan-grupo">
    <h3>${esc(g.titulo)} <small>${ayuda}</small></h3>
    <ul class="plan-ops">${ops}</ul>
    ${g.equivalencias ? '<p class="detalle">Puedes cambiarla por cualquier fruta de las equivalencias.</p>' : ''}
  </div>`;
}

function comidaHTML(c) {
  const id = `plan-${c.id}`;
  const notas = (c.notas || []).map((n) => `<li>${esc(n)}</li>`).join('');
  return `<details class="tarjeta plegable" id="${esc(id)}" ${abierto(id)}>
    <summary>
      <span class="plegable-emoji" aria-hidden="true">${esc(c.emoji || '🍽️')}</span>
      <span class="plegable-txt"><span class="plegable-titulo">${esc(c.nombreLargo || c.nombre)}</span><span class="plegable-sub">${rango12(c.inicio, c.fin)}</span></span>
    </summary>
    <div class="plegable-cuerpo">
      ${c.instruccion ? `<p class="instruccion">${esc(c.instruccion)}</p>` : ''}
      ${notas ? `<ul class="notas">${notas}</ul>` : ''}
      ${c.grupos.map(grupoHTML).join('')}
    </div>
  </details>`;
}

function seccion(id, emoji, titulo, cuerpo) {
  return `<details class="tarjeta plegable" id="${id}" ${abierto(id)}>
    <summary>
      <span class="plegable-emoji" aria-hidden="true">${emoji}</span>
      <span class="plegable-txt"><span class="plegable-titulo">${titulo}</span></span>
    </summary>
    <div class="plegable-cuerpo">${cuerpo}</div>
  </details>`;
}

const items = (lista) => `<ul class="lista-plan">${(lista || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

export function vistaPlan() {
  const p = datos.plan;
  const a = estado.ajustes;
  const libres = p.libres || {};
  const m = p.metas;
  const quien = [a.nombre ? `Plan de ${esc(a.nombre)}` : '', a.nutriologa ? `Nutrióloga: ${esc(a.nutriologa)}` : ''].filter(Boolean);

  const metas = `<ul class="lista-plan">
      <li>Agua: ${(m.agua.minMl / 1000).toFixed(1)} a ${(m.agua.maxMl / 1000).toFixed(1)} litros al día.</li>
      <li>Ejercicio: ${m.ejercicio.diasMin} a ${m.ejercicio.diasMax} días por semana, de ${m.ejercicio.minutosMin} a ${m.ejercicio.minutosMax} minutos.</li>
      <li>${esc(m.notaComidaLibre || '1 comida libre por semana.')}</li>
    </ul>`;

  const libresHTML = `
      ${libres.nota ? `<p class="instruccion">${esc(libres.nota)}</p>` : ''}
      <h3>Bebidas</h3>${items(libres.bebidas)}
      <h3>Alimentos</h3>${items(libres.alimentos)}
      <h3>Para dar sabor</h3>${items(libres.sazon)}`;

  const equiv = `<p class="instruccion">Cualquiera vale por otra:</p>
      <ul class="chips-lista">${(p.equivalenciasFruta || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`;

  const medidas = `<ul class="medidas">${(p.medidas || []).map((x) => `<li><strong>${esc(x.medida)}</strong><span>${esc(x.equivale)}</span></li>`).join('')}</ul>`;

  return `
    ${quien.length ? `<p class="quien">${quien.join('<br>')}</p>` : ''}
    ${p.comidas.map(comidaHTML).join('')}
    ${seccion('plan-libres', '🥒', 'Alimentos y bebidas libres', libresHTML)}
    ${seccion('plan-equiv', '🍓', 'Equivalencias de fruta', equiv)}
    ${seccion('plan-medidas', '🥄', 'Medidas', medidas)}
    ${seccion('plan-fuera', '🍴', 'Al comer fuera', items(p.comerFuera))}
    ${seccion('plan-metas', '🎯', 'Metas', metas)}
    <p class="pie-nota">Plan actualizado el ${esc(fechaCompleta(p.actualizado))}. Para cambiarlo se edita el archivo data/plan.json.</p>
  `;
}
