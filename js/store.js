// El almacén: todo lo que la app recuerda (guardado en el teléfono con localStorage)
// y las cuentas que salen de ahí (progreso, racha, resumen semanal...).

import { datos } from './datos.js';
import { claveFecha, sumarDias, semanaDe, aMin, minAhora, semilla, azar } from './util.js';

const CLAVE = 'miplan:v1';
const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const nuevo = () => ({
  v: 1,
  creado: claveFecha(),
  dias: {},
  ajustes: { nombre: '', nutriologa: '', tema: 'auto' },
  frases: { quitadas: [], agregadas: [], favoritas: [] },
  push: {},
  temp: {},
});

const textos = (x) => (Array.isArray(x) ? x.filter((t) => typeof t === 'string').map((t) => t.slice(0, 200)) : []);
const texto = (x, max = 60) => (typeof x === 'string' ? x.slice(0, max) : '');

/** Deja el estado con la forma correcta aunque venga incompleto (o de un respaldo viejo). */
function normalizar(crudo) {
  const base = nuevo();
  if (!crudo || crudo.v !== 1 || !crudo.dias || typeof crudo.dias !== 'object') return base;
  const dias = {};
  for (const [k, v] of Object.entries(crudo.dias)) {
    if (ES_FECHA.test(k) && v && typeof v === 'object') dias[k] = v;
  }
  const aj = crudo.ajustes || {};
  return {
    ...base,
    creado: ES_FECHA.test(crudo.creado) ? crudo.creado : base.creado,
    dias,
    ajustes: {
      nombre: texto(aj.nombre),
      nutriologa: texto(aj.nutriologa),
      tema: ['auto', 'dia', 'noche'].includes(aj.tema) ? aj.tema : 'auto',
    },
    frases: {
      quitadas: textos(crudo.frases?.quitadas),
      agregadas: textos(crudo.frases?.agregadas),
      favoritas: textos(crudo.frases?.favoritas),
    },
    push: crudo.push && typeof crudo.push === 'object' ? crudo.push : {},
    temp: crudo.temp && typeof crudo.temp === 'object' ? crudo.temp : {},
  };
}

function leer() {
  try {
    return normalizar(JSON.parse(localStorage.getItem(CLAVE) || 'null'));
  } catch {
    return nuevo();
  }
}

export let estado = leer();

const oyentes = new Set();
export const alCambiar = (fn) => {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
};

/** Avisa a la pantalla que hay que volver a pintar (sin guardar). */
export function emitir() {
  oyentes.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
}

/** Guarda en el teléfono. Con pintar = false no se redibuja la pantalla (para no interrumpir lo que se escribe). */
export function guardar(pintar = true) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (e) {
    console.warn('No se pudo guardar en el teléfono', e);
  }
  if (pintar) emitir();
}

/* ---------- Días ---------- */

/** El día tal como está guardado, con valores seguros si falta algo. */
export function dia(fecha = claveFecha()) {
  const d = estado.dias[fecha] || {};
  return {
    c: d.c && typeof d.c === 'object' ? d.c : {},
    agua: Math.max(0, Math.min(40, Math.round(Number(d.agua) || 0))),
    ej: d.ej === true,
    inv: d.inv === true,
    hambre: Math.max(0, Math.round(Number(d.hambre) || 0)),
  };
}

function editarDia(fecha, fn) {
  const d = estado.dias[fecha] || (estado.dias[fecha] = {});
  if (!d.c || typeof d.c !== 'object') d.c = {};
  fn(d);
  guardar();
}

const limpiarSel = (sel) => {
  const limpio = {};
  if (sel && typeof sel === 'object') {
    for (const [g, ids] of Object.entries(sel)) {
      if (Array.isArray(ids)) limpio[g] = ids.filter((x) => typeof x === 'string');
    }
  }
  return limpio;
};

/**
 * Las comidas del día en orden. Cada "slot" es un horario (desayuno, colación...).
 * Si ese día se invirtieron comida y cena, el slot conserva su horario pero usa el menú de la otra.
 * Lo tachado y lo elegido se guardan por menú.
 */
