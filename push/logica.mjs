// Decide qué frase toca en cada hora. No usa nada de fuera: solo los archivos de data/.

/** Fecha y hora actuales en una zona horaria (ej. America/Argentina/Buenos_Aires). */
export function ahoraEnZona(zona, momento = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(momento);
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) % 24, minuto: Number(p.minute) };
}

function semilla(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function azar(inicial) {
  let a = inicial >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function barajar(lista, rnd) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const textos = (x) => (Array.isArray(x) ? x.filter((t) => typeof t === 'string' && t.trim()) : []);

/** Horario en que se mandan frases, ya validado. */
export function horario(config = {}) {
  let ini = Number.isInteger(config.horaInicio) ? config.horaInicio : 8;
  let fin = Number.isInteger(config.horaFin) ? config.horaFin : 22;
  ini = Math.min(23, Math.max(0, ini));
  fin = Math.min(23, Math.max(0, fin));
  if (fin < ini) [ini, fin] = [8, 22];
  return { ini, fin };
}

/**
 * La agenda completa de un día: una frase por hora, sin repetir.
 * Es "determinista": para la misma fecha siempre sale la misma agenda,
 * así cada corrida del Action sabe qué toca sin tener que recordar nada.
 *  - primera hora  → frase de la mañana
 *  - última hora   → frase de cierre
 *  - hora en que empieza una comida → recordatorio de esa comida
 *  - lo demás      → frases generales (las favoritas salen más seguido)
 */
export function agendaDelDia(fecha, { config = {}, frases, plan }) {
  const { ini, fin } = horario(config);
  const rnd = azar(semilla(`frases:${fecha}`));
  const usadas = new Set();
  const tomar = (lista) => {
    const libres = textos(lista).filter((f) => !usadas.has(f));
    if (!libres.length) return null;
    const f = libres[Math.floor(rnd() * libres.length)];
    usadas.add(f);
    return f;
  };

  const comidaPorHora = new Map();
  if (config.avisosDeComidas !== false) {
    for (const c of plan?.comidas || []) {
      const h = Number(String(c.inicio).split(':')[0]);
      if (Number.isInteger(h) && !comidaPorHora.has(h)) comidaPorHora.set(h, c);
    }
  }

  const general = textos(frases.general);
  const favoritas = barajar(textos(frases.favoritas).filter((f) => general.includes(f)), rnd).slice(0, 4);
  const resto = barajar(general.filter((f) => !favoritas.includes(f)), rnd);
  const horas = fin - ini + 1;
  const bolsa = barajar([...favoritas, ...resto.slice(0, Math.max(0, horas - favoritas.length))], rnd).concat(resto.slice(horas));

  const agenda = [];
  for (let h = ini; h <= fin; h++) {
    let tipo = 'frase';
    let texto = null;
    if (h === ini) {
      texto = tomar(frases.manana);
      if (texto) tipo = 'manana';
    } else if (h === fin) {
      texto = tomar(frases.noche);
      if (texto) tipo = 'noche';
    } else if (comidaPorHora.has(h)) {
      texto = tomar(frases.comidas?.[comidaPorHora.get(h).id]);
      if (texto) tipo = 'comida';
    }
    if (!texto) {
      texto = bolsa.find((f) => !usadas.has(f)) ?? null;
      if (texto) usadas.add(texto);
    }
    agenda.push({ hora: h, tipo, texto });
  }
  return agenda;
}

/** La frase que toca en esa fecha y hora local, o null si está fuera de horario. */
export function fraseParaHora(local, datos) {
  return agendaDelDia(local.fecha, datos).find((a) => a.hora === local.hora && a.texto) || null;
}
