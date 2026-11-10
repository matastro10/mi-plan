// Un solo "oído" para todos los botones: cada botón dice qué acción quiere con data-accion="...".

const mapa = {};

export const accion = (nombre, fn) => {
  mapa[nombre] = fn;
};

export function despachar(ev) {
  const el = ev.target.closest?.('[data-accion]');
  if (!el || el.disabled) return;
  const fn = mapa[el.dataset.accion];
  if (!fn) return;
  ev.preventDefault();
  fn(el, ev);
}