export function slots(fecha = claveFecha()) {
  const d = dia(fecha);
  const plan = datos.plan;
  const [a, b] = plan.intercambiables || [];
  return plan.comidas.map((slot) => {
    let menuId = slot.id;
    if (d.inv && a && b) {
      if (slot.id === a) menuId = b;
      else if (slot.id === b) menuId = a;
    }
    const menu = plan.comidas.find((m) => m.id === menuId) || slot;
    const reg = d.c[menu.id] || {};
    return {
      slot,
      menu,
      inicio: slot.inicio,
      fin: slot.fin,
      ok: reg.ok === true,
      sel: limpiarSel(reg.sel),
      libre: reg.libre === true && reg.ok === true,
      cambiada: menu.id !== slot.id,
    };
  });
}

/** Qué comida toca: la que está en su horario y sin tachar, o si no, la siguiente pendiente. */
export function queToca(lista, ahora = minAhora()) {
  const pendientes = lista.filter((s) => !s.ok);
  const enHorario = pendientes.find((s) => ahora >= aMin(s.inicio) && ahora < aMin(s.fin));
  if (enHorario) return { tipo: 'ahora', s: enHorario, faltan: 0 };
  const siguiente = pendientes.find((s) => aMin(s.inicio) > ahora);
  if (siguiente) return { tipo: 'sigue', s: siguiente, faltan: aMin(siguiente.inicio) - ahora };
  return null;
}

/** Comidas cuyo horario ya pasó y siguen sin tachar. */
export const atrasadas = (lista, ahora = minAhora()) => lista.filter((s) => !s.ok && ahora >= aMin(s.fin));

export function tachar(fecha, menuId, valor) {
  editarDia(fecha, (d) => {
    const r = d.c[menuId] || (d.c[menuId] = {});
    r.ok = valor ?? !r.ok;
    if (r.ok) r.t = Date.now();
    else {
      delete r.t;
      delete r.libre;
    }
  });
}

/** Busca una opción dentro de un grupo. Las frutas equivalentes usan el id "eq:<nombre>". */
export function opcionDe(grupo, id) {
  const o = grupo.opciones.find((x) => x.id === id);
  if (o) return o;
  if (typeof id === 'string' && id.startsWith('eq:')) return { id, nombre: id.slice(3) };
  return null;
}

export function elegir(fecha, menuId, grupoId, opcionId) {
  const menu = datos.plan.comidas.find((m) => m.id === menuId);
  const grupo = menu?.grupos.find((g) => g.id === grupoId);
  if (!grupo) return;
  editarDia(fecha, (d) => {
    const r = d.c[menuId] || (d.c[menuId] = {});
    const sel = (r.sel = limpiarSel(r.sel));
    const actual = sel[grupoId] || [];
    if (grupo.elige === 'varias') {
      sel[grupoId] = actual.includes(opcionId) ? actual.filter((x) => x !== opcionId) : [...actual, opcionId];
    } else {
      sel[grupoId] = actual[0] === opcionId ? [] : [opcionId];
    }
    const quedo = sel[grupoId].includes(opcionId);
    if (!sel[grupoId].length) delete sel[grupoId];
    // Si esta opción deja fuera a otros grupos (ej. hotcakes ya lleva fruta), se limpia lo elegido ahí.
    if (quedo) for (const g of opcionDe(grupo, opcionId)?.omiteGrupos || []) delete sel[g];
  });
}

export function gruposOmitidos(menu, sel) {
  const fuera = new Set();
  for (const g of menu.grupos) {
    for (const id of sel[g.id] || []) {
      for (const x of opcionDe(g, id)?.omiteGrupos || []) fuera.add(x);
    }
  }
  return fuera;
}

/** Texto corto con lo que se eligió: "Pechuga de pollo + ½ taza de arroz + ..." */
export function resumenEleccion(menu, sel) {
  const partes = [];
  for (const g of menu.grupos) {
    for (const id of sel[g.id] || []) {
      const o = opcionDe(g, id);
      if (o) partes.push(o.nombre);
    }
  }
  return partes.join(' + ');
}

export const sumarAgua = (fecha, delta) =>
  editarDia(fecha, (d) => {
    d.agua = Math.max(0, Math.min(40, Math.round(Number(d.agua) || 0) + delta));
  });

export const alternarEjercicio = (fecha) =>
  editarDia(fecha, (d) => {
    d.ej = d.ej !== true;
  });

export const invertir = (fecha) =>
  editarDia(fecha, (d) => {
    d.inv = d.inv !== true;
  });

/* ---------- Cuentas del día ---------- */

