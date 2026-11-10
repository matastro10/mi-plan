// Pantalla "Ajustes": tus datos, apariencia, notificaciones, tus frases y el respaldo.

import { datos, cargarDatos } from './datos.js';
import {
  estado,
  emitir,
  cambiarAjuste,
  guardarPush,
  listaFrases,
  esFavorita,
  alternarFavorita,
  quitarFrase,
  agregarFrase,
  restaurarFrases,
  frasesParaGitHub,
  exportar,
  importar,
  borrarTodo,
} from './store.js';
import { esc, hora12, copiar, claveFecha, fechaCompleta } from './util.js';
import { accion } from './acciones.js';
import { ui } from './ui.js';
import { aviso } from './avisos.js';
import { definirHoja, abrirHoja, cerrarHoja } from './hojas.js';
import { estadoPush, activarPush, desactivarPush, reiniciarPush, probarLocal } from './push.js';

const abierto = (id) => (ui.abiertos.has(id) ? 'open' : '');

/* ---------- Tus datos y apariencia ---------- */

function datosHTML() {
  const a = estado.ajustes;
  return `<section class="tarjeta">
    <h2>Tus datos</h2>
    <label class="campo"><span>¿Cómo te llamas?</span>
      <input type="text" data-ajuste="nombre" value="${esc(a.nombre)}" maxlength="40" autocomplete="given-name" autocapitalize="words" placeholder="Tu nombre">
    </label>
    <label class="campo"><span>Tu nutrióloga</span>
      <input type="text" data-ajuste="nutriologa" value="${esc(a.nutriologa)}" maxlength="60" autocomplete="off" autocapitalize="words" placeholder="Nombre de tu nutrióloga">
    </label>
    <p class="detalle">Esto se queda solo en este teléfono.</p>
  </section>`;
}

function temaHTML() {
  const t = estado.ajustes.tema || 'auto';
  const boton = (valor, texto) =>
    `<button type="button" class="seg${t === valor ? ' activo' : ''}" data-accion="tema" data-valor="${valor}" data-k="tema-${valor}" aria-pressed="${t === valor}">${texto}</button>`;
  return `<section class="tarjeta">
    <h2>Apariencia</h2>
    <div class="segmentos" role="group" aria-label="Modo de la playa">
      ${boton('auto', 'Automático')}${boton('dia', '☀️ Día')}${boton('noche', '🌙 Noche')}
    </div>
    <p class="detalle">En automático, la playa se hace de noche de 8 PM a 6 AM.</p>
  </section>`;
}

/* ---------- Notificaciones ---------- */

function secreto(nombre, cual, disponible, nota = '') {
  return `<li class="secreto">
    <code>${nombre}</code>
    ${disponible ? `<button type="button" class="btn sec chico" data-accion="copiar-secreto" data-cual="${cual}" data-k="sec-${cual}">Copiar</button>` : '<span class="secreto-ok">Borrada de aquí ✔</span>'}
    ${nota}
  </li>`;
}

