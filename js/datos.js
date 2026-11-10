// Carga los archivos de datos: el plan, las frases y la configuración.
// Si no hay internet usa la copia que guardó el service worker; y si tampoco, la última copia local.

export const datos = { plan: null, frases: null, config: null, origen: 'red' };

const RESPALDO = 'miplan:datos';

async function traer(ruta) {
  const r = await fetch(ruta, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`No pude abrir ${ruta} (error ${r.status}).`);
  try {
    return await r.json();
  } catch {
    throw new Error(`${ruta} tiene un error de escritura (revisa comas y comillas).`);
  }
}

function revisar(plan, frases) {
  if (!plan || !Array.isArray(plan.comidas) || !plan.comidas.length) {
    throw new Error('data/plan.json no tiene la lista "comidas".');
  }
  for (const c of plan.comidas) {
    if (!c.id || !c.nombre || !c.inicio || !c.fin || !Array.isArray(c.grupos)) {
      throw new Error(`En data/plan.json, a la comida "${c.nombre || c.id || '?'}" le falta id, nombre, inicio, fin o grupos.`);
    }
  }
  if (!plan.metas?.agua?.vasoMl) throw new Error('data/plan.json no tiene las metas de agua.');
  if (!frases || !Array.isArray(frases.general)) throw new Error('data/frases.json no tiene la lista "general".');
}

export async function cargarDatos() {
  try {
    const [plan, frases, config] = await Promise.all([
      traer('data/plan.json'),
      traer('data/frases.json'),
      traer('data/config.json'),
    ]);
    revisar(plan, frases);
    Object.assign(datos, { plan, frases, config, origen: 'red' });
    try {
      localStorage.setItem(RESPALDO, JSON.stringify({ plan, frases, config }));
    } catch {
      // sin espacio: no pasa nada, el service worker también guarda copia
    }
  } catch (error) {
    let guardado = null;
    try {
      guardado = JSON.parse(localStorage.getItem(RESPALDO) || 'null');
    } catch {
      guardado = null;
    }
    if (!guardado) throw error;
    Object.assign(datos, guardado, { origen: 'respaldo', aviso: error.message });
  }
  return datos;
}