export const hechas = (fecha) => slots(fecha).filter((s) => s.ok).length;

/** 'completo' (todo tachado), 'parcial' o 'nada' */
export function estadoDia(fecha) {
  const n = hechas(fecha);
  if (n === 0) return 'nada';
  return n >= datos.plan.comidas.length ? 'completo' : 'parcial';
}

export function vasosMeta() {
  const m = datos.plan.metas.agua;
  return { min: Math.round(m.minMl / m.vasoMl), max: Math.round(m.maxMl / m.vasoMl), ml: m.vasoMl };
}

/** Avance del día de 0 a 1: las comidas tachadas más el agua (hasta la meta mínima). */
export function progreso(fecha = claveFecha()) {
  const total = datos.plan.comidas.length;
  const { min } = vasosMeta();
  return (hechas(fecha) + Math.min(dia(fecha).agua / min, 1)) / (total + 1);
}

/* ---------- Semana (de lunes a domingo) ---------- */

export function semana(fecha = claveFecha()) {
  const dias = semanaDe(fecha);
  const hoy = claveFecha();
  const { min } = vasosMeta();
  const total = datos.plan.comidas.length;
  const r = {
    lunes: dias[0],
    dias,
    comidas: 0,
    posibles: 0,
    completos: 0,
    vasos: 0,
    diasAgua: 0,
    ejercicio: 0,
    hambre: 0,
    libre: null,
    usos: {},
  };
  for (const f of dias) {
    if (f > hoy) continue;
    const d = dia(f);
    const n = hechas(f);
    r.posibles += total;
    r.comidas += n;
    if (n >= total) r.completos++;
    r.vasos += d.agua;
    if (d.agua >= min) r.diasAgua++;
    if (d.ej) r.ejercicio++;
    r.hambre += d.hambre;
    for (const [menuId, reg] of Object.entries(d.c)) {
      if (!reg || typeof reg !== 'object') continue;
      if (reg.libre === true && reg.ok === true) r.libre = { fecha: f, menuId };
      for (const ids of Object.values(limpiarSel(reg.sel))) {
        for (const id of ids) r.usos[`${menuId}:${id}`] = (r.usos[`${menuId}:${id}`] || 0) + 1;
      }
    }
  }
  return r;
}

/** Opciones del plan que tienen tope semanal (ej. el alfajor). */
export function topesSemanales() {
  const lista = [];
  for (const menu of datos.plan.comidas) {
    for (const g of menu.grupos) {
      for (const o of g.opciones) if (o.limiteSemanal) lista.push({ clave: `${menu.id}:${o.id}`, nombre: o.nombre, tope: o.limiteSemanal });
    }
  }
  return lista;
}

/** Racha de días seguidos con todo tachado. Hoy cuenta si ya está completo; si no, no la rompe. */
export function racha() {
  const hoy = claveFecha();
  let actual = 0;
  let f = estadoDia(hoy) === 'completo' ? hoy : sumarDias(hoy, -1);
  while (estado.dias[f] && estadoDia(f) === 'completo') {
    actual++;
    f = sumarDias(f, -1);
  }
  let mejor = 0;
  let corrida = 0;
  let previa = null;
  for (const k of Object.keys(estado.dias).sort()) {
    if (estadoDia(k) === 'completo') {
      corrida = previa && sumarDias(previa, 1) === k ? corrida + 1 : 1;
      mejor = Math.max(mejor, corrida);
      previa = k;
    } else {
      corrida = 0;
      previa = null;
    }
  }
  return { actual, mejor: Math.max(mejor, actual) };
}

/* ---------- Comida libre ---------- */

export const usarLibre = (fecha, menuId) =>
  editarDia(fecha, (d) => {
    const r = d.c[menuId] || (d.c[menuId] = {});
    r.ok = true;
    r.libre = true;
    r.t = Date.now();
  });

export const deshacerLibre = (info) =>
  editarDia(info.fecha, (d) => {
    const r = d.c[info.menuId];
    if (!r) return;
    delete r.libre;
    delete r.t;
    r.ok = false;
  });

/* ---------- Botón de hambre ---------- */

/** Suma un uso del botón. Si se vuelve a abrir en menos de 30 min cuenta como el mismo momento. */
export function registrarHambre(fecha = claveFecha()) {
  const ahora = Date.now();
  if (ahora - (Number(estado.temp.hambreUlt) || 0) < 30 * 60000) return false;
  estado.temp.hambreUlt = ahora;
  editarDia(fecha, (d) => {
    d.hambre = Math.round(Number(d.hambre) || 0) + 1;
  });
  return true;
}