function pushHTML() {
  const c = datos.config || {};
  const p = ui.push;
  const k = estado.push || {};
  const zona = String(c.zonaHoraria || '').split('/').pop().replace(/_/g, ' ');
  const horario = `De ${hora12(`${c.horaInicio ?? 8}:00`)} a ${hora12(`${c.horaFin ?? 22}:00`)}${zona ? `, hora de ${esc(zona)}` : ''}. También te avisan a la hora de cada comida.`;
  let cuerpo = '';

  if (!p) {
    cuerpo = '<p class="detalle">Revisando este teléfono…</p>';
  } else if (!p.soportado) {
    cuerpo = p.ios && !p.instalada
      ? `<div class="banda"><strong>Primero instala la app.</strong> En Safari toca Compartir <span aria-hidden="true">⬆️</span> y luego «Agregar a inicio». Abre Mi Plan desde su ícono y regresa aquí. En iPhone las notificaciones solo funcionan así (iOS 16.4 o más nuevo).</div>`
      : '<div class="banda">Este navegador no puede recibir notificaciones push. En iPhone necesitas iOS 16.4 o más nuevo y abrir la app desde su ícono de la pantalla de inicio.</div>';
  } else if (p.permiso === 'denied') {
    cuerpo = '<div class="banda"><strong>Las notificaciones están bloqueadas.</strong> Actívalas en Ajustes del iPhone, en Notificaciones, Mi Plan. Luego regresa aquí.</div>';
  } else if (!p.suscripcion) {
    cuerpo = `
      <button type="button" class="btn" data-accion="push-activar" data-k="push-activar" ${ui.ocupado === 'push' ? 'disabled' : ''}>🔔 Activar frases en este teléfono</button>
      ${p.ios && !p.instalada ? '<p class="detalle">En iPhone, abre la app desde su ícono de la pantalla de inicio para poder activarlas.</p>' : ''}`;
  } else {
    const cambio = k.endpoint && p.endpoint && k.endpoint !== p.endpoint;
    cuerpo = `
      <p class="banda ok">✅ Notificaciones activas en este teléfono.</p>
      ${cambio ? '<p class="banda">Tu suscripción cambió. Vuelve a copiar <code>PUSH_SUBSCRIPTION</code> y actualízala en GitHub.</p>' : ''}
      <details class="pasos" id="aj-push-pasos" ${abierto('aj-push-pasos')}>
        <summary>Conectar con GitHub (solo la primera vez)</summary>
        <ol class="pasos-lista">
          <li>En tu repositorio de GitHub abre <strong>Settings</strong>, luego <strong>Secrets and variables</strong>, <strong>Actions</strong> y toca <strong>New repository secret</strong>.</li>
          <li>Crea estos 3 secretos, con ese nombre exacto. Toca cada botón para copiar su valor:
            <ul class="secretos">
              ${secreto('VAPID_PUBLIC_KEY', 'publica', Boolean(k.publica))}
              ${secreto('VAPID_PRIVATE_KEY', 'privada', Boolean(k.privada))}
              ${secreto('PUSH_SUBSCRIPTION', 'suscripcion', true)}
            </ul>
          </li>
          <li>En GitHub abre <strong>Actions</strong>, elige <strong>Frases de guerrero</strong> y toca <strong>Run workflow</strong>. En un minuto te llega una de prueba.</li>
        </ol>
        ${k.privada ? '<button type="button" class="enlace" data-accion="push-borrar-privada" data-k="push-borrar-privada">Ya guardé la clave privada en GitHub: bórrala de este teléfono</button>' : ''}
      </details>
      <div class="fila-botones dos">
        <button type="button" class="btn sec" data-accion="push-probar" data-k="push-probar">Probar aquí</button>
        <button type="button" class="btn sec" data-accion="push-desactivar" data-k="push-desactivar">Desactivar</button>
      </div>
      <button type="button" class="enlace" data-accion="push-reiniciar" data-k="push-reiniciar">Perdí mis claves: empezar de cero</button>`;
  }

  return `<section class="tarjeta">
    <h2>Frases cada hora</h2>
    <p class="detalle">${horario} El horario se cambia en el archivo data/config.json.</p>
    ${cuerpo}
  </section>`;
}

/* ---------- Mis frases ---------- */

function frasesHTML() {
  const lista = listaFrases();
  const quitadas = estado.frases.quitadas.length;
  const nFav = estado.frases.favoritas.filter((f) => lista.includes(f)).length;
  const filas = lista
    .map((f, i) => {
      const fav = esFavorita(f);
      return `<li class="frase-fila">
        <span>${esc(f)}</span>
        <span class="frase-btns">
          <button type="button" class="btn-ico${fav ? ' activo' : ''}" data-accion="frase-fav" data-i="${i}" data-k="fav-${i}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar de favoritas' : 'Marcar como favorita'}">★</button>
          <button type="button" class="btn-ico" data-accion="frase-quitar" data-i="${i}" data-k="quitar-${i}" aria-label="Quitar esta frase">✕</button>
        </span>
      </li>`;
    })
    .join('');
  return `<section class="tarjeta">
    <h2>Mis frases</h2>
    <p class="detalle">Tienes ${lista.length} frases y ${nFav} ${nFav === 1 ? 'favorita' : 'favoritas'}. Las favoritas salen más seguido.</p>
    <div class="agregar">
      <label class="campo"><span>Agregar una frase mía</span>
        <textarea id="frase-nueva" rows="2" maxlength="160" placeholder="Escribe tu frase de guerrero">${esc(ui.borradorFrase)}</textarea>
      </label>
      <button type="button" class="btn sec" data-accion="frase-agregar" data-k="frase-agregar">Agregar</button>
    </div>
    <details class="pasos" id="aj-frases" ${abierto('aj-frases')}>
      <summary>Ver y editar todas</summary>
      <ul class="frases-lista">${filas}</ul>
      ${quitadas ? `<button type="button" class="enlace" data-accion="frases-restaurar" data-k="frases-restaurar">Recuperar las ${quitadas} que quité</button>` : ''}
    </details>
    <p class="detalle">Los cambios aplican a la frase del día. Para que también cambien las notificaciones, copia la lista y pégala en data/frases.json en GitHub.</p>
    <button type="button" class="btn sec" data-accion="frases-copiar" data-k="frases-copiar">Copiar lista para GitHub</button>
  </section>`;
}

