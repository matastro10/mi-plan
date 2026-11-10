// Pantalla "Historial": la fogata de la racha, el calendario del mes y el resumen de la semana.

import { datos } from './datos.js';
import { estado, emitir, estadoDia, hechas, racha, semana, vasosMeta, topesSemanales } from './store.js';
import { esc, claveFecha, sumarDias, lunesDe, nombreMes, nombreDia, diaMes, INICIALES } from './util.js';
import { fogataSVG } from './escena.js';
import { accion } from './acciones.js';
import { ui } from './ui.js';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function nivelFogata(dias) {
  if (dias <= 0) return 0;
  if (dias <= 2) return 1;
  if (dias <= 4) return 2;
  if (dias <= 6) return 3;
  if (dias <= 13) return 4;
  return 5;
}

function rachaHTML() {
  const r = racha();
  const hoyCompleto = estadoDia(claveFecha()) === 'completo';
  const total = datos.plan.comidas.length;
  let titulo = `Racha de ${plural(r.actual, 'día', 'días')} 🔥`;
  let mensaje = hoyCompleto ? 'Hoy ya sumaste. Mañana le echas otro leño.' : 'Completa hoy para que siga creciendo.';
  if (r.actual === 0) {
    titulo = 'Fogata lista para prender';
    mensaje =
      r.mejor > 0
        ? 'Un día no borra lo que ya hiciste. Hoy la vuelves a prender.'
        : `Tacha tus ${total} comidas de hoy y se prende la fogata.`;
  }
  return `<section class="tarjeta racha">
    <div class="racha-fogata">${fogataSVG(nivelFogata(r.actual))}</div>
    <div class="racha-txt">
      <h2>${titulo}</h2>
      <p>${mensaje}</p>
      <p class="detalle">Tu mejor racha: ${plural(r.mejor, 'día', 'días')}.</p>
    </div>
  </section>`;
}

function calendarioHTML() {
  const hoy = claveFecha();
  const mes = ui.mes || hoy.slice(0, 7);
  const [anio, m] = mes.split('-').map(Number);
  const diasDelMes = new Date(anio, m, 0).getDate();
  const hueco = (new Date(anio, m - 1, 1).getDay() + 6) % 7;
  const total = datos.plan.comidas.length;

  let celdas = '<span class="cal-hueco"></span>'.repeat(hueco);
  for (let d = 1; d <= diasDelMes; d++) {
    const f = `${anio}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (f > hoy) {
      celdas += `<span class="cal-dia futuro" aria-hidden="true">${d}</span>`;
      continue;
    }
    let clase = estadoDia(f);
    let voz = clase === 'completo' ? 'todo tachado' : clase === 'parcial' ? `${hechas(f)} de ${total} comidas` : 'nada tachado';
    if (clase === 'nada' && f < estado.creado) {
      clase = 'previo';
      voz = 'antes de empezar';
    }
    celdas += `<button type="button" class="cal-dia ${clase}${f === hoy ? ' hoy' : ''}" data-accion="ver-dia" data-fecha="${f}" aria-label="${d}: ${voz}${f === hoy ? ' (hoy)' : ''}">${d}</button>`;
  }

  return `<section class="tarjeta calendario">
    <div class="cal-cab">
      <button type="button" class="btn-ico" data-accion="mes" data-delta="-1" data-k="mes-ant" aria-label="Mes anterior">‹</button>
      <h2>${esc(nombreMes(anio, m - 1))}</h2>
      <button type="button" class="btn-ico" data-accion="mes" data-delta="1" data-k="mes-sig" aria-label="Mes siguiente" ${mes >= hoy.slice(0, 7) ? 'disabled' : ''}>›</button>
    </div>
    <div class="cal-semana" aria-hidden="true">${INICIALES.map((x) => `<span>${x}</span>`).join('')}</div>
    <div class="cal-rejilla">${celdas}</div>
    <ul class="cal-leyenda">
      <li><i class="completo"></i>Todo tachado</li>
      <li><i class="parcial"></i>Parcial</li>
      <li><i class="nada"></i>Nada</li>
    </ul>
  </section>`;
}

const fila = (emoji, nombre, valor, extra = '') =>
  `<li><span class="res-emoji" aria-hidden="true">${emoji}</span><span class="res-nombre">${nombre}${extra ? `<small>${extra}</small>` : ''}</span><strong>${valor}</strong></li>`;

function semanaHTML() {
  const hoy = claveFecha();
  const lunesHoy = lunesDe(hoy);
  const lunes = ui.semana || lunesHoy;
  const s = semana(lunes);
  const vm = vasosMeta();
  const e = datos.plan.metas.ejercicio;
  const actual = lunes === lunesHoy;
  const litros = Number(((s.vasos * vm.ml) / 1000).toFixed(2));

  let libre = actual ? 'Disponible' : 'No la usaste';
  if (s.libre) libre = `Usada el ${nombreDia(s.libre.fecha)}`;

  const topes = topesSemanales()
    .map((t) => {
      const nombre = t.nombre.replace(/^\d+\s+/, '');
      return fila('🍪', esc(nombre.charAt(0).toUpperCase() + nombre.slice(1)), `${s.usos[t.clave] || 0} de ${t.tope}`, `Máximo ${t.tope} por semana`);
    })
    .join('');

  const aviso =
    s.hambre >= 4
      ? '<p class="nota-calma">Usaste el botón de hambre varias veces esta semana. Coméntaselo a tu nutrióloga en la próxima cita: quizá hay que ajustar el plan.</p>'
      : '';

  return `<section class="tarjeta resumen">
    <div class="cal-cab">
      <button type="button" class="btn-ico" data-accion="semana" data-delta="-1" data-k="sem-ant" aria-label="Semana anterior">‹</button>
      <h2>${actual ? 'Esta semana' : `Semana del ${esc(diaMes(lunes))}`}</h2>
      <button type="button" class="btn-ico" data-accion="semana" data-delta="1" data-k="sem-sig" aria-label="Semana siguiente" ${actual ? 'disabled' : ''}>›</button>
    </div>
    <ul class="res-lista">
      ${fila('🍽️', 'Comidas tachadas', `${s.comidas} de ${s.posibles}`, plural(s.completos, 'día completo', 'días completos'))}
      ${fila('💧', 'Agua', `${litros} L`, `Meta cumplida ${plural(s.diasAgua, 'día', 'días')}`)}
      ${fila('🏃', 'Ejercicio', `${plural(s.ejercicio, 'día', 'días')}`, `Meta: ${e.diasMin} a ${e.diasMax} días`)}
      ${topes}
      ${fila('🛟', 'Botón de hambre', plural(s.hambre, 'vez', 'veces'))}
      ${fila('🎉', 'Comida libre', esc(libre))}
    </ul>
    ${aviso}
  </section>`;
}

export function vistaHistorial() {
  return rachaHTML() + calendarioHTML() + semanaHTML();
}

accion('mes', (el) => {
  const hoy = claveFecha();
  const [a, m] = (ui.mes || hoy.slice(0, 7)).split('-').map(Number);
  const d = new Date(a, m - 1 + Number(el.dataset.delta), 1);
  const nuevo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (nuevo > hoy.slice(0, 7)) return;
  ui.mes = nuevo;
  emitir();
});

accion('semana', (el) => {
  const lunesHoy = lunesDe(claveFecha());
  const nuevo = sumarDias(ui.semana || lunesHoy, 7 * Number(el.dataset.delta));
  if (nuevo > lunesHoy) return;
  ui.semana = nuevo;
  emitir();
});