export const espera = () => (estado.temp.espera && Number(estado.temp.espera.fin) ? estado.temp.espera : null);

export function iniciarEspera(minutos = 10) {
  estado.temp.espera = { fin: Date.now() + minutos * 60000, total: minutos * 60000 };
  guardar();
}

export function terminarEspera() {
  if (!estado.temp.espera) return;
  delete estado.temp.espera;
  guardar();
}

/* ---------- Frases ---------- */

/** Las frases que se usan en la app: las originales menos las que quitaste, más las tuyas. */
export function listaFrases() {
  const fuera = new Set(estado.frases.quitadas);
  return [...datos.frases.general.filter((f) => !fuera.has(f)), ...estado.frases.agregadas];
}

export const esFavorita = (t) => estado.frases.favoritas.includes(t);

/** La frase del día: la misma todo el día, distinta cada día. Las favoritas salen más seguido. */
export function fraseDelDia(fecha = claveFecha()) {
  const lista = listaFrases();
  if (!lista.length) return '';
  const favs = estado.frases.favoritas.filter((f) => lista.includes(f));
  const bolsa = [...lista, ...favs, ...favs];
  return bolsa[Math.floor(azar(semilla(`dia:${fecha}`))() * bolsa.length)];
}

export function fraseAlAzar(evitar) {
  const lista = listaFrases().filter((f) => f !== evitar);
  return lista[Math.floor(Math.random() * lista.length)] || '';
}

export function alternarFavorita(t) {
  const favs = estado.frases.favoritas;
  const i = favs.indexOf(t);
  if (i >= 0) favs.splice(i, 1);
  else favs.push(t);
  guardar();
}

export function quitarFrase(t) {
  const fr = estado.frases;
  if (fr.agregadas.includes(t)) fr.agregadas = fr.agregadas.filter((x) => x !== t);
  else if (!fr.quitadas.includes(t)) fr.quitadas.push(t);
  fr.favoritas = fr.favoritas.filter((x) => x !== t);
  guardar();
}

/** Devuelve 'ok', 'vacia' o 'repetida'. */
export function agregarFrase(t) {
  const limpia = String(t).trim().replace(/\s+/g, ' ').slice(0, 160);
  if (!limpia) return 'vacia';
  if (listaFrases().includes(limpia)) return 'repetida';
  estado.frases.quitadas = estado.frases.quitadas.filter((x) => x !== limpia);
  if (!datos.frases.general.includes(limpia)) estado.frases.agregadas.push(limpia);
  guardar();
  return 'ok';
}

export function restaurarFrases() {
  estado.frases.quitadas = [];
  guardar();
}

/** El contenido de data/frases.json con tus cambios, para pegarlo en GitHub. */
export function frasesParaGitHub() {
  const general = listaFrases();
  const favoritas = estado.frases.favoritas.filter((f) => general.includes(f));
  return JSON.stringify({ ...datos.frases, favoritas, general }, null, 2);
}

/* ---------- Ajustes, notificaciones y respaldo ---------- */

export function cambiarAjuste(clave, valor, pintar = true) {
  estado.ajustes[clave] = valor;
  guardar(pintar);
}

export function guardarPush(cambios) {
  estado.push = { ...estado.push, ...cambios };
  for (const k of Object.keys(estado.push)) if (estado.push[k] == null) delete estado.push[k];
  guardar();
}

export function exportar() {
  return {
    app: 'mi-plan',
    exportado: new Date().toISOString(),
    v: 1,
    creado: estado.creado,
    dias: estado.dias,
    ajustes: estado.ajustes,
    frases: estado.frases,
  };
}

export function importar(obj) {
  if (!obj || obj.app !== 'mi-plan' || obj.v !== 1 || !obj.dias || typeof obj.dias !== 'object') {
    throw new Error('Ese archivo no es un respaldo de Mi Plan.');
  }
  const push = estado.push;
  estado = normalizar(obj);
  estado.push = push;
  estado.temp = {};
  guardar();
}

export function borrarTodo() {
  const push = estado.push;
  estado = nuevo();
  estado.push = push;
  guardar();
}