/* ---------- Respaldo y plan ---------- */

function respaldoHTML() {
  const n = Object.keys(estado.dias).length;
  return `<section class="tarjeta">
    <h2>Respaldo</h2>
    <p class="detalle">Todo se guarda solo en este teléfono (${n} ${n === 1 ? 'día registrado' : 'días registrados'}). Exporta un respaldo de vez en cuando.</p>
    <div class="fila-botones dos">
      <button type="button" class="btn sec" data-accion="exportar" data-k="exportar">Exportar</button>
      <button type="button" class="btn sec" data-accion="importar" data-k="importar">Importar</button>
    </div>
    <input type="file" id="archivo-respaldo" accept="application/json,.json" hidden>
  </section>`;
}

function planHTML() {
  return `<section class="tarjeta">
    <h2>Plan y app</h2>
    <p class="detalle">Plan actualizado el ${esc(fechaCompleta(datos.plan.actualizado) || 'sin fecha')}${datos.origen === 'respaldo' ? ' (copia guardada, sin conexión)' : ''}.</p>
    <button type="button" class="btn sec" data-accion="plan-actualizar" data-k="plan-actualizar">Buscar cambios del plan</button>
    <button type="button" class="enlace peligro" data-accion="borrar-todo" data-k="borrar-todo">Borrar todo mi historial de este teléfono</button>
  </section>`;
}

export function vistaAjustes() {
  return datosHTML() + temaHTML() + pushHTML() + frasesHTML() + respaldoHTML() + planHTML();
}

export async function refrescarPush() {
  ui.push = await estadoPush();
  emitir();
}

/* ---------- Hoja de confirmación ---------- */

let pendiente = null;

definirHoja('confirmar', ({ titulo, texto, boton }) => ({
  titulo: esc(titulo),
  cuerpo: `<p>${esc(texto)}</p>`,
  pie: `<button type="button" class="btn peligro" data-accion="confirmar-si">${esc(boton)}</button>
    <button type="button" class="btn sec" data-accion="cerrar-hoja">Cancelar</button>`,
}));

function confirmar(opciones, alAceptar) {
  pendiente = alAceptar;
  abrirHoja('confirmar', opciones);
}

accion('confirmar-si', () => {
  const fn = pendiente;
  pendiente = null;
  cerrarHoja();
  fn?.();
});

/* ---------- Acciones ---------- */

accion('tema', (el) => cambiarAjuste('tema', el.dataset.valor));

accion('push-activar', async () => {
  ui.ocupado = 'push';
  try {
    await activarPush();
    ui.abiertos.add('aj-push-pasos');
    aviso('🔔 ¡Notificaciones activadas!');
  } catch (e) {
    if (e.codigo === 'permiso') aviso('No diste permiso. Puedes activarlo en Ajustes del iPhone, en Notificaciones.', 5000);
    else aviso(`No se pudo activar: ${e.message}`, 5000);
  } finally {
    ui.ocupado = null;
    await refrescarPush();
  }
});

accion('push-desactivar', () =>
  confirmar(
    { titulo: 'Desactivar las frases', texto: 'Dejarán de llegarte notificaciones a este teléfono. Puedes volver a activarlas cuando quieras (tendrás que actualizar PUSH_SUBSCRIPTION en GitHub).', boton: 'Desactivar' },
    async () => {
      await desactivarPush().catch(() => {});
      await refrescarPush();
      aviso('Notificaciones desactivadas');
    },
  ),
);

accion('push-reiniciar', () =>
  confirmar(
    { titulo: 'Empezar de cero', texto: 'Se borran tus claves y la suscripción de este teléfono. Después tendrás que activar otra vez y volver a copiar los 3 secretos a GitHub.', boton: 'Borrar y empezar de cero' },
    async () => {
      await reiniciarPush();
      await refrescarPush();
      aviso('Listo. Activa de nuevo para crear claves nuevas.');
    },
  ),
);

accion('push-probar', async () => {
  try {
    await probarLocal();
    aviso('Enviada: revisa tus notificaciones 👀');
  } catch (e) {
    aviso(`No se pudo mostrar: ${e.message}`, 4500);
  }
});

accion('push-borrar-privada', () => {
  guardarPush({ privada: null });
  aviso('Clave privada borrada de este teléfono');
});

accion('copiar-secreto', async (el) => {
  const cual = el.dataset.cual;
  const valor = cual === 'suscripcion' ? ui.push?.suscripcion : estado.push?.[cual];
  if (!valor) return;
  aviso((await copiar(valor)) ? 'Copiado ✔ Pégalo en GitHub' : 'No se pudo copiar', 2200);
});

accion('frase-fav', (el) => {
  const f = listaFrases()[Number(el.dataset.i)];
  if (f) alternarFavorita(f);
});

accion('frase-quitar', (el) => {
  const f = listaFrases()[Number(el.dataset.i)];
  if (!f) return;
  quitarFrase(f);
  aviso('Frase quitada');
});

accion('frase-agregar', () => {
  const campo = document.getElementById('frase-nueva');
  const r = agregarFrase(campo?.value || '');
  if (r === 'vacia') {
    aviso('Escribe tu frase primero');
    campo?.focus();
    return;
  }
  if (r === 'repetida') {
    aviso('Esa frase ya está en tu lista');
    return;
  }
  ui.borradorFrase = '';
  emitir();
  aviso('Frase agregada ⚔️');
});

accion('frases-restaurar', () => {
  restaurarFrases();
  aviso('Frases originales recuperadas');
});

accion('frases-copiar', async () => {
  aviso((await copiar(frasesParaGitHub())) ? 'Copiado ✔ Pégalo en data/frases.json' : 'No se pudo copiar', 3200);
});

accion('exportar', async () => {
  const texto = JSON.stringify(exportar(), null, 2);
  const nombre = `mi-plan-respaldo-${claveFecha()}.json`;
  try {
    const archivo = new File([texto], nombre, { type: 'application/json' });
    if (navigator.canShare?.({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: 'Respaldo de Mi Plan' });
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return; // cerró la hoja de compartir
  }
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  aviso('Respaldo descargado 💾');
});

accion('importar', () => document.getElementById('archivo-respaldo')?.click());

/** Lee el archivo elegido y pregunta antes de reemplazar lo que hay. */
export async function alElegirRespaldo(input) {
  const archivo = input.files?.[0];
  input.value = '';
  if (!archivo) return;
  let obj;
  try {
    obj = JSON.parse(await archivo.text());
    if (!obj || obj.app !== 'mi-plan') throw new Error('no es respaldo');
  } catch {
    aviso('Ese archivo no es un respaldo de Mi Plan', 4000);
    return;
  }
  const dias = Object.keys(obj.dias || {}).length;
  confirmar(
    { titulo: 'Importar respaldo', texto: `El respaldo trae ${dias} ${dias === 1 ? 'día' : 'días'}. Va a reemplazar lo que tienes ahora en este teléfono.`, boton: 'Reemplazar con el respaldo' },
    () => {
      try {
        importar(obj);
        aviso('Respaldo importado ✔');
      } catch (e) {
        aviso(e.message, 4000);
      }
    },
  );
}

accion('plan-actualizar', async () => {
  try {
    await cargarDatos();
    emitir();
    aviso(datos.origen === 'red' ? 'Tu plan está al día ✔' : 'Sin conexión: sigo con la copia guardada', 3200);
  } catch (e) {
    aviso(e.message, 5000);
  }
});

accion('borrar-todo', () =>
  confirmar(
    { titulo: 'Borrar todo', texto: 'Se borra tu historial, tu racha y tus frases de este teléfono. No se puede deshacer. Si quieres conservarlo, exporta un respaldo antes.', boton: 'Sí, borrar todo' },
    () => {
      borrarTodo();
      aviso('Historial borrado');
    },
  ),
);
